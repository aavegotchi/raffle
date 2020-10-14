//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.3;
pragma experimental ABIEncoderV2;

// import "@nomiclabs/buidler/console.sol";

struct Raffle {
    uint32 raffleEnd;
}

struct AppStorage {
    Raffle[] raffles;
}

struct TicketAndAward {
    address ticketAddress;
    uint256 ticketId;
    address awardTokenAddress;
    uint256 awardTokenId;
    uint256 awardTokenValue;
}

contract Raffle {
    AppStorage internal s;

    constructor(string memory _greeting) {}

    function startRaffle(uint256 _raffleEnd, TicketAndAward[] calldata _ticketAndAward) external {
        s.raffleEnd = uint32(_raffleEnd);
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
