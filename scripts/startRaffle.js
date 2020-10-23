/* global ethers hre */

const { deployContracts } = require('./deploy.js')

async function main () {
  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()
  let stakeAddress
  let prizeAddress
  let rafflesAddress
  let vouchersContract
  let rafflesContract
  if (hre.network.name === 'kovan') {
    stakeAddress = '0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd'
    vouchersContract = await ethers.getContractAt('VouchersContract', '')
    rafflesContract = await ethers.getContractAt('RafflesContract', '')
  } else if (hre.network.name === 'hardhat') {
    ;[prizeAddress, rafflesAddress] = await deployContracts()
    stakeAddress = '0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd'
    vouchersContract = await ethers.getContractAt('VouchersContract', prizeAddress)
    rafflesContract = await ethers.getContractAt('RafflesContract', rafflesAddress)
  } else {
    throw Error('No network settings for ' + hre.network.name)
  }

  await vouchersContract.createVoucherTypes(account, [1000, 1000, 1000, 500, 500, 500, 300, 300, 300, 150, 150, 150, 50, 50, 50, 5, 5], '0x')
  console.log('Created voucher types and minted vouchers')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
