# Raffle and Vouchers

### Tests

1. Clone this project.
2. Run `npm install` to install what is needed.
3. To run the tests run `npx hardhat test`

Tests are in the `test/test.js` file.

The `getWins` Javascript function in the `test/test.js` file is used to process the return value of the `winners` function in the `RafflesContract.sol` contract.  The return value of `getWins` is fed into the `claimPrizes` function in the `RafflesContract.sol` contract. The `claimPrizes` function verifies the wins and then transfers the prizes to the winner.

## Raffle contracts bug bounty — max prize 10,000 DAI
Just six days left until our first FRENS Raffle begins on Nov. 10! 

Find vulnerabilities or bugs within the Raffle or Voucher contracts that can lead to contracts being frozen, tickets being improperly withdraw, or any other non-ideal behavior of the RaffleContract.sol and VoucherContract.sol contracts.

We have categorized the rewards into four rough categories:
1. 100 to 1000 DAI: Minor bugs that don’t affect the Raffle but should be fixed
1. 1000 to 2000 DAI: Medium-level bugs that impact execution of the Raffle, but do not compromise it
1. 2000 to 5000 DAI: Severe vulnerabilities that compromise the integrity and fairness of the Raffle
1. 5000 to 10,000 DAI: Major exploits which freeze the contract, steal user tickets, or otherwise result in lost user assets

Found an issue? Contact @coderdannn via Discord, Telegram, or Twitter, or simply create an issue on Github.

### Kown Issue

It is known that if one person wins a great deal of prizes, for example 5,000 prizes, then the `claimPrize` function may cost too much gas to execute, therefore locking the user's prizes in the contract. However this is impractical for our use. Our first raffle will have 6,010 prizes. If only 10 people enter tickets into the raffle that is about 601 prizes per person. We expect many more people than 10 to enter tickets in the raffle.

Kovan addresses
- raffle: 0x705F32B7D678eE71085ed11ddcba7378367f1582
- voucher: 0x0f0F109c211DAa45C8fD33e20bc8d3C45bE10b15
- Old VouchersContract: 0xddE4bc55fe26796B7fDa196afD132e2ca4A001ac
- Old RaffleContract: 0xc7812BFC945855Bd040982a66bDc3684e7CaFaD0
- Old Deployed VouchersContract: 0x1aec38e26b5c1ff7CFf788b8eb0054da1a8Ba841
- Old Deployed RaffleContract: 0xa127CCDaBa75F3c1bA6223127B290121e99Dd097
