/* global ethers hre */

const { deployContracts } = require('./deploy.js')

async function main () {
  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()
  let ticketAddress
  let ticketsContract
  let prizeAddress
  let aavePrizesAddress
  let rafflesAddress
  let wearableVouchersContract
  let aavePrizesContract
  let rafflesContract
  let linkContract
  let vrfCoordinator
  let linkAddress
  let keyHash
  let fee
  let time
  if (hre.network.name === 'kovan') {
    vrfCoordinator = '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9'
    linkAddress = '0xa36085F69e2889c224210F603D836748e7dC0088'
    keyHash = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'
    fee = ethers.utils.parseEther('0.1')
    // prizeAddress = '0x0f0F109c211DAa45C8fD33e20bc8d3C45bE10b15'

    const VouchersContract = await ethers.getContractFactory('VouchersContract')
    wearableVouchersContract = await VouchersContract.deploy(account)
    console.log('Deployed WearableVouchersContract:' + wearableVouchersContract.address)
    prizeAddress = wearableVouchersContract.address
    const tx = await wearableVouchersContract.createVoucherTypes(account, [1000, 1000, 1000, 500, 500, 500, 300, 300, 300, 150, 150, 150, 50, 50, 50, 5, 5], '0x')
    await tx.wait()

    ;[aavePrizesAddress, rafflesAddress] = await deployContracts(vrfCoordinator, linkAddress, keyHash, fee)
    // rafflesAddress = '0x45944862b6274ea45fbc6063996112d41e4c2e49'
    // prizeAddress = '0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd'
    //  rafflesAddress = '0x1e9Aa7d76A69271660fB43199ad69B2e65d48A63'
    // prizeAddress = '0x003aA7990A99d50364F7560076Ea5Bb3Ffe95612'

    // Kovan VRF Coordinator: 0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9
    // Kovan LINK : 0xa36085F69e2889c224210F603D836748e7dC0088
    // Kovan Key Hash: 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4
    ticketAddress = '0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd'
    wearableVouchersContract = await ethers.getContractAt('VouchersContract', prizeAddress)
    aavePrizesContract = await ethers.getContractAt('VouchersContract', aavePrizesAddress)
    rafflesContract = await ethers.getContractAt('RafflesContract', rafflesAddress)
    time = 3600 /* one hour */ * 8
  } else if (hre.network.name === 'mainnet') {
    vrfCoordinator = '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952'
    linkAddress = '0x514910771AF9Ca656af840dff83E8264EcF986CA'
    keyHash = '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445'
    fee = ethers.utils.parseEther('2')
    prizeAddress = '0xe54891774EED9277236bac10d82788aee0Aed313'

    ;[aavePrizesAddress, rafflesAddress] = await deployContracts(vrfCoordinator, linkAddress, keyHash, fee)
    ticketAddress = '0x93ea6ec350ace7473f7694d43dec2726a515e31a'
    wearableVouchersContract = await ethers.getContractAt('VouchersContract', prizeAddress)
    aavePrizesContract = await ethers.getContractAt('VouchersContract', aavePrizesAddress)
    rafflesContract = await ethers.getContractAt('RafflesContract', rafflesAddress)
    time = 3600 /* one hour */ * 72
  } else if (hre.network.name === 'hardhat') {
    vrfCoordinator = account // '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9'
    const LinkTokenMock = await ethers.getContractFactory('LinkTokenMock')
    linkContract = await LinkTokenMock.deploy()
    await linkContract.deployed()
    // const link = linkContract.address
    linkAddress = linkContract.address
    keyHash = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'
    fee = ethers.utils.parseEther('0.1')
    const VouchersContract = await ethers.getContractFactory('VouchersContract')
    wearableVouchersContract = await VouchersContract.deploy(account)
    console.log('Deployed WearableVouchersContract:' + wearableVouchersContract.address)
    prizeAddress = wearableVouchersContract.address
    const tx = await wearableVouchersContract.createVoucherTypes(account, [1000, 1000, 1000, 500, 500, 500, 300, 300, 300, 150, 150, 150, 50, 50, 50, 5, 5], '0x')
    await tx.wait()

    ;[aavePrizesAddress, rafflesAddress] = await deployContracts(vrfCoordinator, linkAddress, keyHash, fee)

    ticketsContract = await VouchersContract.deploy(account)
    ticketAddress = ticketsContract.address
    wearableVouchersContract = await ethers.getContractAt('VouchersContract', prizeAddress)
    aavePrizesContract = await ethers.getContractAt('VouchersContract', aavePrizesAddress)
    rafflesContract = await ethers.getContractAt('RafflesContract', rafflesAddress)
    time = 3600 /* one hour */ * 72
  } else {
    throw Error('No network settings for ' + hre.network.name)
  }

  const prizeQuantitys = []
  const raffleItems = []
  let prizeId = 17
  let prizeQuantity
  // for (let ticketId = 0; ticketId < 6; ticketId++) {
  //   if (ticketId === 0) {
  //     prizeQuantity = 10
  //   } else if (ticketId === 1) {
  //     prizeQuantity = 5
  //   } else if (ticketId === 2) {
  //     prizeQuantity = 2
  //   } else if (ticketId === 3) {
  //     prizeQuantity = 1
  //   } else if (ticketId === 4) {
  //     prizeQuantity = 1
  //   } else if (ticketId === 5) {
  //     prizeQuantity = 1
  //   }
  //   const jLength = 3
  //   const prizeItems = []
  //   raffleItems.push({
  //     ticketAddress: ticketAddress,
  //     ticketId: ticketId,
  //     raffleItemPrizes: prizeItems
  //   })
  //   for (let j = 0; j < jLength; j++) {
  //     prizeQuantitys.push(prizeQuantity)
  //     prizeItems.push({
  //       prizeAddress: prizeAddress,
  //       prizeId: prizeId,
  //       prizeQuantity: prizeQuantity
  //     })
  //     prizeId++
  //   }
  //   if (ticketId === 3) {
  //     prizeItems.push({
  //       prizeAddress: aavePrizesAddress,
  //       prizeId: 0,
  //       prizeQuantity: 200
  //     })
  //   } else if (ticketId === 4) {
  //     prizeItems.push({
  //       prizeAddress: aavePrizesAddress,
  //       prizeId: 1,
  //       prizeQuantity: 20
  //     })
  //   } else if (ticketId === 5) {
  //     prizeItems.push({
  //       prizeAddress: aavePrizesAddress,
  //       prizeId: 2,
  //       prizeQuantity: 2
  //     })
  //   }
  // }
  for (let ticketId = 0; ticketId < 6; ticketId++) {
    if (ticketId === 0) {
      prizeQuantity = 1000
    } else if (ticketId === 1) {
      prizeQuantity = 500
    } else if (ticketId === 2) {
      prizeQuantity = 250
    } else if (ticketId === 3) {
      prizeQuantity = 100
    } else if (ticketId === 4) {
      prizeQuantity = 50
    } else if (ticketId === 5) {
      prizeQuantity = 5
    }
    const jLength = 3
    const prizeItems = []
    raffleItems.push({
      ticketAddress: ticketAddress,
      ticketId: ticketId,
      raffleItemPrizes: prizeItems
    })
    for (let j = 0; j < jLength; j++) {
      prizeQuantitys.push(prizeQuantity)
      prizeItems.push({
        prizeAddress: prizeAddress,
        prizeId: prizeId,
        prizeQuantity: prizeQuantity
      })
      prizeId++
    }
    if (ticketId === 3) {
      prizeItems.push({
        prizeAddress: aavePrizesAddress,
        prizeId: 0,
        prizeQuantity: 200
      })
    } else if (ticketId === 4) {
      prizeItems.push({
        prizeAddress: aavePrizesAddress,
        prizeId: 1,
        prizeQuantity: 20
      })
    } else if (ticketId === 5) {
      prizeItems.push({
        prizeAddress: aavePrizesAddress,
        prizeId: 2,
        prizeQuantity: 2
      })
    }
  }
  let tx
  let totalGasUsed = 0
  // First raffle, 3 days
  console.log('Create new wearable voucher types')
  tx = await wearableVouchersContract.createVoucherTypes(account, prizeQuantitys, '0x')
  let receipt = await tx.wait()
  console.log('Vouchers create gas used: ', receipt.gasUsed.toString())
  totalGasUsed = receipt.gasUsed

  console.log('Create new aave prize types')
  tx = await aavePrizesContract.createVoucherTypes(account, [200, 20, 2], '0x')
  receipt = await tx.wait()
  console.log('AavePrizes create gas used: ', receipt.gasUsed.toString())
  totalGasUsed = receipt.gasUsed

  // console.log(prizeQuantitys)

  // const supplies = await vouchersContract.totalSupplies()
  // console.log('supplies:', supplies)

  // const ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
  // await vouchersContract.mintVouchers(account, ids, prizeQuantitys, '0x')
  console.log('Approve rafflesContract for wearable vouchers')
  tx = await wearableVouchersContract.setApprovalForAll(rafflesContract.address, true)
  receipt = await tx.wait()
  console.log('Set approval gas used: ', receipt.gasUsed.toString())
  totalGasUsed = totalGasUsed.add(receipt.gasUsed)

  console.log('Approve rafflesContract for aave prizes')
  tx = await aavePrizesContract.setApprovalForAll(rafflesContract.address, true)
  receipt = await tx.wait()
  console.log('Set approval gas used: ', receipt.gasUsed.toString())
  totalGasUsed = totalGasUsed.add(receipt.gasUsed)

  // console.log('Approved raffleContract to transfer vouchers')
  // const now = new Date()
  // const secondsSinceEpoch = Math.round(now.getTime() / 1000)
  // const aWeek = 604800 * 2// 604800 == 1 week
  // const threeDays = 3600
  // 86400 = 1 day
  // const threeDays = 86400 * 3
  // console.log(JSON.stringify(raffleItems, null, 2))
  // const time = 3660 // one hour an one minute

  console.log('Execute startRaffle function')
  // console.log(raffleItems)
  tx = await rafflesContract.startRaffle(time, raffleItems)
  receipt = await tx.wait()
  console.log('Started raffle. Gas used: ', receipt.gasUsed.toString())
  totalGasUsed = totalGasUsed.add(receipt.gasUsed)
  console.log('Total gas used: ', totalGasUsed.toString())
  // console.log('Here are the raffle items:')
  // console.log(JSON.stringify(raffleItems, null, 2))
  return [
    wearableVouchersContract,
    aavePrizesContract,
    rafflesContract,
    ticketsContract,
    linkContract
  ]
}

exports.startRaffle = main

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
