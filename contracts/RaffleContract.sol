//SPDX-License-Identifier: MIT
pragma solidity 0.7.3;
pragma experimental ABIEncoderV2;

// import "@nomiclabs/buidler/console.sol";

import "./interfaces/IERC1155.sol";

struct Raffle {
    // stakeAddress => (stakeId => index)
    mapping(address => mapping(uint256 => uint256)) stakeItemIndexes;
    StakeItem[] stakeItems;
    RaffleItem[] raffleItems;
    uint32 raffleEnd;
}

struct AppStorage {
    address contractOwner;
    Raffle[] raffles;
}

struct StakeItem {
    address stakeAddress;
    uint256 stakeId;
}

struct RaffleItem {
    uint16 stakeItemIndex;
    address prizeAddress;
    uint80 prizeValue;
    uint256 prizeId;
}

struct RaffleItemInput {
    address stakeAddress;
    uint256 stakeId;
    address prizeAddress;
    uint256 prizeId;
    uint256 prizeValue;
}

contract RaffleContract {
    AppStorage internal s;
    event RaffleStarted(uint256 raffleId, uint256 raffleEnd);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

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

    function startRaffle(uint256 _raffleEnd, RaffleItemInput[] calldata _raffleItems) external {
        Raffle storage raffle = s.raffles.push();
        raffle.raffleEnd = uint32(_raffleEnd);
        for (uint256 i; i < _raffleItems.length; i++) {
            address stakeAddress = _raffleItems[i].stakeAddress;
            uint256 stakeId = _raffleItems[i].stakeId;
            uint256 stakeItemIndex = raffle.stakeItemIndexes[stakeAddress][stakeId];
            if (stakeItemIndex == 0) {
                raffle.stakeItems.push(StakeItem(stakeAddress, stakeId));
                stakeItemIndex = raffle.stakeItems.length;
                raffle.stakeItemIndexes[stakeAddress][stakeId] = stakeItemIndex;
            }
            raffle.raffleItems.push(
                RaffleItem(uint16(stakeItemIndex - 1), _raffleItems[i].prizeAddress, uint80(_raffleItems[i].prizeValue), _raffleItems[i].prizeId)
            );
        }
        emit RaffleStarted(s.raffles.length - 1, _raffleEnd);
    }

    struct StakeItemInput {
        address stakeAddress;
        uint256 stakeId;
        uint256 stakeValue;
    }

    function stake(uint256 _raffleId, StakeItemInput[] calldata _stakeItems) external {
        require(_raffleId < s.raffles.length, "Raffle: Raffle does not exist");
        Raffle storage raffle = s.raffles[_raffleId];
        require(raffle.raffleEnd > block.number, "Raffle: Raffle time has expired");
        for (uint256 i; i < _stakeItems.length; i++) {
            address stakeAddress = _stakeItems[i].stakeAddress;
            uint256 stakeId = _stakeItems[i].stakeId;
            uint256 stakeItemIndex = raffle.stakeItemIndexes[stakeAddress][stakeId];
            require(stakeItemIndex > 0, "Raffle: Stake item doesn't exist for this raffle");

            IERC1155(_stakeItems[i].stakeAddress).safeTransferFrom(msg.sender, address(this), _stakeItems[i].stakeId, _stakeItems[i].stakeValue, "");
        }
    }

    /*
    openRaffle(uint256 stakingPeriod) admin
Allows users to start staking tickets

newRaffle(uint256 ticketID, uint256 prizeNumber) admin
Creates a new raffle with the specified difficulty and number of prizes

transferPrizes(uint256 raffleID, uint256[] tokenIDs) admin
Takes an array of tokenIDs that will be transferred from the owner 

stakeTicket(uint256 raffleID, uint256 tokenID) user
Takes a ticketID and adds ticket to the current raffle
Transfers ticket from owner to raffle (can’t be unstaked)

chooseWinners(uint256 raffleID)  user
Calls Chainlink VRF to generate random number and sets prize winners

claimPrize(uint256 prizeID) user
claims the wearable voucher NFT
*/
}
