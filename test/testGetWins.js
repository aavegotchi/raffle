/* global ethers, describe, it, before */

const { expect } = require('chai')
const truffleAssert = require('truffle-assertions')
const { startRaffle } = require('../scripts/startRaffle.js')
const { getWinsInfo, getWins } = require('../scripts/getWins.js')

describe('Raffle', function () {
  let account
  let bob
  let bobAddress
  let casperAddress
  let caasper
  let wearableVouchersContract
  let aavePrizesContract
  let rafflesContract
  let raffleAddress
  let voucherAddress
  let ticketsAddress
  let ticketsContract
  let bobRafflesContract
  let casperRafflesContract
  let linkContract

  before(async function () {
    const accounts = await ethers.getSigners()
    account = await accounts[0].getAddress()
    bob = await accounts[1]
    bobAddress = await accounts[1].getAddress()
    caasper = await accounts[2]
    casperAddress = await accounts[2].getAddress()

    console.log('Account: ' + account)
    console.log('---')

    // Kovan VRF Coordinator: 0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9
    // Kovan LINK : 0xa36085F69e2889c224210F603D836748e7dC0088
    // Kovan Key Hash: 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4

    ;[
      wearableVouchersContract,
      aavePrizesContract,
      rafflesContract,
      ticketsContract,
      linkContract
    ] = await startRaffle()
    ticketsAddress = ticketsContract.address
    raffleAddress = rafflesContract.address

    bobRafflesContract = rafflesContract.connect(bob)
    casperRafflesContract = rafflesContract.connect(caasper)

    // const VoucherContract = await ethers.getContractFactory('VouchersContract')
    // tickets = await VoucherContract.deploy(account)
    // await tickets.deployed()
    // ticketsAddress = tickets.address
  })

  it('🙆‍♂️  Bob and Caasper should have 100 of each ticket', async function () {
    await ticketsContract.createVoucherTypes(account, [100, 100, 100, 100, 100, 100], [])
    await ticketsContract.mintVouchers(bobAddress, [0, 1, 2, 3, 4, 5], [100, 100, 100, 100, 100, 100], [])
    await ticketsContract.mintVouchers(casperAddress, [0, 1, 2, 3, 4, 5], [100, 100, 100, 100, 100, 100], [])
    const balancesBob = await ticketsContract.balanceOfAll(bobAddress)
    const balancesCaasper = await ticketsContract.balanceOfAll(bobAddress)
    expect(balancesBob[0]).to.equal(100)
    expect(balancesCaasper[1]).to.equal(100)
  })

  it('🙆‍♂️  Should approve tickets to be transferred', async function () {
    const bobtickets = ticketsContract.connect(bob)
    const caaspertickets = ticketsContract.connect(caasper)
    await bobtickets.setApprovalForAll(raffleAddress, true)
    await caaspertickets.setApprovalForAll(raffleAddress, true)
    await ticketsContract.setApprovalForAll(raffleAddress, true)
    const bobApproved = await ticketsContract.isApprovedForAll(bobAddress, raffleAddress)
    const caasperApproved = await ticketsContract.isApprovedForAll(casperAddress, raffleAddress)
    expect(bobApproved).to.equal(true)
    expect(caasperApproved).to.equal(true)
  })

  it('🙆‍♂️  Should enter tickets to raffle', async function () {
    const ticketItems = [
      // I'm staking twice, but since it's the same account
      [ticketsAddress, 0, 20],
      [ticketsAddress, 1, 20],
      [ticketsAddress, 2, 20],
      [ticketsAddress, 3, 100],
      [ticketsAddress, 4, 100],
      [ticketsAddress, 5, 100]
      // [voucherAddress, 2, 1],
    ]

    const bobItems = [
      // I'm staking twice, but since it's the same account
      [ticketsAddress, 0, 100],
      [ticketsAddress, 1, 100],
      [ticketsAddress, 2, 100],
      [ticketsAddress, 3, 100],
      [ticketsAddress, 4, 60]
      // [voucherAddress, 2, 1],
    ]

    const caasperItems = [
      // I'm staking twice, but since it's the same account
      [ticketsAddress, 0, 100],
      [ticketsAddress, 1, 100],
      [ticketsAddress, 2, 100],
      [ticketsAddress, 3, 100],
      [ticketsAddress, 4, 100],
      [ticketsAddress, 5, 100]
    ]

    await rafflesContract.enterTickets(1, ticketItems)
    console.log('got here')
    await bobRafflesContract.enterTickets(1, bobItems)
    console.log('now here')
    await casperRafflesContract.enterTickets(1, caasperItems)
  })

  it('🙆‍♂️  Should draw random number for each prize', async function () {
    ethers.provider.send('evm_increaseTime', [86401 * 4])

    let raffleInfo = await rafflesContract.raffleInfo('1')
    // Status is not drawn (0)
    expect(raffleInfo.randomNumber_).to.equal(0)

    await rafflesContract.drawRandomNumber('1')

    raffleInfo = await rafflesContract.raffleInfo('1')
    // Status is pending (1)
    expect(raffleInfo.randomNumber_).to.equal(1)

    // Bob cannot call the drawRandomNumber function while pending because he isn't contractOwner
    await truffleAssert.reverts(bobRafflesContract.drawRandomNumber('1'), 'Raffle: Random number is pending')

    const requestId = await linkContract.getRequestId()
    const randomness = ethers.utils.keccak256(new Date().getMilliseconds())
    await rafflesContract.rawFulfillRandomness(requestId, randomness)

    raffleInfo = await rafflesContract.raffleInfo('1')
  })

  // function formatWinners (winners) {
  //   const w = []
  //   for (const winner of winners) {
  //     const nums = []
  //     for (const num of winner.winningPrizeNumbers) {
  //       nums.push(num.toString())
  //     }
  //     w.push({
  //       entrant: winner.entrant,
  //       claimed: winner.claimed,
  //       entryIndex: winner.entryIndex.toString(),
  //       raffleItemIndex: winner.raffleItemIndex.toString(),
  //       raffleItemPrizeIndex: winner.raffleItemPrizeIndex.toString(),
  //       winningPrizeNumbers: nums,
  //       prizeId: winner.prizeId.toString()
  //     })
  //   }
  //   return w
  // }

  it('🙆‍♂️  Should get wins for each person and claim them', async function () {
    let totalPrizes = 0
    console.log('----------------------------------------------------')
    let winsInfo = await getWinsInfo(rafflesContract, 1, account)
    // console.log(winsInfo)
    // const wins2Info = await rafflesContract['winners(uint256,address[])']('1', [account])
    // console.log('Compare to contract version: ---------------||||||||||||||||||||||')
    // console.log(JSON.stringify(wins2Info, null, 2))
    // console.log(formatWinners(wins2Info))
    let wins = getWins(winsInfo)
    // console.log(JSON.stringify(wins, null, 4))
    // console.log(wins)
    await rafflesContract.claimPrize(1, account, wins)
    let won = 0
    for (const entry of winsInfo) {
      totalPrizes += entry.winningPrizeNumbers.length
      won += entry.winningPrizeNumbers.length
    }
    console.log('Person won: ' + won)
    console.log('----------------------------------------------------')
    winsInfo = await getWinsInfo(rafflesContract, 1, bobAddress)
    // console.log(winsInfo)
    wins = getWins(winsInfo)
    await bobRafflesContract.claimPrize(1, bobAddress, wins)
    // console.log(wins)
    won = 0
    for (const entry of winsInfo) {
      totalPrizes += entry.winningPrizeNumbers.length
      won += entry.winningPrizeNumbers.length
    }
    console.log('Person won: ' + won)
    console.log('----------------------------------------------------')
    winsInfo = await getWinsInfo(rafflesContract, 1, casperAddress)
    // console.log(winsInfo)
    wins = getWins(winsInfo)
    // console.log(wins)
    await casperRafflesContract.claimPrize(1, casperAddress, wins)
    won = 0
    for (const entry of winsInfo) {
      totalPrizes += entry.winningPrizeNumbers.length
      won += entry.winningPrizeNumbers.length
    }
    console.log('Person won: ' + won)
    console.log('----------------------------------------------------')

    console.log('Total prizes:' + totalPrizes)

    // const winners = await rafflesContract['winners(uint256)']('1')
    // let totalPrizes = 0

    // winners.forEach((obj) => {
    //   totalPrizes = totalPrizes + Number(obj.winningPrizeNumbers.length)
    //   expect(obj.claimed).to.equal(false)
    // })

    // expect(Number(raffleInfo.randomNumber_)).to.greaterThan(1)
    // expect(totalPrizes).to.equal(68)
  }).timeout(40000)
})
