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
    // associates stake address and stakeId to raffleItems
    // if raffleItemIndexes == 0, then raffle item does not exist
    // This means all raffleItemIndexes have been incremented by 1
    // stakeAddress => (stakeId => index + 1)
    mapping(address => mapping(uint256 => uint256)) raffleItemIndexes;
    RaffleItem[] raffleItems;
    // records staking by users
    mapping(address => UserStake[]) userStakes;
    // used to prevent users from claiming prizes more than once
    mapping(address => bool) prizeClaimed;
    // the addresses of people who have staked
    address[] stakers;
    // vrf randomness
    uint256 randomNumber;
    // date in timestamp seconds when a raffle ends
    uint256 raffleEnd;
}

struct UserStake {
    uint24 raffleItemIndex; // Which raffle item was staked
    uint112 rangeStart; // Using raffle numbers starting from rangeStart
    uint112 rangeEnd; // Using raffle numbers ending at rangeEnd. rangeEnd - rangeStart == number of ERC1155 tokens staked
}

struct RaffleItemPrize {
    address prizeAddress; // ERC1155 token contract
    uint96 prizeValue; // Number of ERC1155 tokens
    uint256 prizeId; // ERC1155 token type
}

struct RaffleItem {
    address stakeAddress; // ERC1155 token contract
    uint256 stakeId; // ERC1155 token type
    uint256 stakeTotal; // Total number of ERC1155 tokens staked
    RaffleItemPrize[] raffleItemPrizes; // Prizes that can be won
}

contract RafflesContract {
    // State variables are prefixed with s.
    AppStorage internal s;
    // Immutable values are prefixed with im_ to easily identify them in code
    LinkTokenInterface internal immutable im_link;
    address internal immutable im_vrfCoordinator;
    bytes32 internal immutable im_keyHash;

    bytes4 internal constant ERC1155_ACCEPTED = 0xf23a6e61; // Return value from `onERC1155Received` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`).
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RaffleStarted(uint256 indexed raffleId, uint256 raffleEnd, RaffleItemIO[] raffleItems);
    event RaffleStaker(uint256 indexed raffleId, address staker, StakeItemIO[] stakeItems);
    event RaffleRandomNumber(uint256 indexed raffleId, uint256 randomNumber);
    event RaffleClaimPrize(uint256 indexed raffleId, address staker, address prizeAddress, uint256 prizeId, uint256 prizeValue);

    constructor(
        address _contractOwner,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash
    ) {
        s.contractOwner = _contractOwner;
        im_vrfCoordinator = _vrfCoordinator;
        im_link = LinkTokenInterface(_link);
        im_keyHash = _keyHash; //0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4; // Ropsten details
        // 0.1 LINK
        s.fee = 1e17;
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
        address stakeAddress;
        uint256 stakeId;
        RaffleItemPrizeIO[] raffleItemPrizes;
    }
    struct RaffleItemPrizeIO {
        address prizeAddress;
        uint256 prizeId;
        uint256 prizeValue;
    }

    /**
     * @notice Starts a raffle
     * @dev The _raffleItems argument tells what ERC1155 tokens can be staked for what prizes.
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
            require(raffleItemIO.raffleItemPrizes.length > 0, "Raffle: No prizes");
            require(
                raffle.raffleItemIndexes[raffleItemIO.stakeAddress][raffleItemIO.stakeId] == 0,
                "Raffle: Raffle item already using stakeAddress and stakeId"
            );
            RaffleItem storage raffleItem = raffle.raffleItems.push();
            raffle.raffleItemIndexes[raffleItemIO.stakeAddress][raffleItemIO.stakeId] = raffle.raffleItems.length;
            raffleItem.stakeAddress = raffleItemIO.stakeAddress;
            raffleItem.stakeId = raffleItemIO.stakeId;
            for (uint256 j; j < raffleItemIO.raffleItemPrizes.length; j++) {
                RaffleItemPrizeIO calldata raffleItemPrizeIO = raffleItemIO.raffleItemPrizes[j];
                raffleItem.raffleItemPrizes.push(
                    RaffleItemPrize(raffleItemPrizeIO.prizeAddress, uint96(raffleItemPrizeIO.prizeValue), raffleItemPrizeIO.prizeId)
                );
                IERC1155(raffleItemPrizeIO.prizeAddress).safeTransferFrom(
                    msg.sender,
                    address(this),
                    raffleItemPrizeIO.prizeId,
                    raffleItemPrizeIO.prizeValue,
                    abi.encode(raffleId)
                );
            }
        }
    }

    /**
        @notice Handle the receipt of a single ERC1155 token type.
        @dev An ERC1155-compliant smart contract MUST call this function on the token recipient contract, at the end of a `safeTransferFrom` after the balance has been updated.        
        This function MUST return `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))` (i.e. 0xf23a6e61) if it accepts the transfer.
        This function MUST revert if it rejects the transfer.
        Return of any other value than the prescribed keccak256 generated value MUST result in the transaction being reverted by the caller.
        @param _operator  The address which initiated the transfer (i.e. msg.sender)
        @param _from      The address which previously owned the token
        @param _id        The ID of the token being transferred
        @param _value     The amount of tokens being transferred
        @param _data      Additional data with no specified format
        @return           `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
    */
    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external view returns (bytes4) {
        _operator; // silence not used warning
        _from; // silence not used warning
        _id; // silence not used warning
        _value; // silence not used warning
        require(_data.length == 32, "Raffle: Data of the wrong size sent on transfer");
        uint256 raffleId = abi.decode(_data, (uint256));
        require(raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[raffleId];
        uint256 raffleEnd = raffle.raffleEnd;
        require(raffleEnd > block.timestamp, "Raffle: Can't accept transfer for expired raffle");
        return ERC1155_ACCEPTED;
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
        // Loop over and get all the raffle itmes, which includes staked ERC1155 tokens and prizes
        raffleItems_ = new RaffleItemIO[](raffle.raffleItems.length);
        for (uint256 i; i < raffle.raffleItems.length; i++) {
            RaffleItem storage raffleItem = raffle.raffleItems[i];
            raffleItems_[i].stakeAddress = raffleItem.stakeAddress;
            raffleItems_[i].stakeId = raffleItem.stakeId;
            raffleItems_[i].raffleItemPrizes = new RaffleItemPrizeIO[](raffleItem.raffleItemPrizes.length);
            for (uint256 j; j < raffleItem.raffleItemPrizes.length; j++) {
                RaffleItemPrize storage raffleItemPrize = raffleItem.raffleItemPrizes[j];
                raffleItems_[i].raffleItemPrizes[j].prizeAddress = raffleItemPrize.prizeAddress;
                raffleItems_[i].raffleItemPrizes[j].prizeId = raffleItemPrize.prizeId;
                raffleItems_[i].raffleItemPrizes[j].prizeValue = raffleItemPrize.prizeValue;
            }
        }
    }

    struct StakerStatsIO {
        address stakeAddress; // ERC1155 contract address
        uint256 stakeId; // ERC1155 type id
        uint256 stakeValue; // Number of ERC1155 tokens
    }

    /**
     * @notice Get get staking info for a single staker (address)
     * @param _raffleId Which raffle to get staking stats about
     * @param _staker Who to get staking stats about
     */
    function stakerStats(uint256 _raffleId, address _staker) external view returns (StakerStatsIO[] memory stakerStats_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        stakerStats_ = new StakerStatsIO[](raffle.userStakes[_staker].length);
        for (uint256 i; i < raffle.userStakes[_staker].length; i++) {
            UserStake memory userStake = raffle.userStakes[_staker][i];
            RaffleItem storage raffleItem = raffle.raffleItems[userStake.raffleItemIndex];
            stakerStats_[i].stakeAddress = raffleItem.stakeAddress;
            stakerStats_[i].stakeId = raffleItem.stakeId;
            stakerStats_[i].stakeValue = userStake.rangeEnd - userStake.rangeStart;
        }
    }

    struct StakeStatsIO {
        address stakeAddress; // ERC1155 contract address
        uint256 stakeId; // ERC1155 type id
        uint256 numberOfStakers; // number of unique addresses that staked
        uint256 stakeTotal; // Number of ERC1155 tokens
    }

    /**
     * @notice Returns what has been staked, by how many addresses, and how many ERC1155 tokens staked
     * @param _raffleId Which raffle to get info about
     */
    function stakeStats(uint256 _raffleId) external view returns (StakeStatsIO[] memory stakerStats_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        stakerStats_ = new StakeStatsIO[](raffle.raffleItems.length);
        // loop through raffle items
        for (uint256 i; i < raffle.raffleItems.length; i++) {
            RaffleItem storage raffleItem = raffle.raffleItems[i];
            stakerStats_[i].stakeAddress = raffleItem.stakeAddress;
            stakerStats_[i].stakeId = raffleItem.stakeId;
            stakerStats_[i].stakeTotal = raffleItem.stakeTotal;
            // count the number of users that have staked for the raffle item
            for (uint256 j; j < raffle.stakers.length; j++) {
                address staker = raffle.stakers[j];
                for (uint256 k; k < raffle.userStakes[staker].length; k++) {
                    if (i == raffle.userStakes[staker][k].raffleItemIndex) {
                        stakerStats_[i].numberOfStakers++;
                        break;
                    }
                }
            }
        }
    }

    struct StakeItemIO {
        address stakeAddress; // ERC1155 contract address
        uint256 stakeId; // ERC1155 type id
        uint256 stakeValue; // Number of ERC1155 tokens
    }

    /**
     * @notice Stake ERC1155 tokens for raffle prizes
     * @dev Creates a new entry in the userStakes array
     * @param _raffleId Which raffle to stake in
     * @param _stakeItems The ERC1155 tokens to stake
     */
    function stake(uint256 _raffleId, StakeItemIO[] calldata _stakeItems) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        require(_stakeItems.length > 0, "Raffle: Nothing staked");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd > block.timestamp, "Raffle: Raffle time has expired");
        emit RaffleStaker(_raffleId, msg.sender, _stakeItems);
        // Collect unique addresses that have staked
        if (raffle.userStakes[msg.sender].length == 0) {
            raffle.stakers.push(msg.sender);
        }
        for (uint256 i; i < _stakeItems.length; i++) {
            StakeItemIO calldata stakeItem = _stakeItems[i];
            require(stakeItem.stakeValue > 0, "Raffle: Stake value cannot be zero");
            // get the raffle item that is being staked
            uint256 raffleItemIndex = raffle.raffleItemIndexes[stakeItem.stakeAddress][stakeItem.stakeId];
            require(raffleItemIndex > 0, "Raffle: Stake item doesn't exist for this raffle");
            raffleItemIndex--;
            RaffleItem storage raffleItem = raffle.raffleItems[raffleItemIndex];
            uint256 stakeTotal = raffleItem.stakeTotal;
            // recording the staking
            raffle.userStakes[msg.sender].push(UserStake(uint24(raffleItemIndex), uint112(stakeTotal), uint112(stakeTotal + stakeItem.stakeValue)));
            // update the total amount that has been staked for the raffle item
            raffleItem.stakeTotal = stakeTotal + stakeItem.stakeValue;
            // transfer the ERC1155 tokens to stake to this contract
            IERC1155(stakeItem.stakeAddress).safeTransferFrom(
                msg.sender,
                address(this),
                stakeItem.stakeId,
                stakeItem.stakeValue,
                abi.encode(_raffleId)
            );
        }
    }

    struct StakeWinnerIO {
        address staker; // user address
        bool claimed; // has claimed prizes
        uint256 userStakeIndex; // index into UserStakes array (Who staked and how much)
        uint256 raffleItemIndex; // index into RaffleItems array (What was staked)
        uint256 raffleItemPrizeIndex; // index into RaffleItemPrize array (What is the prize)
        uint256[] prizeValues; // winning values (How many of the prize was one)
        uint256 prizeId; // ERC1155 type id (ERC1155 type of prize)
    }

    /**
     * @notice Get all winning stakes and their prizes
     * @param _raffleId Which raffle
     */
    function winners(uint256 _raffleId) external view returns (StakeWinnerIO[] memory winners_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        winners_ = winners(_raffleId, raffle.stakers);
    }

    /**
     * @notice Get winning stakes and their prizes by staker address
     * @param _raffleId Which raffle
     */
    function winners(uint256 _raffleId, address[] memory _stakers) public view returns (StakeWinnerIO[] memory winners_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        uint256 randomNumber = raffle.randomNumber;
        require(randomNumber > 0, "Raffle: Random number not generated yet");
        // get the total number of all prizes in order to initialize the winners_ array
        {
            // use a block here to prevent stack too deep error
            uint256 numRafflePrizes;
            for (uint256 i; i < raffle.raffleItems.length; i++) {
                RaffleItemPrize[] storage raffleItemPrizes = raffle.raffleItems[i].raffleItemPrizes;
                for (uint256 j; j < raffleItemPrizes.length; j++) {
                    numRafflePrizes += raffleItemPrizes[j].prizeValue;
                }
            }
            // initialize the winners_ array to make it the largest it possibly could be
            // later the length will be reset
            winners_ = new StakeWinnerIO[](numRafflePrizes);
        }
        // Logic:
        // 1. loop through unique addresses that staked
        // 2. loop through their stakes
        // 3. loop through their possible prizes and see if they won
        // 4. if won then record in winners_ array
        uint256 winnersNum;
        for (uint256 h; h < _stakers.length; h++) {
            address staker = _stakers[h];
            for (uint256 i; i < raffle.userStakes[staker].length; i++) {
                UserStake storage userStake = raffle.userStakes[staker][i];
                // stakeTotal is the total number of ERC1155 tokens staked for a raffle item (an item in the raffleItems array)
                uint256 stakeTotal = raffle.raffleItems[userStake.raffleItemIndex].stakeTotal;
                RaffleItemPrize[] storage raffleItemPrizes = raffle.raffleItems[userStake.raffleItemIndex].raffleItemPrizes;
                for (uint256 j; j < raffleItemPrizes.length; j++) {
                    uint256 winnings;
                    address prizeAddress = raffleItemPrizes[j].prizeAddress;
                    uint256 prizeId = raffleItemPrizes[j].prizeId;
                    uint256[] memory prizeValues = new uint256[](raffleItemPrizes[j].prizeValue);
                    for (uint256 k; k < raffleItemPrizes[j].prizeValue; k++) {
                        uint256 winningNumber = uint256(keccak256(abi.encodePacked(randomNumber, prizeAddress, prizeId, k))) % stakeTotal;
                        if (winningNumber >= userStake.rangeStart && winningNumber < userStake.rangeEnd) {
                            prizeValues[winnings] = k;
                            winnings++;
                        }
                    }
                    if (winnings > 0) {
                        // set the correct size of the prizeValues array
                        assembly {
                            mstore(prizeValues, winnings)
                        }
                        // record stake winning
                        winners_[winnersNum] = StakeWinnerIO(
                            staker,
                            raffle.prizeClaimed[msg.sender],
                            i,
                            userStake.raffleItemIndex,
                            j,
                            prizeValues,
                            prizeId
                        );
                        // record number of stakes won
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

    // /* This struct information can be gotten from the return results of the winners function */
    // struct StakeWinIO {
    //     uint256 userStakeIndex; // index into a user's array of stakes (which staking attempt won)
    //     uint256 raffleItemPrizeIndex; // index into the raffleItemPrizes array (which prize was won)
    //     uint256[] prizeValues; // what prize values won (the length of this array is the number or ERC1155 prize tokens won)
    // }

    // /**
    //  * @notice Claim prizes won
    //  * @dev All items in _wins are verified as actually won by the address that calls this function and reverts otherwise.
    //  * @dev Each user address can only claim prizes once, so be sure to include all stakes and prizes won.
    //  * @dev Prizes are transfered to the address that calls this function.
    //  * @param _raffleId The raffle that prizes were won in.
    //  * @param _wins Contains only winning stakes and what was won.
    //  */
    // function claimPrize(uint256 _raffleId, StakeWinIO[] calldata _wins) external {
    //     require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
    //     Raffle storage raffle = s.raffles[_raffleId];
    //     require(raffle.randomNumber > 0, "Raffle: Random number not generated yet");
    //     require(raffle.prizeClaimed[msg.sender] == false, "Raffle: Any prizes for account have already been claimed");
    //     raffle.prizeClaimed[msg.sender] = true;
    //     // Logic:
    //     // 1. Loop through wins
    //     // 2. Verify provided userStakeIndex exists
    //     // 1. Loop through prize
    //     UserStake[] storage userStakes = raffle.userStakes[msg.sender];
    //     uint256 userStakesLength = userStakes.length;
    //     for (uint256 i; i < _wins.length; i++) {
    //         StakeWinIO calldata win = _wins[i];
    //         require(win.userStakeIndex < userStakesLength, "Raffle: User stake does not exist");
    //         UserStake memory userStake = userStakes[win.userStakeIndex];
    //         uint256 stakeTotal = raffle.raffleItems[userStake.raffleItemIndex].stakeTotal;
    //         RaffleItemPrize[] storage raffleItemPrizes = raffle.raffleItems[userStake.raffleItemIndex].raffleItemPrizes;
    //         require(raffleItemPrizes.length > win.raffleItemPrizeIndex, "Raffle: Raffle prize type does not exist");
    //         RaffleItemPrize memory raffleItemPrize = raffleItemPrizes[win.raffleItemPrizeIndex];
    //         uint256 lastPrizeValue;
    //         for (uint256 j; j < win.prizeValues.length; j++) {
    //             uint256 prizeValue = win.prizeValues[j];
    //             require(prizeValue > lastPrizeValue || j == 0, "Raffle: Prize value not greater than last prize value");
    //             lastPrizeValue = prizeValue;
    //             require(prizeValue < raffleItemPrize.prizeValue, "Raffle: prizeValue does not exist");
    //             uint256 winningNumber = uint256(
    //                 keccak256(abi.encodePacked(raffle.randomNumber, raffleItemPrize.prizeAddress, raffleItemPrize.prizeId, prizeValue))
    //             ) % stakeTotal;
    //             require(winningNumber >= userStake.rangeStart && winningNumber < userStake.rangeEnd, "Raffle: Did not win prize");
    //         }
    //         emit RaffleClaimPrize(_raffleId, msg.sender, raffleItemPrize.prizeAddress, raffleItemPrize.prizeId, win.prizeValues.length);
    //         IERC1155(raffleItemPrize.prizeAddress).safeTransferFrom(address(this), msg.sender, raffleItemPrize.prizeId, win.prizeValues.length, "");
    //     }
    // }

    /* This struct information can be gotten from the return results of the winners function */
    struct StakeWinIO {
        uint256 userStakeIndex; // index into a user's array of stakes (which staking attempt won)
        PrizesWinIO[] prizes;
    }
    struct PrizesWinIO {
        uint256 raffleItemPrizeIndex; // index into the raffleItemPrizes array (which prize was won)
        uint256[] prizeValues; // what prize values won (the length of this array is the number or ERC1155 prize tokens won)
    }

    /**
     * @notice Claim prizes won
     * @dev All items in _wins are verified as actually won by the address that calls this function and reverts otherwise.
     * @dev Each user address can only claim prizes once, so be sure to include all stakes and prizes won.
     * @dev Prizes are transfered to the address that calls this function.
     * @param _raffleId The raffle that prizes were won in.
     * @param _wins Contains only winning stakes and what was won.
     */
    function claimPrize(uint256 _raffleId, StakeWinIO[] calldata _wins) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.randomNumber > 0, "Raffle: Random number not generated yet");
        require(raffle.prizeClaimed[msg.sender] == false, "Raffle: Any prizes for account have already been claimed");
        raffle.prizeClaimed[msg.sender] = true;
        // Logic:
        // 1. Loop through wins
        // 2. Verify provided userStakeIndex exists and is not a duplicate
        // 3. Loop through prizes
        // 4. Verify provided prize exists and is not a duplicate
        // 5. Loop through prive values
        // 6. Verify prize value exists and is not a duplicate
        // 7. Verify that prize value won
        // 8. Transfer prizes to winner
        uint256 lastValue; // Used to prevent duplicate win.userStakeIndex from being used
        uint256 userStakesLength = raffle.userStakes[msg.sender].length;
        for (uint256 i; i < _wins.length; i++) {
            StakeWinIO calldata win = _wins[i];
            require(win.userStakeIndex < userStakesLength, "Raffle: User stake does not exist");
            require(win.userStakeIndex > lastValue || i == 0, "Raffle: userStakeIndex not greater than last userStakeIndex");
            UserStake memory userStake = raffle.userStakes[msg.sender][win.userStakeIndex];
            uint256 stakeTotal = raffle.raffleItems[userStake.raffleItemIndex].stakeTotal;
            RaffleItemPrize[] storage raffleItemPrizes = raffle.raffleItems[userStake.raffleItemIndex].raffleItemPrizes;
            uint256 raffleItemPrizesLength = raffleItemPrizes.length;
            lastValue = 0; // Used to prevent duplicate prize.raffleItemPrizeIndex from being used
            for (uint256 j; j < win.prizes.length; j++) {
                PrizesWinIO calldata prize = win.prizes[j];
                require(prize.raffleItemPrizeIndex < raffleItemPrizesLength, "Raffle: Raffle prize type does not exist");
                require(prize.raffleItemPrizeIndex > lastValue || j == 0, "Raffle: raffleItemPrizeIndex not greater than last raffleItemPrizeIndex");
                RaffleItemPrize memory raffleItemPrize = raffleItemPrizes[prize.raffleItemPrizeIndex];
                lastValue = 0; // Used to prevent duplicate prize.prizeValues[k] from being used
                for (uint256 k; k < prize.prizeValues.length; k++) {
                    uint256 prizeValue = prize.prizeValues[k];
                    require(prizeValue < raffleItemPrize.prizeValue, "Raffle: prizeValue does not exist");
                    require(prizeValue > lastValue || k == 0, "Raffle: Prize value not greater than last prize value");
                    uint256 winningNumber = uint256(
                        keccak256(abi.encodePacked(raffle.randomNumber, raffleItemPrize.prizeAddress, raffleItemPrize.prizeId, prizeValue))
                    ) % stakeTotal;
                    require(winningNumber >= userStake.rangeStart && winningNumber < userStake.rangeEnd, "Raffle: Did not win prize");
                    lastValue = prizeValue;
                }
                emit RaffleClaimPrize(_raffleId, msg.sender, raffleItemPrize.prizeAddress, raffleItemPrize.prizeId, prize.prizeValues.length);
                IERC1155(raffleItemPrize.prizeAddress).safeTransferFrom(
                    address(this),
                    msg.sender,
                    raffleItemPrize.prizeId,
                    prize.prizeValues.length,
                    ""
                );
                lastValue = prize.raffleItemPrizeIndex;
            }
            lastValue = win.userStakeIndex;
        }
    }
}
