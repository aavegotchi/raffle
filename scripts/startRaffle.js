/* global ethers hre */

const { deployContracts } = require('./deploy.js')

async function main() {
  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()
  let stakeAddress
  let prizeAddress
  let rafflesAddress
  let vouchersContract
  let rafflesContract
  if (hre.network.name === 'kovan') {
    //;[prizeAddress, rafflesAddress] = await deployContracts()
    rafflesAddress = '0x1e9Aa7d76A69271660fB43199ad69B2e65d48A63'
    prizeAddress = '0x003aA7990A99d50364F7560076Ea5Bb3Ffe95612'
    stakeAddress = '0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd'
    vouchersContract = await ethers.getContractAt('VouchersContract', prizeAddress)
    rafflesContract = await ethers.getContractAt('RafflesContract', rafflesAddress)
  } else if (hre.network.name === 'hardhat') {
    ;[prizeAddress, rafflesAddress] = await deployContracts()
    stakeAddress = '0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd'
    vouchersContract = await ethers.getContractAt('VouchersContract', prizeAddress)
    rafflesContract = await ethers.getContractAt('RafflesContract', rafflesAddress)
  } else {
    throw Error('No network settings for ' + hre.network.name)
  }

  const prizeValues = []
  const raffleItems = []
  let prizeId = 0
  let prizeValue
  for (let stakeId = 0; stakeId < 6; stakeId++) {
    if (stakeId === 0) {
      prizeValue = 1000
    } else if (stakeId === 1) {
      prizeValue = 500
    } else if (stakeId === 2) {
      prizeValue = 300
    } else if (stakeId === 3) {
      prizeValue = 150
    } else if (stakeId === 4) {
      prizeValue = 50
    } else if (stakeId === 5) {
      prizeValue = 5
    }
    let jLength
    if (stakeId === 5) {
      jLength = 2
    } else {
      jLength = 3
    }
    const prizeItems = []
    raffleItems.push({
      stakeAddress: stakeAddress,
      stakeId: stakeId,
      rafflePrizes: prizeItems
    })
    for (let j = 0; j < jLength; j++) {
      prizeValues.push(prizeValue)
      prizeItems.push({
        prizeAddress: prizeAddress,
        prizeId: prizeId,
        prizeValue: prizeValue
      })
      prizeId++
    }
  }

  // First raffle, 3 days
  // await vouchersContract.createVoucherTypes(account, prizeValues, '0x')
  // console.log(prizeValues)

  const supplies = await vouchersContract.totalSupplies()
  console.log('supplies:', supplies)


  const ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
  await vouchersContract.mintVouchers(account, ids, prizeValues, '0x')
  console.log('Created voucher types and minted vouchers')
  await vouchersContract.setApprovalForAll(rafflesContract.address, true)
  // console.log('Approved raffleContract to transfer vouchers')
  const now = new Date()
  const secondsSinceEpoch = Math.round(now.getTime() / 1000)
  // const aWeek = 604800 * 2// 604800 == 1 week
  const threeDays = 4800
  console.log(JSON.stringify(raffleItems, null, 2))
  console.log('Execute startRaffle function')
  await rafflesContract.startRaffle(secondsSinceEpoch + threeDays, raffleItems)
  console.log('Started raffle')
  console.log('Here are the raffle items:')
  console.log(JSON.stringify(raffleItems, null, 2))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
