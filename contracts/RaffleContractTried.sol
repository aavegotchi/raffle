//SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

// import "hardhat/console.sol";

import "./interfaces/IERC1155.sol";
import "./chainlink/LinkTokenInterface.sol";

// All state variables are accessed through this struct
// To avoid name clashes and make clear a variable is a state variable
// state variable access starts with "s." which accesses variables in this struct
struct AppStorage {
    Raffle[] raffles;
    // Nonces for each VRF key from which randomness has been requested.
    // Must stay in sync with VRFCoordinator[_keyHash][this]
    // keyHash => nonce
    mapping(bytes32 => uint256) nonces;
    mapping(bytes32 => uint256) requestIdToRaffleId;
    uint256 fee;
    address contractOwner;
}

struct Raffle {
    // associates ticket address and ticketId to raffleItems
    // if raffleItemIndexes == 0, then raffle item does not exist
    // This means all raffleItemIndexes have been incremented by 1
    // (ticketId => index + 1)
    mapping(uint256 => uint256) raffleItemIndexes;
    RaffleItem[] raffleItems;
    // maps what tickets entrants have entered into the raffle
    // entrant => tickets
    mapping(address => UserEntries[]) userEntries;
    // used to prevent users from claiming prizes more than once
    mapping(address => bool) prizeClaimed;
    // the addresses of people who have entered tickets into the raffle
    address[] entrants;
    // vrf randomness
    uint256 randomNumber;
    // date in timestamp seconds when a raffle ends
    uint256 raffleEnd;
}

// The minimum rangeStart is 0
// The maximum rangeEnd is raffleItem.totalEntered
// rangeEnd - rangeStart == number of ticket entered for raffle item by a user entry
struct UserEntries {
    uint24 raffleItemIndex; // Which raffle item is entered into the raffle
    uint112 rangeStart; // Raffle number. Value is between 0 and raffleItem.totalEntered - 1
    uint112 rangeEnd; // Raffle number. Value is between 1 and raffleItem.totalEntered
}

// Ticket numbers are numbers between 0 and raffleItem.totalEntered - 1 inclusive.
struct RaffleItem {
    uint256 ticketId; // ERC1155 token type
    uint256 totalEntered; // Total number of ERC1155 tokens entered into raffle for this raffle item
    uint256[] prizeIds;
    uint256[] prizeQuantities;
}

contract RafflesContract {
    // State variables are prefixed with s.
    AppStorage internal s;
    // Immutable values are prefixed with im_ to easily identify them in code
    LinkTokenInterface internal immutable im_link;
    address internal immutable im_vrfCoordinator;
    bytes32 internal immutable im_keyHash;
    address public immutable im_ticketAddress;
    address public immutable im_prizeAddress;

    bytes4 public constant ERC1155_BATCH_ACCEPTED = 0xbc197c81; // Return value from `onERC1155BatchReceived` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`).
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RaffleTicketAndPrizeContracts(address ticketContract, address prizeContract);
    event RaffleStarted(uint256 indexed raffleId, uint256 raffleEnd, RaffleItemIO[] raffleItems);
    event RaffleTicketsEntered(uint256 indexed raffleId, address entrant, uint256[] _ticketIds, uint256[] _ticketQuantities);
    event RaffleRandomNumber(uint256 indexed raffleId, uint256 randomNumber);
    event RaffleClaimPrize(uint256 indexed raffleId, address entrant, uint256 prizeId, uint256 prizeQuantity);

    constructor(
        address _contractOwner,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        address _ticketAddress,
        address _prizeAddress
    ) {
        s.contractOwner = _contractOwner;
        im_vrfCoordinator = _vrfCoordinator;
        im_link = LinkTokenInterface(_link);
        im_keyHash = _keyHash; //0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4; // Ropsten details
        // 0.1 LINK
        s.fee = 1e17;
        im_ticketAddress = _ticketAddress;
        im_prizeAddress = _prizeAddress;
        emit RaffleTicketAndPrizeContracts(_ticketAddress, _prizeAddress);
    }

    // VRF Functionality ////////////////////////////////////////////////////////////////
    function nonces(bytes32 _keyHash) external view returns (uint256 nonce_) {
        nonce_ = s.nonces[_keyHash];
    }

    /**
     * @notice requestRandomness initiates a request for VRF output given _seed
     *
     * @dev See "SECURITY CONSIDERATIONS" above for more information on _seed.
     *
     * @dev The fulfillRandomness method receives the output, once it's provided
     * @dev by the Oracle, and verified by the vrfCoordinator.
     *
     * @dev The _keyHash must already be registered with the VRFCoordinator, and
     * @dev the _fee must exceed the fee specified during registration of the
     * @dev _keyHash.
     *
     * @param _keyHash ID of public key against which randomness is generated
     * @param _fee The amount of LINK to send with the request
     * @param _seed seed mixed into the input of the VRF
     *
     * @return requestId unique ID for this request
     *
     * @dev The returned requestId can be used to distinguish responses to *
     * @dev concurrent requests. It is passed as the first argument to
     * @dev fulfillRandomness.
     */
    function requestRandomness(
        bytes32 _keyHash,
        uint256 _fee,
        uint256 _seed
    ) internal returns (bytes32 requestId) {
        im_link.transferAndCall(im_vrfCoordinator, _fee, abi.encode(_keyHash, _seed));
        // This is the seed passed to VRFCoordinator. The oracle will mix this with
        // the hash of the block containing this request to obtain the seed/input
        // which is finally passed to the VRF cryptographic machinery.
        // So the seed doesn't actually do anything and is left over from an old API.
        uint256 vRFSeed = makeVRFInputSeed(_keyHash, _seed, address(this), s.nonces[_keyHash]);
        // nonces[_keyHash] must stay in sync with
        // VRFCoordinator.nonces[_keyHash][this], which was incremented by the above
        // successful Link.transferAndCall (in VRFCoordinator.randomnessRequest).
        // This provides protection against the user repeating their input
        // seed, which would result in a predictable/duplicate output.
        s.nonces[_keyHash]++;
        return makeRequestId(_keyHash, vRFSeed);
    }

    /**
     * @notice returns the seed which is actually input to the VRF coordinator
     *
     * @dev To prevent repetition of VRF output due to repetition of the
     * @dev user-supplied seed, that seed is combined in a hash with the
     * @dev user-specific nonce, and the address of the consuming contract. The
     * @dev risk of repetition is mostly mitigated by inclusion of a blockhash in
     * @dev the final seed, but the nonce does protect against repetition in
     * @dev requests which are included in a single block.
     *
     * @param _userSeed VRF seed input provided by user
     * @param _requester Address of the requesting contract
     * @param _nonce User-specific nonce at the time of the request
     */
    function makeVRFInputSeed(
        bytes32 _keyHash,
        uint256 _userSeed,
        address _requester,
        uint256 _nonce
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(_keyHash, _userSeed, _requester, _nonce)));
    }

    /**
     * @notice Returns the id for this request
     * @param _keyHash The serviceAgreement ID to be used for this request
     * @param _vRFInputSeed The seed to be passed directly to the VRF
     * @return The id for this request
     *
     * @dev Note that _vRFInputSeed is not the seed passed by the consuming
     * @dev contract, but the one generated by makeVRFInputSeed
     */
    function makeRequestId(bytes32 _keyHash, uint256 _vRFInputSeed) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_keyHash, _vRFInputSeed));
    }

    function drawRandomNumber(uint256 _raffleId) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd < block.timestamp, "Raffle: Raffle time has not expired");
        require(raffle.randomNumber == 0, "Raffle: Random number already generated");
        // Use Chainlink VRF to generate random number
        require(im_link.balanceOf(address(this)) > s.fee, "Not enough LINK");
        bytes32 requestId = requestRandomness(im_keyHash, s.fee, uint256(keccak256(abi.encodePacked(block.number, msg.sender))));
        s.requestIdToRaffleId[requestId] = _raffleId;
    }

    // rawFulfillRandomness is called by VRFCoordinator when it receives a valid VRFproof.
    /**
     * @notice Callback function used by VRF Coordinator
     * @dev Important! Add a modifier to only allow this function to be called by the VRFCoordinator
     * @dev This is where you do something with randomness!
     * @dev The VRF Coordinator will only send this function verified responses.
     * @dev The VRF Coordinator will not pass randomness that could not be verified.
     */
    function rawFulfillRandomness(bytes32 _requestId, uint256 _randomness) external {
        require(msg.sender == im_vrfCoordinator, "Only VRFCoordinator can fulfill");
        uint256 raffleId = s.requestIdToRaffleId[_requestId];
        require(raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[raffleId];
        require(raffle.raffleEnd < block.timestamp, "Raffle: Raffle time has not expired");
        require(raffle.randomNumber == 0, "Raffle: Random number already generated");
        s.raffles[raffleId].randomNumber = _randomness;
        emit RaffleRandomNumber(raffleId, _randomness);
    }

    // Change the fee amount that is paid for VRF random numbers
    function changeVRFFee(uint256 _newFee) external {
        require(msg.sender == s.contractOwner, "Raffle: Must be contract owner");
        s.fee = _newFee;
    }

    // Remove the LINK tokens from this contract that are used to pay for VRF random number fees
    function removeLinkTokens(address _to, uint256 _value) external {
        require(msg.sender == s.contractOwner, "Raffle: Must be contract owner");
        im_link.transfer(_to, _value);
    }

    /////////////////////////////////////////////////////////////////////////////////////

    function owner() external view returns (address) {
        return s.contractOwner;
    }

    function transferOwnership(address _newContractOwner) external {
        address previousOwner = s.contractOwner;
        require(msg.sender == previousOwner, "Raffle: Must be contract owner");
        s.contractOwner = _newContractOwner;
        emit OwnershipTransferred(previousOwner, _newContractOwner);
    }

    // structs with IO at the end of their name mean they are only used for
    // arguments and/or return values of functions
    struct RaffleItemIO {
        uint256 ticketId;
        uint256[] prizeIds;
        uint256[] prizeQuantities;
    }

    /**
     * @notice Starts a raffle
     * @dev The _raffleItems argument tells what ERC1155 tickets can be entered for what ERC1155 prizes.
     * The _raffleItems get stored in the raffleItems state variable
     * The raffle prizes that can be won are transferred into this contract.
     */
    function startRaffle(uint256 _raffleEnd, RaffleItemIO[] calldata _raffleItems) external {
        require(msg.sender == s.contractOwner, "Raffle: Must be contract owner");
        require(_raffleEnd > block.timestamp + 3600, "Raffle: _raffleEnd must be greater than 1 hour");
        require(_raffleItems.length > 0, "Raffle: No raffle items");
        uint256 raffleId = s.raffles.length;
        emit RaffleStarted(raffleId, _raffleEnd, _raffleItems);
        Raffle storage raffle = s.raffles.push();
        raffle.raffleEnd = uint256(_raffleEnd);
        for (uint256 i; i < _raffleItems.length; i++) {
            RaffleItemIO calldata raffleItemIO = _raffleItems[i];
            require(raffleItemIO.prizeIds.length > 0, "Raffle: Empty prizeIds");
            require(raffleItemIO.prizeIds.length == raffleItemIO.prizeQuantities.length, "Raffle: prizeIds and prizeQuanities length don't match");
            // ticketId is the ERC1155 type id, which type is it
            require(
                // The index is one greater than actual index.  If index is 0 it means the value does not exist yet.
                raffle.raffleItemIndexes[raffleItemIO.ticketId] == 0,
                "Raffle: Raffle item already using ticketId"
            );
            // A raffle item is a ticketAddress, ticketId and what prizes can be won.
            RaffleItem storage raffleItem = raffle.raffleItems.push();
            // The index is one greater than actual index.  If index is 0 it means the value does not exist yet.
            raffle.raffleItemIndexes[raffleItemIO.ticketId] = raffle.raffleItems.length;
            raffleItem.ticketId = raffleItemIO.ticketId;
            raffleItem.prizeIds = raffleItemIO.prizeIds;
            raffleItem.prizeQuantities = raffleItemIO.prizeQuantities;
            IERC1155(im_prizeAddress).safeBatchTransferFrom(
                msg.sender,
                address(this),
                raffleItemIO.prizeIds,
                raffleItemIO.prizeQuantities,
                abi.encode(raffleId)
            );
        }
    }

    /**
        @notice Handle the receipt of multiple ERC1155 token types.
        @dev An ERC1155-compliant smart contract MUST call this function on the token recipient contract, at the end of a `safeBatchTransferFrom` after the balances have been updated.        
        This function MUST return `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))` (i.e. 0xbc197c81) if it accepts the transfer(s).
        This function MUST revert if it rejects the transfer(s).
        Return of any other value than the prescribed keccak256 generated value MUST result in the transaction being reverted by the caller.
        @param _operator  The address which initiated the batch transfer (i.e. msg.sender)
        @param _from      The address which previously owned the token
        @param _ids       An array containing ids of each token being transferred (order and length must match _values array)
        @param _values    An array containing amounts of each token being transferred (order and length must match _ids array)
        @param _data      Additional data with no specified format
        @return           `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
    */
    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external view returns (bytes4) {
        _operator; // silence not used warning
        _from; // silence not used warning
        _ids; // silence not used warning
        _values; // silence not used warning
        require(_data.length == 32, "Raffle: Data of the wrong size sent on transfer");
        uint256 raffleId = abi.decode(_data, (uint256));
        require(raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[raffleId];
        uint256 raffleEnd = raffle.raffleEnd;
        require(raffleEnd > block.timestamp, "Raffle: Can't accept transfer for expired raffle");
        return ERC1155_BATCH_ACCEPTED;
    }

    struct RaffleIO {
        uint256 raffleId;
        uint256 raffleEnd;
        bool isOpen;
    }

    /**
     * @notice Get simple raffle information
     */
    function getRaffles() external view returns (RaffleIO[] memory raffles_) {
        raffles_ = new RaffleIO[](s.raffles.length);
        for (uint256 i; i < s.raffles.length; i++) {
            uint256 raffleEnd = s.raffles[i].raffleEnd;
            raffles_[i].raffleId = i;
            raffles_[i].raffleEnd = raffleEnd;
            raffles_[i].isOpen = raffleEnd > block.timestamp;
        }
    }

    /**
     * @notice Get total number of raffles that exist.
     */
    function raffleSupply() external view returns (uint256 raffleSupply_) {
        raffleSupply_ = s.raffles.length;
    }

    /**
     * @notice Get simple raffle info and all the raffle items in the raffle.
     * @param _raffleId Which raffle to get info about.
     */
    function raffleInfo(uint256 _raffleId)
        external
        view
        returns (
            uint256 raffleEnd_,
            RaffleItemIO[] memory raffleItems_,
            bool numberChosen_
        )
    {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        raffleEnd_ = raffle.raffleEnd;

        if (raffle.randomNumber == 0) {
            numberChosen_ = false;
        } else {
            numberChosen_ = true;
        }
        // Loop over and get all the raffle itmes, which includes ERC1155 tickets and ERC1155 prizes
        raffleItems_ = new RaffleItemIO[](raffle.raffleItems.length);
        for (uint256 i; i < raffle.raffleItems.length; i++) {
            RaffleItem storage raffleItem = raffle.raffleItems[i];
            raffleItems_[i].ticketId = raffleItem.ticketId;
            raffleItems_[i].prizeIds = raffleItem.prizeIds;
            raffleItems_[i].prizeQuantities = raffleItem.prizeQuantities;
        }
    }

    struct EntrantStatsIO {
        uint256 ticketId; // ERC1155 type id
        uint256 ticketQuantity; // Number of ERC1155 tokens
    }

    /**
     * @notice Get get ticket info for a single entrant (address)
     * @param _raffleId Which raffle to get ticket stats about
     * @param _entrant Who to get stats about
     */
    function entrantStats(uint256 _raffleId, address _entrant) external view returns (EntrantStatsIO[] memory entrantStats_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        entrantStats_ = new EntrantStatsIO[](raffle.userEntries[_entrant].length);
        for (uint256 i; i < raffle.userEntries[_entrant].length; i++) {
            UserEntries memory userEntries = raffle.userEntries[_entrant][i];
            RaffleItem storage raffleItem = raffle.raffleItems[userEntries.raffleItemIndex];
            entrantStats_[i].ticketId = raffleItem.ticketId;
            entrantStats_[i].ticketQuantity = userEntries.rangeEnd - userEntries.rangeStart;
        }
    }

    struct TicketStatsIO {
        uint256 ticketId; // ERC1155 type id
        uint256 numberOfEntrants; // number of unique addresses that ticketd
        uint256 totalEntered; // Number of ERC1155 tokens
    }

    /**
     * @notice Returns what tickets have been entered, by how many addresses, and how many ERC1155 tickets entered
     * @param _raffleId Which raffle to get info about
     */
    function ticketStats(uint256 _raffleId) external view returns (TicketStatsIO[] memory ticketStats_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        ticketStats_ = new TicketStatsIO[](raffle.raffleItems.length);
        // loop through raffle items
        for (uint256 i; i < raffle.raffleItems.length; i++) {
            RaffleItem storage raffleItem = raffle.raffleItems[i];
            ticketStats_[i].ticketId = raffleItem.ticketId;
            ticketStats_[i].totalEntered = raffleItem.totalEntered;
            // count the number of users that have ticketd for the raffle item
            for (uint256 j; j < raffle.entrants.length; j++) {
                address entrant = raffle.entrants[j];
                for (uint256 k; k < raffle.userEntries[entrant].length; k++) {
                    if (i == raffle.userEntries[entrant][k].raffleItemIndex) {
                        ticketStats_[i].numberOfEntrants++;
                        break;
                    }
                }
            }
        }
    }

    /**
     * @notice Enter ERC1155 tokens for raffle prizes
     * @dev Creates a new entry in the userEntries array
     * @param _raffleId Which raffle to ticket in
     * @param _ticketIds The ERC1155 ticket type
     * @param _ticketQuantities How many tickets to enter in the raffle
     */
    function enterTickets(
        uint256 _raffleId,
        uint256[] calldata _ticketIds,
        uint256[] calldata _ticketQuantities
    ) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        require(_ticketIds.length > 0, "Raffle: No tickets");
        require(_ticketIds.length == _ticketQuantities.length, "Raffle: _ticketIds.length and _ticketQuantities.length not the same");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd > block.timestamp, "Raffle: Raffle time has expired");
        emit RaffleTicketsEntered(_raffleId, msg.sender, _ticketIds, _ticketQuantities);
        // Collect unique entrant addresses
        if (raffle.userEntries[msg.sender].length == 0) {
            raffle.entrants.push(msg.sender);
        }
        for (uint256 i; i < _ticketIds.length; i++) {
            uint256 ticketQuantity = _ticketQuantities[i];
            uint256 ticketId = _ticketIds[i];
            require(ticketQuantity > 0, "Raffle: ticket quantity cannot be zero");
            // get the raffle item
            uint256 raffleItemIndex = raffle.raffleItemIndexes[ticketId];
            require(raffleItemIndex > 0, "Raffle: Raffle item doesn't exist for this raffle");
            raffleItemIndex--;
            RaffleItem storage raffleItem = raffle.raffleItems[raffleItemIndex];
            uint256 totalEntered = raffleItem.totalEntered;
            // Create a range of unique numbers for ticket ids
            raffle.userEntries[msg.sender].push(UserEntries(uint24(raffleItemIndex), uint112(totalEntered), uint112(totalEntered + ticketQuantity)));
            // update the total quantity of tickets that have been entered for this raffle item
            raffleItem.totalEntered = totalEntered + ticketQuantity;
        }
        // transfer the ERC1155 tokens to ticket to this contract
        IERC1155(im_ticketAddress).safeBatchTransferFrom(msg.sender, address(this), _ticketIds, _ticketQuantities, abi.encode(_raffleId));
    }

    // Ticket numbers are numbers between 0 and raffleItem.totalEntered - 1 inclusive.
    // Winning ticket numbers are ticket numbers that won one or more prizes
    // Prize numbers are numbers between 0 and raffleItemPrize.prizeQuanity - 1 inclusive.
    // Winning prize numbers are prize numbers used to calculate winning ticket numbers
    struct PrizeWinnerIO {
        address entrant; // user address
        bool claimed; // has claimed prizes
        uint256 userEntriesIndex; // index into userEntries array (Who entered into raffle and by how much)
        uint256 raffleItemIndex; // index into RaffleItems array
        uint256 raffleItemPrizeIndex; // index into RaffleItemPrize array (What is the prize)
        uint256[] winningPrizeNumbers; // winning prize numbers (The length of the array is the number of prizes won)
        uint256 prizeId; // ERC1155 type id (ERC1155 type of prize)
    }

    /**
     * @notice Get all winning tickets and their prizes
     * @param _raffleId Which raffle
     */
    function winners(uint256 _raffleId) external view returns (PrizeWinnerIO[] memory winners_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        winners_ = winners(_raffleId, raffle.entrants);
    }

    /**
     * @notice Get winning tickets and their prizes by entrant address
     * @param _raffleId Which raffle
     */
    function winners(uint256 _raffleId, address[] memory _entrants) public view returns (PrizeWinnerIO[] memory winners_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        uint256 randomNumber = raffle.randomNumber;
        require(randomNumber > 0, "Raffle: Random number not generated yet");
        // get the total number of all prizes in order to initialize the winners_ array
        {
            // use a block here to prevent stack too deep error
            uint256 numRafflePrizes;
            for (uint256 i; i < raffle.raffleItems.length; i++) {
                uint256[] storage prizeQuantities = raffle.raffleItems[i].prizeQuantities;
                for (uint256 j; j < prizeQuantities.length; j++) {
                    numRafflePrizes += prizeQuantities[j];
                }
            }
            // initialize the winners_ array to make it the largest it possibly could be
            // later the length will be reset
            winners_ = new PrizeWinnerIO[](numRafflePrizes);
        }
        // Logic:
        // 1. loop through unique entrant addresses
        // 2. loop through their tickets
        // 3. loop through their possible prizes and see if they won
        // 4. if won then record in winners_ array
        uint256 winnersNum;
        for (uint256 h; h < _entrants.length; h++) {
            address entrant = _entrants[h];
            for (uint256 userEntryIndex; userEntryIndex < raffle.userEntries[entrant].length; userEntryIndex++) {
                UserEntries storage userEntries = raffle.userEntries[entrant][userEntryIndex];
                // totalEntered is the total number of ERC1155 tickets of a particular raffle item that have been entered into the raffle
                // a raffle item is an item in the raffleItems array
                RaffleItem storage raffleItem = raffle.raffleItems[userEntries.raffleItemIndex];
                for (uint256 prizeIndex; prizeIndex < raffleItem.prizeIds.length; prizeIndex++) {
                    uint256 prizeId = raffleItem.prizeIds[prizeIndex];
                    uint256 prizeQuantity = raffleItem.prizeQuantities[prizeIndex];
                    uint256[] memory winningPrizeNumbers = new uint256[](prizeQuantity);
                    uint256 winningPrizeNumberIndex;
                    for (uint256 prizeNumber; prizeNumber < prizeQuantity; prizeNumber++) {
                        // Ticket numbers are numbers between 0 and raffleItem.totalEntered - 1 inclusive.
                        uint256 ticketNumber = uint256(keccak256(abi.encodePacked(randomNumber, raffleItem.ticketId, prizeId, prizeNumber))) %
                            raffleItem.totalEntered;
                        if (ticketNumber >= userEntries.rangeStart && ticketNumber < userEntries.rangeEnd) {
                            winningPrizeNumbers[winningPrizeNumberIndex] = prizeNumber;
                            winningPrizeNumberIndex++;
                        }
                    }
                    if (winningPrizeNumberIndex > 0) {
                        // set the correct size of the winningTickets array
                        assembly {
                            mstore(winningPrizeNumbers, winningPrizeNumberIndex)
                        }
                        // record ticket winning
                        winners_[winnersNum] = PrizeWinnerIO(
                            entrant,
                            raffle.prizeClaimed[msg.sender],
                            userEntryIndex,
                            userEntries.raffleItemIndex,
                            prizeIndex,
                            winningPrizeNumbers,
                            prizeId
                        );
                        // record number of tickets won
                        winnersNum++;
                    }
                }
            }
        }
        // set the correct size for the winners_ array
        assembly {
            mstore(winners_, winnersNum)
        }
    }

    /* This struct information can be gotten from the return results of the winners function */
    struct ticketWinIO {
        uint256 userEntriesIndex; // index into a user's array of tickets (which staking attempt won)
        PrizesWinIO[] prizes;
    }

    // Ticket numbers are numbers between 0 and raffleItem.totalEntered - 1 inclusive.
    // Winning ticket numbers are ticket numbers that won one or more prizes
    struct PrizesWinIO {
        uint256 prizeIndex; // index into the raffleItemPrizes array (which prize was won)
        uint256[] winningPrizeNumbers; // ticket numbers between 0 and raffleItem.totalEntered that won
    }

    /**
     * @notice Claim prizes won
     * @dev All items in _wins are verified as actually won by the address that calls this function and reverts otherwise.
     * @dev Each user address can only claim prizes once, so be sure to include all tickets and prizes won.
     * @dev Prizes are transfered to the address that calls this function.
     * @param _raffleId The raffle that prizes were won in.
     * @param _wins Contains only winning tickets and what was won.
     */
    function claimPrize(uint256 _raffleId, ticketWinIO[] calldata _wins) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.randomNumber > 0, "Raffle: Random number not generated yet");
        require(raffle.prizeClaimed[msg.sender] == false, "Raffle: Any prizes for account have already been claimed");
        raffle.prizeClaimed[msg.sender] = true;
        // Logic:
        // 1. Loop through wins
        // 2. Verify provided userEntriesIndex exists and is not a duplicate
        // 3. Loop through prizes
        // 4. Verify provided prize exists and is not a duplicate
        // 5. Loop through winning ticket numbers
        // 6. Verify winning ticket numbers exists and is not a duplicate
        // 7. Verify that winning ticket numbers won
        // 8. Transfer prizes to winner
        uint256 lastValue; // Used to prevent duplicate win.UserEntriesIndex from being used
        uint256 userEntriesLength = raffle.userEntries[msg.sender].length;
        for (uint256 i; i < _wins.length; i++) {
            ticketWinIO calldata win = _wins[i];
            require(win.userEntriesIndex < userEntriesLength, "Raffle: User ticket does not exist");
            require(win.userEntriesIndex > lastValue || i == 0, "Raffle: UserEntriesIndex not greater than last UserEntriesIndex");
            UserEntries memory userEntries = raffle.userEntries[msg.sender][win.userEntriesIndex];
            RaffleItem storage raffleItem = raffle.raffleItems[userEntries.raffleItemIndex];
            uint256 prizeIdsLength = raffleItem.prizeIds.length;
            lastValue = 0;
            for (uint256 j; j < win.prizes.length; j++) {
                PrizesWinIO calldata prize = win.prizes[j];
                require(prize.prizeIndex < prizeIdsLength, "Raffle: Raffle prize does not exist");
                // Used to prevent duplicate prize.raffleItemPrizeIndex from being used
                require(prize.prizeIndex > lastValue || j == 0, "Raffle: prizeIndex not greater than last prizeIndex");
                uint256 prizeId = raffleItem.prizeIds[prize.prizeIndex];
                uint256 prizeQuantity = raffleItem.prizeQuantities[prize.prizeIndex];
                lastValue = 0;
                for (uint256 k; k < prize.winningPrizeNumbers.length; k++) {
                    uint256 prizeNumber = prize.winningPrizeNumbers[k];
                    require(prizeNumber < prizeQuantity, "Raffle: prizeQuantity does not exist");
                    // Used to prevent duplicate prize.winningTickets[k] from being used
                    require(prizeNumber > lastValue || k == 0, "Raffle: Prize value not greater than last prize value");
                    uint256 ticketNumber = uint256(keccak256(abi.encodePacked(raffle.randomNumber, raffleItem.ticketId, prizeId, prizeNumber))) %
                        raffleItem.totalEntered;
                    require(ticketNumber >= userEntries.rangeStart && ticketNumber < userEntries.rangeEnd, "Raffle: Did not win prize");
                    lastValue = prizeNumber;
                }
                emit RaffleClaimPrize(_raffleId, msg.sender, prizeId, prize.winningPrizeNumbers.length);
                /*
                IERC1155(raffleItemPrize.prizeAddress).safeTransferFrom(
                    address(this),
                    msg.sender,
                    raffleItemPrize.prizeId,
                    prize.winningTickets.length,
                    ""
                );
                */
                lastValue = prize.prizeIndex;
            }
            lastValue = win.userEntriesIndex;
        }
    }
}
