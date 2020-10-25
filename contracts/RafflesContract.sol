//SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

// import "hardhat/console.sol";

import "./interfaces/IERC1155.sol";

struct AppStorage {
    Raffle[] raffles;
    address contractOwner;
}

struct Raffle {
    // stakeAddress => (stakeId => index + 1)
    mapping(address => mapping(uint256 => uint256)) raffleItemIndexes;
    RaffleItem[] raffleItems;
    // raffleItemIndex => RafflePrize[]
    mapping(uint256 => RafflePrize[]) rafflePrizes;
    mapping(address => UserStake[]) userStakes;
    mapping(address => bool) prizeClaimed;
    address[] stakers;
    uint256 randomNumber;
    uint256 raffleEnd;
}

struct UserStake {
    uint24 raffleItemIndex;
    uint112 rangeStart;
    uint112 rangeEnd;
}

struct RafflePrize {
    address prizeAddress;
    uint96 prizeValue;
    uint256 prizeId;
}

struct RafflePrizeIO {
    address prizeAddress;
    uint256 prizeId;
    uint256 prizeValue;
}

struct RaffleItem {
    address stakeAddress;
    uint256 stakeId;
    uint256 stakeTotal;
    RafflePrize[] rafflePrizes;
}

struct RaffleItemIO {
    address stakeAddress;
    uint256 stakeId;
    RafflePrizeIO[] rafflePrizes;
}

struct OpenRaffleIO {
    uint256 raffleId;
    uint256 raffleEnd;
}

struct StakeStatsIO {
    address stakeAddress;
    uint256 stakeId;
    uint256 numberOfStakers;
    uint256 stakeTotal;
}

struct StakerStatsIO {
    address stakeAddress;
    uint256 stakeId;
    uint256 stakeValue;
}

struct StakeItemIO {
    address stakeAddress;
    uint256 stakeId;
    uint256 stakeValue;
}

struct WinnerIO {
    address staker;
    bool claimed;
    address prizeAddress;
    uint256 prizeId;
    uint256 prizeValue;
}

contract RafflesContract {
    AppStorage internal s;
    bytes4 internal constant ERC1155_ACCEPTED = 0xf23a6e61; // Return value from `onERC1155Received` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`).
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RaffleStarted(uint256 indexed raffleId, uint256 raffleEnd, RaffleItemIO[] raffleItems);
    event RaffleStaker(uint256 indexed raffleId, address staker, StakeItemIO[] stakeItems);
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
            require(raffleItemIO.rafflePrizes.length > 0, "Raffle: No prizes");
            require(
                raffle.raffleItemIndexes[raffleItemIO.stakeAddress][raffleItemIO.stakeId] == 0,
                "Raffle: Raffle item already using stakeAddress and stakeId"
            );
            RaffleItem storage raffleItem = raffle.raffleItems.push();
            raffle.raffleItemIndexes[raffleItemIO.stakeAddress][raffleItemIO.stakeId] = raffle.raffleItems.length;
            raffleItem.stakeAddress = raffleItemIO.stakeAddress;
            raffleItem.stakeId = raffleItemIO.stakeId;
            for (uint256 j; j < raffleItemIO.rafflePrizes.length; j++) {
                RafflePrizeIO memory rafflePrizeIO = raffleItemIO.rafflePrizes[j];
                raffleItem.rafflePrizes.push(RafflePrize(rafflePrizeIO.prizeAddress, uint96(rafflePrizeIO.prizeValue), rafflePrizeIO.prizeId));
                IERC1155(rafflePrizeIO.prizeAddress).safeTransferFrom(
                    msg.sender,
                    address(this),
                    rafflePrizeIO.prizeId,
                    rafflePrizeIO.prizeValue,
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
        require(_data.length == 32, "Raffle: Incorrect data sent on transfer");
        uint256 raffleId = abi.decode(_data, (uint256));
        require(raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[raffleId];
        uint256 raffleEnd = raffle.raffleEnd;
        require(raffleEnd > block.timestamp, "Raffle: Can't accept transfer for expired raffle");
        return ERC1155_ACCEPTED;
    }

    function openRaffles() external view returns (OpenRaffleIO[] memory openRaffles_) {
        openRaffles_ = new OpenRaffleIO[](s.raffles.length);
        uint256 numOpen;
        for (uint256 i; i < s.raffles.length; i++) {
            uint256 raffleEnd = s.raffles[i].raffleEnd;
            if (raffleEnd > block.timestamp) {
                openRaffles_[numOpen].raffleId = i;
                openRaffles_[numOpen].raffleEnd = raffleEnd;
                numOpen++;
            }
        }
        assembly {
            mstore(openRaffles_, numOpen)
        }
    }

    function getRaffles() external view returns (OpenRaffleIO[] memory raffles_) {
        raffles_ = new OpenRaffleIO[](s.raffles.length);
        uint256 numOpen;
         for (uint256 i; i < s.raffles.length; i++) {
            uint256 raffleEnd = s.raffles[i].raffleEnd;
                raffles_[numOpen].raffleId = i;
                raffles_[numOpen].raffleEnd = raffleEnd;
                numOpen++;
        }
        assembly {
            mstore(raffles_, numOpen)
        }
    }

    function raffleSupply() external view returns (uint256 raffleSupply_) {
        raffleSupply_ = s.raffles.length;
    }

    function raffleInfo(uint256 _raffleId) external view returns (uint256 raffleEnd_, RaffleItemIO[] memory raffleItems_, bool numberChosen_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        raffleEnd_ = raffle.raffleEnd;


        if (raffle.randomNumber == 0) {
            numberChosen_ = false;
        }
        else {
            numberChosen_ = true;
        }

        raffleItems_ = new RaffleItemIO[](raffle.raffleItems.length);
        for (uint256 i; i < raffle.raffleItems.length; i++) {
            RaffleItem storage raffleItem = raffle.raffleItems[i];
            raffleItems_[i].stakeAddress = raffleItem.stakeAddress;
            raffleItems_[i].stakeId = raffleItem.stakeId;
            raffleItems_[i].rafflePrizes = new RafflePrizeIO[](raffleItem.rafflePrizes.length);
            for (uint256 j; j < raffleItem.rafflePrizes.length; j++) {
                RafflePrize storage rafflePrize = raffleItem.rafflePrizes[j];
                raffleItems_[i].rafflePrizes[j].prizeAddress = rafflePrize.prizeAddress;
                raffleItems_[i].rafflePrizes[j].prizeId = rafflePrize.prizeId;
                raffleItems_[i].rafflePrizes[j].prizeValue = rafflePrize.prizeValue;
            }
        }
    }

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

    function stakeStats(uint256 _raffleId) external view returns (StakeStatsIO[] memory stakerStats_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        stakerStats_ = new StakeStatsIO[](raffle.raffleItems.length);
        for (uint256 i; i < raffle.raffleItems.length; i++) {
            RaffleItem storage raffleItem = raffle.raffleItems[i];
            stakerStats_[i].stakeAddress = raffleItem.stakeAddress;
            stakerStats_[i].stakeId = raffleItem.stakeId;
            stakerStats_[i].stakeTotal = raffleItem.stakeTotal;
            uint256 raffleItemIndex = raffle.raffleItemIndexes[stakerStats_[i].stakeAddress][stakerStats_[i].stakeId] - 1;
            for (uint256 j; j < raffle.stakers.length; j++) {
                address staker = raffle.stakers[j];
                for (uint256 k; k < raffle.userStakes[staker].length; k++) {
                    if (raffleItemIndex == raffle.userStakes[staker][k].raffleItemIndex) {
                        stakerStats_[i].numberOfStakers++;
                        break;
                    }
                }
            }
        }
    }

    function stake(uint256 _raffleId, StakeItemIO[] calldata _stakeItems) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        require(_stakeItems.length > 0, "Raffle: Nothing staked");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd > block.timestamp, "Raffle: Raffle time has expired");
        emit RaffleStaker(_raffleId, msg.sender, _stakeItems);
        if (raffle.userStakes[msg.sender].length == 0) {
            raffle.stakers.push(msg.sender);
        }
        for (uint256 i; i < _stakeItems.length; i++) {
            StakeItemIO calldata stakeItem = _stakeItems[i];
            require(stakeItem.stakeValue > 0, "Raffle: Stake value cannot be zero");
            uint256 raffleItemIndex = raffle.raffleItemIndexes[stakeItem.stakeAddress][stakeItem.stakeId];
            require(raffleItemIndex > 0, "Raffle: Stake item doesn't exist for this raffle");
            raffleItemIndex--;
            RaffleItem storage raffleItem = raffle.raffleItems[raffleItemIndex];
            uint256 stakeTotal = raffleItem.stakeTotal;
            raffle.userStakes[msg.sender].push(UserStake(uint24(raffleItemIndex), uint112(stakeTotal), uint112(stakeTotal + stakeItem.stakeValue)));
            raffleItem.stakeTotal = stakeTotal + stakeItem.stakeValue;
            IERC1155(stakeItem.stakeAddress).safeTransferFrom(
                msg.sender,
                address(this),
                stakeItem.stakeId,
                stakeItem.stakeValue,
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

    function winners(uint256 _raffleId) external view returns (WinnerIO[] memory winners_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        winners_ = winners(_raffleId, raffle.stakers);
    }

    function winners(uint256 _raffleId, address[] memory _stakers) public view returns (WinnerIO[] memory winners_) {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd < block.timestamp, "Raffle: Raffle time has not expired");
        uint256 randomNumber = raffle.randomNumber;
        require(randomNumber > 0, "Raffle: Random number not generated yet");
        {
            uint256 numRafflePrizes;
            for (uint256 i; i < raffle.raffleItems.length; i++) {
                RafflePrize[] storage rafflePrizes = raffle.raffleItems[i].rafflePrizes;
                for (uint256 j; j < rafflePrizes.length; j++) {
                    numRafflePrizes += rafflePrizes[j].prizeValue;
                }
            }
            winners_ = new WinnerIO[](numRafflePrizes);
        }
        uint256 winnersNum;
        for (uint256 h; h < _stakers.length; h++) {
            address staker = _stakers[h];
            UserStake[] storage userStakes = raffle.userStakes[staker];
            for (uint256 i; i < userStakes.length; i++) {
                UserStake storage userStake = userStakes[i];
                uint256 stakeTotal = raffle.raffleItems[userStake.raffleItemIndex].stakeTotal;
                RafflePrize[] storage rafflePrizes = raffle.raffleItems[userStake.raffleItemIndex].rafflePrizes;
                for (uint256 j; j < rafflePrizes.length; j++) {
                    uint256 winnings;
                    address prizeAddress = rafflePrizes[j].prizeAddress;
                    uint256 prizeId = rafflePrizes[j].prizeId;
                    for (uint256 k; k < rafflePrizes[j].prizeValue; k++) {
                        uint256 winningNumber = uint256(keccak256(abi.encodePacked(randomNumber, prizeAddress, prizeId, k))) % stakeTotal;
                        if (winningNumber >= userStake.rangeStart && winningNumber < userStake.rangeEnd) {
                            winnings++;
                        }
                    }
                    if (winnings > 0) {
                        require(winnersNum < winners_.length, "Invalid winnersnum length");
                        winners_[winnersNum] = WinnerIO(staker, raffle.prizeClaimed[msg.sender], prizeAddress, prizeId, winnings);
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
            uint256 raffleItemIndex = userStakes[i].raffleItemIndex;
            uint256 stakeTotal = raffle.raffleItems[raffleItemIndex].stakeTotal;
            RafflePrize[] storage rafflePrizes = raffle.raffleItems[raffleItemIndex].rafflePrizes;
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
