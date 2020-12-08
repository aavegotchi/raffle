# Raffle and Vouchers

### Tests

1. Clone this project.
2. Run `npm install` to install what is needed.
3. To run the tests run `npx hardhat test`

Tests are in the `test/test.js` file.

The `getWins` Javascript function in the `test/test.js` file is used to process the return value of the `winners` function in the `RafflesContract.sol` contract.  The return value of `getWins` is fed into the `claimPrizes` function in the `RafflesContract.sol` contract. The `claimPrizes` function verifies the wins and then transfers the prizes to the winner.

### Mainnet Addresses
- RaffleContract: 0x144d196Bf99a4EcA33aFE036Da577d7D66583DB6
- VoucherContract: 0xe54891774EED9277236bac10d82788aee0Aed313


Kovan addresses
- WearableVouchersContract:0x9d038aed3BEDbb143B4F3414Af6119231b77ACFC
- AavePrizesContract:0xe3b94c7E3950C4a47FC88c41EE3Ca1359806d646
- RaffleContract:0xaAF48D4798e987DAE6f315C0d28bE88aBeF1e807
- Old raffle: 0x705F32B7D678eE71085ed11ddcba7378367f1582
- Old voucher: 0x0f0F109c211DAa45C8fD33e20bc8d3C45bE10b15
- Old VouchersContract: 0xddE4bc55fe26796B7fDa196afD132e2ca4A001ac
- Old RaffleContract: 0xc7812BFC945855Bd040982a66bDc3684e7CaFaD0
- Old Deployed VouchersContract: 0x1aec38e26b5c1ff7CFf788b8eb0054da1a8Ba841
- Old Deployed RaffleContract: 0xa127CCDaBa75F3c1bA6223127B290121e99Dd097
