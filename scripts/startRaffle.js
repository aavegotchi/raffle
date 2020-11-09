/* global ethers hre */

const { deployContracts } = require('./deploy.js')

async function main () {
  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()
  let ticketAddress
  let prizeAddress
  let rafflesAddress
  let vouchersContract
  let rafflesContract
  let vrfCoordinator
  let linkAddress
  let keyHash
  let fee
  if (hre.network.name === 'kovan') {
    vrfCoordinator = '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9'
    linkAddress = '0xa36085F69e2889c224210F603D836748e7dC0088'
    keyHash = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'
    fee = ethers.utils.parseEther('0.1')

    ;[prizeAddress, rafflesAddress] = await deployContracts(vrfCoordinator, linkAddress, keyHash, fee)
    // rafflesAddress = '0x45944862b6274ea45fbc6063996112d41e4c2e49'
    // prizeAddress = '0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd'
    //  rafflesAddress = '0x1e9Aa7d76A69271660fB43199ad69B2e65d48A63'
    // prizeAddress = '0x003aA7990A99d50364F7560076Ea5Bb3Ffe95612'

    // Kovan VRF Coordinator: 0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9
    // Kovan LINK : 0xa36085F69e2889c224210F603D836748e7dC0088
    // Kovan Key Hash: 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4
    ticketAddress = '0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd'
    vouchersContract = await ethers.getContractAt('VouchersContract', prizeAddress)
    rafflesContract = await ethers.getContractAt('RafflesContract', rafflesAddress)
  } else if (hre.network.name === 'mainnet') {
    vrfCoordinator = '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952'
    linkAddress = '0x514910771AF9Ca656af840dff83E8264EcF986CA'
    keyHash = '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445'
    fee = ethers.utils.parseEther('2')

    ;[prizeAddress, rafflesAddress] = await deployContracts(vrfCoordinator, linkAddress, keyHash, fee)
    ticketAddress = '0x93ea6ec350ace7473f7694d43dec2726a515e31a'
    vouchersContract = await ethers.getContractAt('VouchersContract', prizeAddress)
    rafflesContract = await ethers.getContractAt('RafflesContract', rafflesAddress)
  } else if (hre.network.name === 'hardhat') {
    vrfCoordinator = '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9'
    linkAddress = '0xa36085F69e2889c224210F603D836748e7dC0088'
    keyHash = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'
    fee = ethers.utils.parseEther('0.1')
    ;[prizeAddress, rafflesAddress] = await deployContracts(vrfCoordinator, linkAddress, keyHash, fee)

    ticketAddress = '0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd'
    vouchersContract = await ethers.getContractAt('VouchersContract', prizeAddress)
    rafflesContract = await ethers.getContractAt('RafflesContract', rafflesAddress)
  } else {
    throw Error('No network settings for ' + hre.network.name)
  }

  const prizeQuantitys = []
  const raffleItems = []
  let prizeId = 0
  let prizeQuantity
  for (let ticketId = 0; ticketId < 6; ticketId++) {
    if (ticketId === 0) {
      prizeQuantity = 1000
    } else if (ticketId === 1) {
      prizeQuantity = 500
    } else if (ticketId === 2) {
      prizeQuantity = 300
    } else if (ticketId === 3) {
      prizeQuantity = 150
    } else if (ticketId === 4) {
      prizeQuantity = 50
    } else if (ticketId === 5) {
      prizeQuantity = 5
    }
    let jLength
    if (ticketId === 5) {
      jLength = 2
    } else {
      jLength = 3
    }
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
  }
  let tx
  let totalGasUsed = 0
  // First raffle, 3 days
  tx = await vouchersContract.createVoucherTypes(account, prizeQuantitys, '0x')
  let receipt = await tx.wait()
  console.log('Vouchers create gas used: ', receipt.gasUsed.toString())
  totalGasUsed = receipt.gasUsed
  // console.log(prizeQuantitys)

  // const supplies = await vouchersContract.totalSupplies()
  // console.log('supplies:', supplies)

  // const ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
  // await vouchersContract.mintVouchers(account, ids, prizeQuantitys, '0x')
  console.log('Created voucher types and minted vouchers')
  tx = await vouchersContract.setApprovalForAll(rafflesContract.address, true)
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
  const time = 3600 /* one hour */ * 72
  console.log('Execute startRaffle function')
  // console.log(raffleItems)
  tx = await rafflesContract.startRaffle(time, raffleItems)
  receipt = await tx.wait()
  console.log('Started raffle. Gas used: ', receipt.gasUsed.toString())
  totalGasUsed = totalGasUsed.add(receipt.gasUsed)
  console.log('Total gas used: ', totalGasUsed.toString())
  // console.log('Here are the raffle items:')
  // console.log(JSON.stringify(raffleItems, null, 2))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
