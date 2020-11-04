/* global ethers, describe, it, before */

const { expect } = require('chai')
const truffleAssert = require('truffle-assertions')

function getWins (stakerAddress, winners) {
  const wins = []
  for (const winner of winners) {
    if (winner.staker === stakerAddress) {
      wins.push([
        winner.userStakeIndex,
        winner.raffleItemPrizeIndex,
        winner.prizeValues
      ])
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
  let stakeTickets
  let voucherAddress
  let stakeTicketsAddress
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

    stakeTickets = await VoucherContract.deploy(account)
    await stakeTickets.deployed()
    stakeTicketsAddress = stakeTickets.address

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
    await stakeTickets.createVoucherTypes(account, ['10', '10', '10'], [])
    await stakeTickets.mintVouchers(bobAddress, ['0', '1', '2'], ['10', '10', '10'], [])
    await stakeTickets.mintVouchers(casperAddress, ['0', '1', '2'], ['10', '10', '10'], [])
    const balancesBob = await stakeTickets.balanceOfAll(bobAddress)
    const balancesCaasper = await stakeTickets.balanceOfAll(bobAddress)
    expect(balancesBob[0]).to.equal(10)
    expect(balancesCaasper[1]).to.equal(10)
  })

  it('🙆‍♂️  Only contract owner can start raffle', async function () {
    const items = [[stakeTicketsAddress, '0', [[voucherAddress, '0', '5']]]]
    const raffleEndTime = Number((Date.now() / 1000).toFixed()) + 86400
    await truffleAssert.reverts(bobRaffle.startRaffle(raffleEndTime, items), 'Raffle: Must be contract owner')
  })

  it('🙅‍♀️  Cannot start a raffle before now', async function () {
    const items = [[stakeTicketsAddress, '0', [[voucherAddress, '0', '5']]]]
    const raffleEndTime = Number((Date.now() / 1000).toFixed()) - 86400
    await truffleAssert.reverts(raffle.startRaffle(raffleEndTime, items), 'Raffle: _raffleEnd must be greater than 1 hour')
  })

  it('🙆‍♂️  Should start raffle', async function () {
    const items = [
      [stakeTicketsAddress, '0', [[voucherAddress, '0', '5'], [voucherAddress, '1', '6'], [voucherAddress, '2', '7']]],
      [stakeTicketsAddress, '1', [[voucherAddress, '3', '8'], [voucherAddress, '4', '9'], [voucherAddress, '5', '10']]],
      [stakeTicketsAddress, '2', [[voucherAddress, '6', '11'], [voucherAddress, '7', '12']]]
    ]

    // Approve vouchers to transfer
    await vouchers.setApprovalForAll(raffle.address, true)
    await stakeTickets.setApprovalForAll(raffle.address, true)

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

  it('🙅‍♀️  Cannot stake more tickets than they own', async function () {
    const stakeItems = [
      [stakeTicketsAddress, 0, 11],
      [stakeTicketsAddress, 1, 5]
    ]
    await truffleAssert.reverts(raffle.stake('0', stakeItems), 'Vouchers: _value greater than balance')
  })

  it('🙅‍♀️  Cannot stake to nonexistent raffle', async function () {
    const stakeItems = [[stakeTicketsAddress, 1, 5]]
    await truffleAssert.reverts(raffle.stake('1', stakeItems), 'Raffle: Raffle does not exist')
  })

  it('🙅‍♀️  Cannot stake zero values', async function () {
    const stakeItems = [
      [stakeTicketsAddress, 0, 0]
    ]
    await truffleAssert.reverts(raffle.stake('0', stakeItems), 'Stake value cannot be zero')
  })

  it('🙅‍♀️  Cannot stake items that dont exist', async function () {
    const stakeItems = [
      [stakeTicketsAddress, 6, 1]
    ]
    await truffleAssert.reverts(raffle.stake('0', stakeItems), 'Raffle: Stake item doesn\'t exist for this raffle')
  })

  it('🙆‍♂️  Should approve tickets to be transferred', async function () {
    const bobStakeTickets = stakeTickets.connect(bob)
    const caasperStakeTickets = stakeTickets.connect(caasper)
    await bobStakeTickets.setApprovalForAll(raffleAddress, true)
    await caasperStakeTickets.setApprovalForAll(raffleAddress, true)
    const bobApproved = await stakeTickets.isApprovedForAll(bobAddress, raffleAddress)
    const caasperApproved = await stakeTickets.isApprovedForAll(casperAddress, raffleAddress)
    expect(bobApproved).to.equal(true)
    expect(caasperApproved).to.equal(true)
  })

  it('🙆‍♂️  Should stake tickets to raffle', async function () {
    const stakeItems = [
      // I'm staking twice, but since it's the same account
      [stakeTicketsAddress, 0, 1],
      [stakeTicketsAddress, 0, 1],
      [stakeTicketsAddress, 0, 5],
      [stakeTicketsAddress, 1, 5]
      // [voucherAddress, 2, 1],
    ]

    const bobItems = [
      // I'm staking twice, but since it's the same account
      [stakeTicketsAddress, 2, 10],
      [stakeTicketsAddress, 1, 3]
      // [voucherAddress, 2, 1],
    ]

    const caasperItems = [
      // I'm staking twice, but since it's the same account
      [stakeTicketsAddress, 0, 10],
      [stakeTicketsAddress, 1, 5],
      [stakeTicketsAddress, 2, 10],
      [stakeTicketsAddress, 1, 5]
    ]

    await raffle.stake('0', stakeItems)
    await bobRaffle.stake('0', bobItems)
    await casperRaffle.stake('0', caasperItems)

    const stakerStats = await raffle.stakeStats('0')
    stakerStats.forEach((stake) => {
      const numberOfStakers = Number(stake.numberOfStakers)
      const stakeTotal = Number(stake.stakeTotal)
      if (Number(stake.stakeId) === 0) {
        expect(numberOfStakers).to.equal(2)
        expect(stakeTotal).to.equal(17)
      } else if (Number(stake.stakeId) === 1) {
        expect(numberOfStakers).to.equal(3)
        expect(stakeTotal).to.equal(18)
      } else if (Number(stake.stakeId) === 2) {
        expect(numberOfStakers).to.equal(2)
        expect(stakeTotal).to.equal(20)
      } else {
        throw Error('StakeId: ' + Number(stake.stakeId) + ' does not exist.')
      }
    })
  })

  it('🙆‍♂️  Should view individual staking stats', async function () {
    const stats = await raffle.stakerStats('0', account)
    expect(stats.length).to.equal(4)
  })

  it('🙆‍♂️  Should not draw a number before raffle ends', async function () {
    await truffleAssert.reverts(raffle.drawRandomNumber('0'), 'Raffle: Raffle time has not expired')
  })

  it('🙆‍♂️  Should draw random number for each prize', async function () {
    ethers.provider.send('evm_increaseTime', [86401]) // add 60 seconds
    await raffle.drawRandomNumber('0')
    const requestId = await linkContract.getRequestId()
    const randomness = new Date().getMilliseconds()
    await raffle.rawFulfillRandomness(requestId, randomness)

    const raffleInfo = await raffle.raffleInfo('0')
    const winners = await raffle['winners(uint256)']('0')
    let totalPrizes = 0

    winners.forEach((obj) => {
      totalPrizes = totalPrizes + Number(obj.prizeValues.length)
      expect(obj.claimed).to.equal(false)
    })

    expect(raffleInfo.numberChosen_).to.equal(true)
    expect(totalPrizes).to.equal(68)
  })

  it('🙆‍♂️  Should not stake after raffle ends', async function () {
    const stakeItems = [
      [voucherAddress, 2, 5]
    ]
    await truffleAssert.reverts(raffle.stake('0', stakeItems), 'Raffle: Raffle time has expired')
  })

  it('🙅‍♀️  Cannot claim another random number', async function () {
    await truffleAssert.reverts(raffle.drawRandomNumber('0'), 'Raffle: Random number already generated')
  })

  it('🙆‍♂️  Should claim prizes', async function () {
    let winners = await raffle['winners(uint256)']('0')
    /*
    console.log(JSON.stringify(getWins(account, winners), null, 4))
    console.log('--------')
    console.log(JSON.stringify(getWins(bobAddress, winners), null, 4))
    console.log('--------')
    console.log(JSON.stringify(getWins(casperAddress, winners), null, 4))
    */
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

    const contractBalance = await stakeTickets.balanceOf(raffleAddress, '0')

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
    await stakeTickets.createVoucherTypes(account, ['10', '10', '10'], [])
    const items = [
      [stakeTicketsAddress, '3', [[voucherAddress, '8', '5']]],
      [stakeTicketsAddress, '4', [[voucherAddress, '9', '5']]],
      [stakeTicketsAddress, '5', [[voucherAddress, '10', '5']]]
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
