//SPDX-License-Identifier: MIT
pragma solidity 0.7.3;
pragma experimental ABIEncoderV2;

// import "@nomiclabs/buidler/console.sol";

import "./interfaces/IERC1155.sol";

struct AppStorage {
    Raffle[] raffles;
    address contractOwner;
}

struct Raffle {
    // stakeAddress => (stakeId => index)
    mapping(address => mapping(uint256 => uint256)) stakeItemIndexes;
    StakeItem[] stakeItems;
    mapping(uint256 => RafflePrize[]) rafflePrizes;
    mapping(address => UserStake[]) userStakes;
    mapping(address => bool) prizeClaimed;
    address[] stakers;
    uint256 randomNumber;
    uint256 raffleEnd;
}

struct UserStake {
    uint24 stakeItemIndex;
    uint112 rangeStart;
    uint112 rangeEnd;
}

struct StakeItem {
    address stakeAddress;
    uint256 stakeId;
    uint256 stakeTotal;
}

struct RafflePrize {
    address prizeAddress;
    uint80 prizeValue;
    uint256 prizeId;
}

struct RaffleItem {
    address stakeAddress;
    uint256 stakeId;
    address prizeAddress;
    uint256 prizeId;
    uint256 prizeValue;
}

contract RaffleContract {
    AppStorage internal s;
    bytes4 internal constant ERC1155_ACCEPTED = 0xf23a6e61; // Return value from `onERC1155Received` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`).
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RaffleStarted(uint256 indexed raffleId, uint256 raffleEnd, RaffleItem[] raffleItems);
    event RaffleStaker(uint256 indexed raffleId, address staker, StakeItemInput[] stakeItems);
    event RaffleRandomNumber(uint256 indexed raffleId, uint256 randomNumber);
    event RaffleClaimPrize(uint256 indexed raffleId, address staker, address prizeAddress, uint256 prizeId, uint256 prizeValue);

    constructor(address _contractOwner) {
        s.contractOwner = _contractOwner;
    }

    function owner() external view returns (address) {
        return s.contractOwner;
    }

    function transferOwnership(address _newContractOwner) external {
        address previousOwner = s.contractOwner;
        require(msg.sender == previousOwner, "Raffle: Must be contract owner");
        s.contractOwner = _newContractOwner;
        emit OwnershipTransferred(previousOwner, _newContractOwner);
    }

    function startRaffle(uint256 _raffleEnd, RaffleItem[] calldata _raffleItems) external {
        require(msg.sender == s.contractOwner, "Raffle: Must be contract owner");
        require(_raffleEnd > block.timestamp + 3600, "Raffle: _raffleEnd must be greater than 1 hour");
        uint256 raffleId = s.raffles.length;
        emit RaffleStarted(raffleId, _raffleEnd, _raffleItems);
        Raffle storage raffle = s.raffles.push();
        raffle.raffleEnd = uint256(_raffleEnd);
        for (uint256 i; i < _raffleItems.length; i++) {
            address stakeAddress = _raffleItems[i].stakeAddress;
            uint256 stakeId = _raffleItems[i].stakeId;
            uint256 stakeItemIndex = raffle.stakeItemIndexes[stakeAddress][stakeId];
            if (stakeItemIndex == 0) {
                raffle.stakeItems.push(StakeItem(stakeAddress, stakeId, 0));
                stakeItemIndex = raffle.stakeItems.length;
                raffle.stakeItemIndexes[stakeAddress][stakeId] = stakeItemIndex;
            }
            raffle.rafflePrizes[stakeItemIndex - 1].push(
                RafflePrize(_raffleItems[i].prizeAddress, uint80(_raffleItems[i].prizeValue), _raffleItems[i].prizeId)
            );
            IERC1155(_raffleItems[i].prizeAddress).safeTransferFrom(
                msg.sender,
                address(this),
                _raffleItems[i].prizeId,
                _raffleItems[i].prizeValue,
                abi.encode(raffleId)
            );
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
        require(_data.length == 32, "Raffle: Incorrect data sent on transfer");
        uint256 raffleId = abi.decode(_data, (uint256));
        require(raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[raffleId];
        uint256 raffleEnd = raffle.raffleEnd;
        require(raffleEnd > block.timestamp, "Raffle: Can't accept transfer for expired raffle");
        return ERC1155_ACCEPTED;
    }

    function openRaffles() external view returns (uint256[] memory openRaffles_) {
        openRaffles_ = new uint256[](s.raffles.length);
        uint256 numOpen;
        for (uint256 i; i < s.raffles.length; i++) {
            if (s.raffles[i].raffleEnd > block.timestamp) {
                openRaffles_[numOpen] = i;
                numOpen++;
            }
        }
        assembly {
            mstore(openRaffles_, numOpen)
        }
    }

    function raffleSupply() external view returns (uint256 raffleSupply_) {
        raffleSupply_ = s.raffles.length;
    }

    function raffleInfo(uint256 _raffleId) external view returns (uint256 raffleEnd_, RaffleItem[] memory raffleItems_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        raffleEnd_ = raffle.raffleEnd;
        uint256 numRaffleItems;
        for (uint256 i; i < raffle.stakeItems.length; i++) {
            RafflePrize[] storage rafflePrizes = raffle.rafflePrizes[i];
            numRaffleItems += rafflePrizes.length;
        }
        raffleItems_ = new RaffleItem[](numRaffleItems);
        uint256 numRaffleIndex;
        for (uint256 i; i < raffle.stakeItems.length; i++) {
            RafflePrize[] storage rafflePrizes = raffle.rafflePrizes[i];
            for (uint256 j; j < rafflePrizes.length; j++) {
                raffleItems_[numRaffleIndex].stakeAddress = raffle.stakeItems[i].stakeAddress;
                raffleItems_[numRaffleIndex].stakeId = raffle.stakeItems[i].stakeId;
                raffleItems_[numRaffleIndex].prizeAddress = rafflePrizes[j].prizeAddress;
                raffleItems_[numRaffleIndex].prizeAddress = rafflePrizes[j].prizeAddress;
                raffleItems_[numRaffleIndex].prizeValue = rafflePrizes[j].prizeValue;
                numRaffleIndex++;
            }
        }
    }

    // function raffleStats()

    struct StakeItemInput {
        address stakeAddress;
        uint256 stakeId;
        uint256 stakeValue;
    }

    function stake(uint256 _raffleId, StakeItemInput[] calldata _stakeItems) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd > block.timestamp, "Raffle: Raffle time has expired");
        emit RaffleStaker(_raffleId, msg.sender, _stakeItems);
        if (raffle.userStakes[msg.sender].length == 0) {
            raffle.stakers.push(msg.sender);
        }
        for (uint256 i; i < _stakeItems.length; i++) {
            address stakeAddress = _stakeItems[i].stakeAddress;
            uint256 stakeId = _stakeItems[i].stakeId;
            uint256 stakeValue = _stakeItems[i].stakeValue;
            uint256 stakeItemIndex = raffle.stakeItemIndexes[stakeAddress][stakeId];
            require(stakeItemIndex > 0, "Raffle: Stake item doesn't exist for this raffle");
            stakeItemIndex--;
            uint256 stakeTotal = raffle.stakeItems[stakeItemIndex].stakeTotal;
            raffle.userStakes[msg.sender].push(UserStake(uint24(stakeItemIndex), uint112(stakeTotal), uint112(stakeTotal + stakeValue)));
            raffle.stakeItems[stakeItemIndex].stakeTotal = stakeTotal + stakeValue;
            IERC1155(_stakeItems[i].stakeAddress).safeTransferFrom(
                msg.sender,
                address(this),
                _stakeItems[i].stakeId,
                _stakeItems[i].stakeValue,
                abi.encode(_raffleId)
            );
        }
    }

    function drawRandomNumber(uint256 _raffleId) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd < block.timestamp, "Raffle: Raffle time has not expired");
        require(raffle.randomNumber == 0, "Raffle: Random number already generated");
        uint256 randomNumber = uint224(uint256(keccak256(abi.encodePacked(block.number))));
        emit RaffleRandomNumber(_raffleId, randomNumber);
        raffle.randomNumber = randomNumber;
    }

    struct Winner {
        address staker;
        bool claimed;
        address prizeAddress;
        uint256 prizeId;
        uint256 prizeValue;
    }

    function winners(uint256 _raffleId) external view returns (Winner[] memory winners_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        winners_ = winners(_raffleId, raffle.stakers);
    }

    function winners(uint256 _raffleId, address[] memory _stakers) public view returns (Winner[] memory winners_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd < block.timestamp, "Raffle: Raffle time has not expired");
        uint256 randomNumber = raffle.randomNumber;
        require(randomNumber > 0, "Raffle: Random number not generated yet");
        {
            uint256 numRaffleItems;
            for (uint256 i; i < raffle.stakeItems.length; i++) {
                RafflePrize[] storage rafflePrizes = raffle.rafflePrizes[i];
                numRaffleItems += rafflePrizes.length;
            }
            winners_ = new Winner[](_stakers.length * numRaffleItems);
        }
        uint256 winnersNum;
        for (uint256 h; h < _stakers.length; h++) {
            address staker = _stakers[h];
            UserStake[] storage userStakes = raffle.userStakes[staker];
            for (uint256 i; i < userStakes.length; i++) {
                uint256 stakeItemIndex = userStakes[i].stakeItemIndex;
                uint256 stakeTotal = raffle.stakeItems[stakeItemIndex].stakeTotal;
                RafflePrize[] storage rafflePrizes = raffle.rafflePrizes[stakeItemIndex];
                for (uint256 j; j < rafflePrizes.length; j++) {
                    uint256 winnings;
                    address prizeAddress = rafflePrizes[j].prizeAddress;
                    uint256 prizeId = rafflePrizes[j].prizeId;
                    for (uint256 k; k < rafflePrizes[j].prizeValue; k++) {
                        uint256 winningNumber = uint256(keccak256(abi.encodePacked(randomNumber, prizeAddress, prizeId, k))) % stakeTotal;
                        if (winningNumber >= userStakes[i].rangeStart && winningNumber < userStakes[i].rangeEnd) {
                            winnings++;
                        }
                    }
                    if (winnings > 0) {
                        winners_[winnersNum] = Winner(staker, raffle.prizeClaimed[msg.sender], prizeAddress, prizeId, winnings);
                        winnersNum++;
                    }
                }
            }
        }
        assembly {
            mstore(winners_, winnersNum)
        }
    }

    function claimPrize(uint256 _raffleId) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd < block.timestamp, "Raffle: Raffle time has not expired");
        uint256 randomNumber = raffle.randomNumber;
        require(randomNumber > 0, "Raffle: Random number not generated yet");
        require(raffle.prizeClaimed[msg.sender] == false, "Raffle: Any prizes for account have already been claimed");
        raffle.prizeClaimed[msg.sender] = true;
        UserStake[] storage userStakes = raffle.userStakes[msg.sender];
        for (uint256 i; i < userStakes.length; i++) {
            uint256 rangeStart = userStakes[i].rangeStart;
            uint256 rangeEnd = userStakes[i].rangeEnd;
            uint256 stakeItemIndex = userStakes[i].stakeItemIndex;
            uint256 stakeTotal = raffle.stakeItems[stakeItemIndex].stakeTotal;
            RafflePrize[] storage rafflePrizes = raffle.rafflePrizes[stakeItemIndex];
            for (uint256 j; j < rafflePrizes.length; j++) {
                uint256 winnings;
                address prizeAddress = rafflePrizes[j].prizeAddress;
                uint256 prizeId = rafflePrizes[j].prizeId;
                for (uint256 k; k < rafflePrizes[j].prizeValue; k++) {
                    uint256 winningNumber = uint256(keccak256(abi.encodePacked(randomNumber, prizeAddress, prizeId, k))) % stakeTotal;
                    if (winningNumber >= rangeStart && winningNumber < rangeEnd) {
                        winnings++;
                    }
                }
                if (winnings > 0) {
                    emit RaffleClaimPrize(_raffleId, msg.sender, prizeAddress, prizeId, winnings);
                    IERC1155(prizeAddress).safeTransferFrom(address(this), msg.sender, prizeId, winnings, "");
                }
            }
        }
    }
}
