/* global ethers, describe, it, before */

const { expect } = require('chai')
const truffleAssert = require('truffle-assertions')

function getWins (entrantAddress, winners) {
  const wins = []
  let lastValue = -1
  let prizeWin
  for (const winner of winners) {
    if (winner.entrant === entrantAddress) {
      const winningPrizeNumbers = [...winner.winningPrizeNumbers]
      winningPrizeNumbers.reverse()
      if (winner.userEntryIndex.eq(lastValue)) {
        prizeWin.unshift([winner.raffleItemPrizeIndex, winningPrizeNumbers])
      } else {
        prizeWin = [[winner.raffleItemPrizeIndex, winningPrizeNumbers]]
        wins.unshift([
          winner.userEntryIndex,
          prizeWin
        ])
      }
      lastValue = winner.userEntryIndex
    }
  }
  return wins
}

describe('Raffle', function () {
  let account
  let bob
  let bobAddress
  let casperAddress
  let caasper
  let raffle
  let raffleAddress
  let vouchers
  let tickets
  let voucherAddress
  let ticketsAddress
  let bobRaffle
  let casperRaffle
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

    const vrfCoordinator = account
    const keyHash = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'

    const LinkTokenMock = await ethers.getContractFactory('LinkTokenMock')
    linkContract = await LinkTokenMock.deploy()
    await linkContract.deployed()
    const link = linkContract.address

    const RaffleContract = await ethers.getContractFactory('RafflesContract')
    raffle = await RaffleContract.deploy(account, vrfCoordinator, link, keyHash)
    await raffle.deployed()
    raffleAddress = raffle.address

    const VoucherContract = await ethers.getContractFactory('VouchersContract')
    vouchers = await VoucherContract.deploy(account)
    await vouchers.deployed()
    voucherAddress = vouchers.address

    tickets = await VoucherContract.deploy(account)
    await tickets.deployed()
    ticketsAddress = tickets.address

    await vouchers.createVoucherTypes(account, ['5', '6', '7', '8', '9', '10', '11', '12'], [])

    bobRaffle = raffle.connect(bob)
    casperRaffle = raffle.connect(caasper)
  })

  it('🙆‍♂️  Owner Should have 5 of each ticket', async function () {
    const balances = await vouchers.balanceOfAll(account)
    const totalSupply = await vouchers.totalSupply(0)
    expect(balances[0]).to.equal(5)
    expect(balances.length).to.equal(8)
    expect(totalSupply).to.equal(5)
  })

  it('🙆‍♂️  Bob and Caasper should have 10 of each ticket', async function () {
    await tickets.createVoucherTypes(account, ['10', '10', '10'], [])
    await tickets.mintVouchers(bobAddress, ['0', '1', '2'], ['10', '10', '10'], [])
    await tickets.mintVouchers(casperAddress, ['0', '1', '2'], ['10', '10', '10'], [])
    const balancesBob = await tickets.balanceOfAll(bobAddress)
    const balancesCaasper = await tickets.balanceOfAll(bobAddress)
    expect(balancesBob[0]).to.equal(10)
    expect(balancesCaasper[1]).to.equal(10)
  })

  it('🙆‍♂️  Only contract owner can start raffle', async function () {
    const items = [[ticketsAddress, '0', [[voucherAddress, '0', '5']]]]
    const raffleEndTime = Number((Date.now() / 1000).toFixed()) + 86400
    await truffleAssert.reverts(bobRaffle.startRaffle(raffleEndTime, items), 'Raffle: Must be contract owner')
  })

  it('🙅‍♀️  Cannot start a raffle before now', async function () {
    const items = [[ticketsAddress, '0', [[voucherAddress, '0', '5']]]]
    const raffleEndTime = Number((Date.now() / 1000).toFixed()) - 86400
    await truffleAssert.reverts(raffle.startRaffle(raffleEndTime, items), 'Raffle: _raffleEnd must be greater than 1 hour')
  })

  it('🙆‍♂️  Should start raffle', async function () {
    const items = [
      [ticketsAddress, '0', [[voucherAddress, '0', '5'], [voucherAddress, '1', '6'], [voucherAddress, '2', '7']]],
      [ticketsAddress, '1', [[voucherAddress, '3', '8'], [voucherAddress, '4', '9'], [voucherAddress, '5', '10']]],
      [ticketsAddress, '2', [[voucherAddress, '6', '11'], [voucherAddress, '7', '12']]]
    ]

    // Approve vouchers to transfer
    await vouchers.setApprovalForAll(raffle.address, true)
    await tickets.setApprovalForAll(raffle.address, true)

    const raffleEndTime = Number((Date.now() / 1000).toFixed()) + 86400
    await raffle.startRaffle(raffleEndTime, items)
    const info = await raffle.raffleInfo('0')

    const raffleEnd = Number(info.raffleEnd_)

    expect(info.numberChosen_).to.equal(false)
    expect(raffleEnd).to.greaterThan(Number((Date.now() / 1000).toFixed()))

    expect(info.raffleItems_.length).to.equal(3)

    // Test openRaffles function
    const raffles = await raffle.getRaffles()
    expect(raffles.length).to.equal(1)
    expect(raffles[0].isOpen).to.equal(true)
  })

  it('🙅‍♀️  Cannot enter more tickets than they own', async function () {
    const ticketItems = [
      [ticketsAddress, 0, 11],
      [ticketsAddress, 1, 5]
    ]
    await truffleAssert.reverts(raffle.enterTickets('0', ticketItems), 'Vouchers: _value greater than balance')
  })

  it('🙅‍♀️  Cannot enter tickets to nonexistent raffle', async function () {
    const ticketItems = [[ticketsAddress, 1, 5]]
    await truffleAssert.reverts(raffle.enterTickets('1', ticketItems), 'Raffle: Raffle does not exist')
  })

  it('🙅‍♀️  Cannot enter zero tickets', async function () {
    const ticketItems = [
      [ticketsAddress, 0, 0]
    ]
    await truffleAssert.reverts(raffle.enterTickets('0', ticketItems), 'Ticket quantity cannot be zero')
  })

  it('🙅‍♀️  Cannot enter raffle items that dont exist', async function () {
    const ticketItems = [
      [ticketsAddress, 6, 1]
    ]
    await truffleAssert.reverts(raffle.enterTickets('0', ticketItems), 'Raffle: Raffle item doesn\'t exist for this raffle')
  })

  it('🙆‍♂️  Should approve tickets to be transferred', async function () {
    const bobtickets = tickets.connect(bob)
    const caaspertickets = tickets.connect(caasper)
    await bobtickets.setApprovalForAll(raffleAddress, true)
    await caaspertickets.setApprovalForAll(raffleAddress, true)
    const bobApproved = await tickets.isApprovedForAll(bobAddress, raffleAddress)
    const caasperApproved = await tickets.isApprovedForAll(casperAddress, raffleAddress)
    expect(bobApproved).to.equal(true)
    expect(caasperApproved).to.equal(true)
  })

  it('🙆‍♂️  Should enter tickets to raffle', async function () {
    const ticketItems = [
      // I'm staking twice, but since it's the same account
      [ticketsAddress, 0, 1],
      [ticketsAddress, 0, 1],
      [ticketsAddress, 0, 5],
      [ticketsAddress, 1, 5]
      // [voucherAddress, 2, 1],
    ]

    const bobItems = [
      // I'm staking twice, but since it's the same account
      [ticketsAddress, 2, 10],
      [ticketsAddress, 1, 2],
      [ticketsAddress, 1, 1],
      [ticketsAddress, 1, 1]
      // [voucherAddress, 2, 1],
    ]

    const caasperItems = [
      // I'm staking twice, but since it's the same account
      [ticketsAddress, 0, 10],
      [ticketsAddress, 1, 5],
      [ticketsAddress, 2, 10],
      [ticketsAddress, 1, 5]
    ]

    await raffle.enterTickets('0', ticketItems)
    await bobRaffle.enterTickets('0', bobItems)
    await casperRaffle.enterTickets('0', caasperItems)

    const entrantStats = await raffle.ticketStats('0')
    entrantStats.forEach((ticketStats) => {
      const numberOfEntrants = Number(ticketStats.numberOfEntrants)
      const totalEntered = Number(ticketStats.totalEntered)
      if (Number(ticketStats.ticketId) === 0) {
        expect(numberOfEntrants).to.equal(2)
        expect(totalEntered).to.equal(17)
      } else if (Number(ticketStats.ticketId) === 1) {
        expect(numberOfEntrants).to.equal(3)
        expect(totalEntered).to.equal(19)
      } else if (Number(ticketStats.ticketId) === 2) {
        expect(numberOfEntrants).to.equal(2)
        expect(totalEntered).to.equal(20)
      } else {
        throw Error('ticketId: ' + Number(ticketStats.ticketId) + ' does not exist.')
      }
    })
  })

  it('🙆‍♂️  Should view individual staking stats', async function () {
    const stats = await raffle.entrantStats('0', account)
    expect(stats.length).to.equal(4)
  })

  it('🙆‍♂️  Should not draw a number before raffle ends', async function () {
    await truffleAssert.reverts(raffle.drawRandomNumber('0'), 'Raffle: Raffle time has not expired')
  })

  it('🙆‍♂️  Should draw random number for each prize', async function () {
    ethers.provider.send('evm_increaseTime', [86401]) // add 60 seconds
    await raffle.drawRandomNumber('0')
    const requestId = await linkContract.getRequestId()
    const randomness = ethers.utils.keccak256(new Date().getMilliseconds())
    await raffle.rawFulfillRandomness(requestId, randomness)

    const raffleInfo = await raffle.raffleInfo('0')
    const winners = await raffle['winners(uint256)']('0')
    let totalPrizes = 0

    winners.forEach((obj) => {
      totalPrizes = totalPrizes + Number(obj.winningPrizeNumbers.length)
      expect(obj.claimed).to.equal(false)
    })

    expect(raffleInfo.numberChosen_).to.equal(true)
    expect(totalPrizes).to.equal(68)
  })

  it('🙆‍♂️  Should not enter tickets after raffle ends', async function () {
    const ticketItems = [
      [voucherAddress, 2, 5]
    ]
    await truffleAssert.reverts(raffle.enterTickets('0', ticketItems), 'Raffle: Raffle time has expired')
  })

  it('🙅‍♀️  Cannot claim another random number', async function () {
    await truffleAssert.reverts(raffle.drawRandomNumber('0'), 'Raffle: Random number already generated')
  })

  it('🙆‍♂️  Should not claim other person\'s prizes', async function () {
    const winners = await raffle['winners(uint256)']('0')
    await truffleAssert.reverts(bobRaffle.claimPrize('0', getWins(account, winners)), 'Raffle: Did not win prize')
  })

  it('🙆‍♂️  Should not claim same prizes twice', async function () {
    let winners = await raffle.estimateGas['winners(uint256)']('0')

    console.log(winners.toString())

    winners = await raffle['winners(uint256)']('0')
    const casperWins = getWins(casperAddress, winners)
    let wins = JSON.parse(JSON.stringify(casperWins))
    let value = wins[1][1][1][1]
    value.splice(value.length, 0, value[0])
    await truffleAssert.reverts(casperRaffle.claimPrize('0', wins), 'Raffle: prizeNumber does not exist or is not lesser than last value')

    wins = JSON.parse(JSON.stringify(casperWins))
    value = wins[1][1]
    // console.log(JSON.stringify(value, null, 4))
    value.splice(value.length, 0, value[0])
    // console.log(JSON.stringify(value, null, 4))
    await truffleAssert.reverts(casperRaffle.claimPrize('0', wins), 'Raffle prize type does not exist or is not lesser than last value')

    wins = JSON.parse(JSON.stringify(casperWins))
    value = wins
    // console.log(JSON.stringify(value, null, 4))
    value.splice(value.length, 0, value[0])
    // console.log(JSON.stringify(value, null, 4))
    await truffleAssert.reverts(casperRaffle.claimPrize('0', wins), 'User entry does not exist or is not lesser than last value')
  })

  it('🙆‍♂️  Should claim prizes', async function () {
    let winners = await raffle['winners(uint256)']('0')

    // console.log(JSON.stringify(getWins(account, winners), null, 4))
    // console.log('--------')
    // console.log(JSON.stringify(getWins(bobAddress, winners), null, 4))
    // console.log('--------')
    // console.log(JSON.stringify(getWins(casperAddress, winners), null, 4))

    await raffle.claimPrize('0', getWins(account, winners))
    await bobRaffle.claimPrize('0', getWins(bobAddress, winners))
    await casperRaffle.claimPrize('0', getWins(casperAddress, winners))
    winners = await raffle['winners(uint256)']('0')
    winners.forEach((obj) => {
      expect(obj.claimed).to.equal(true)
    })
    let totalPrizes = 0
    for (let i = 0; i < 8; i++) {
      const balance = await vouchers.balanceOf(account, i)
      const bobBalance = await vouchers.balanceOf(bobAddress, i)
      const casperBalance = await vouchers.balanceOf(casperAddress, i)
      totalPrizes += Number(balance) + Number(bobBalance) + Number(casperBalance)
      // console.log(Number(balance), Number(bobBalance), Number(casperBalance))
      // console.log(totalPrizes)
    }

    const contractBalance = await tickets.balanceOf(raffleAddress, '0')

    // There are 25 tickets remaining in the raffle
    expect(contractBalance).to.equal(17)
    expect(totalPrizes).to.equal(68)
  })

  it('🙅‍♀️  Cannot claim again', async function () {
    const winners = await raffle['winners(uint256)']('0')
    await truffleAssert.reverts(raffle.claimPrize('0', getWins(account, winners)), 'Raffle: Any prizes for account have already been claimed')
  })

  it('🙅‍♀️  Should not have any open raffles', async function () {
    const raffles = await raffle.getRaffles()
    expect(raffles.length).to.equal(1)
    expect(raffles[0].isOpen).to.equal(false)
  })

  it('🙆‍♂️  Should start second raffle', async function () {
    await vouchers.createVoucherTypes(account, ['10', '10', '10'], [])
    await tickets.createVoucherTypes(account, ['10', '10', '10'], [])
    const items = [
      [ticketsAddress, '3', [[voucherAddress, '8', '5']]],
      [ticketsAddress, '4', [[voucherAddress, '9', '5']]],
      [ticketsAddress, '5', [[voucherAddress, '10', '5']]]
    ]
    const raffleEndTime = Number((Date.now() / 1000).toFixed()) + 86400 * 2
    await raffle.startRaffle(raffleEndTime, items)
    const info = await raffle.raffleInfo('1')

    const raffleEnd = Number(info.raffleEnd_)

    expect(info.numberChosen_).to.equal(false)
    expect(raffleEnd).to.greaterThan(Number((Date.now() / 1000).toFixed()))

    expect(info.raffleItems_.length).to.equal(3)

    // Test openRaffles function
    const raffles = await raffle.getRaffles()
    expect(raffles.length).to.equal(2)
    expect(raffles[1].isOpen).to.equal(true)
    expect(raffles[0].isOpen).to.equal(false)
  })
})
