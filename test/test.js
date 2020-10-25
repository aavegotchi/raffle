/* global ethers, describe, it, before */

const { expect } = require('chai')
const truffleAssert = require('truffle-assertions')

describe('Raffle', function () {
  let account
  let bob
  let bobAddress
  let caasperAddress
  let caasper
  let raffle
  let raffleAddress
  let vouchers
  let voucherAddress

  before(async function () {
    const accounts = await ethers.getSigners()
    account = await accounts[0].getAddress()
    bob = await accounts[1]
    bobAddress = await accounts[1].getAddress()
    caasper = await accounts[2]
    caasperAddress = await accounts[2].getAddress()



    console.log('Account: ' + account)
    console.log('---')

    const RaffleContract = await ethers.getContractFactory('RafflesContract')
    raffle = await RaffleContract.deploy(account)
    await raffle.deployed()
    raffleAddress = raffle.address

    const VoucherContract = await ethers.getContractFactory('VouchersContract')
    vouchers = await VoucherContract.deploy(account)
    await vouchers.deployed()
    voucherAddress = vouchers.address

    await vouchers.createVoucherTypes(account, ['10', '10', '10', '10', '10', '10'], [])

    bobRaffle = raffle.connect(bob)
    caasperRaffle = raffle.connect(caasper)
  })

  it('🙆‍♂️  Owner Should have 10 of each ticket', async function () {
    const balances = await vouchers.balanceOfAll(account)
    const totalSupply = await vouchers.totalSupply(0)
    expect(balances[0]).to.equal(10)
    expect(balances.length).to.equal(6)
    expect(balances.length).to.equal(6)
    expect(totalSupply).to.equal(10)
  })

  it("🙆‍♂️  Bob and Caasper should have 10 of each ticket", async function () {
    await vouchers.mintVouchers(bobAddress, ["0", "1", "2", "3", "4", "5"], ["10", "10", "10", "10", "10", "10"], [])
    await vouchers.mintVouchers(caasperAddress, ["0", "1", "2", "3", "4", "5"], ["10", "10", "10", "10", "10", "10"], [])
    const balancesBob = await vouchers.balanceOfAll(bobAddress)
    const balancesCaasper = await vouchers.balanceOfAll(bobAddress)
    expect(balancesBob[0]).to.equal(10)
    expect(balancesCaasper[1]).to.equal(10)
  })

  it('🙆‍♂️  Only contract owner can start raffle', async function () {
    const items = [[voucherAddress, '0', [[voucherAddress, '0', '5']]]]
    const raffleEndTime = Number((Date.now() / 1000).toFixed()) + 86400
    await truffleAssert.reverts(bobRaffle.startRaffle(raffleEndTime, items), "Raffle: Must be contract owner")
  })

  it('🙅‍♀️  Cannot start a raffle before now', async function () {
    const items = [[voucherAddress, '0', [[voucherAddress, '0', '5']]]]
    const raffleEndTime = Number((Date.now() / 1000).toFixed()) - 86400
    await truffleAssert.reverts(raffle.startRaffle(raffleEndTime, items), "Raffle: _raffleEnd must be greater than 1 hour")
  })


  it('🙆‍♂️  Should start raffle', async function () {

    const items = [
      [voucherAddress, '0', [[voucherAddress, '0', '5']]],
      [voucherAddress, '1', [[voucherAddress, '1', '5']]],
      [voucherAddress, '2', [[voucherAddress, '2', '5']]]
    ]

    // Approve vouchers to transfer
    await vouchers.setApprovalForAll(raffle.address, true)

    const raffleEndTime = Number((Date.now() / 1000).toFixed()) + 86400
    await raffle.startRaffle(raffleEndTime, items)
    const info = await raffle.raffleInfo('0')
    const raffleEnd = Number(info.raffleEnd_)

    expect(raffleEnd).to.greaterThan(Number((Date.now() / 1000).toFixed()))

    expect(info.raffleItems_.length).to.equal(3)

    // Test openRaffles function
    const openRaffles = await raffle.openRaffles()
    expect(openRaffles.length).to.equal(1)
  })

  it('🙅‍♀️  Cannot stake more tickets than they own', async function () {
    const stakeItems = [
      [voucherAddress, 0, 10],
      [voucherAddress, 1, 5]
    ]
    await truffleAssert.reverts(raffle.stake('0', stakeItems), 'Vouchers: _value greater than balance')
  })

  it('🙅‍♀️  Cannot stake to nonexistent raffle', async function () {
    const stakeItems = [[voucherAddress, 1, 5]]
    await truffleAssert.reverts(raffle.stake('1', stakeItems), 'Raffle: Raffle does not exist')
  })

  it('🙅‍♀️  Cannot stake zero values', async function () {
    const stakeItems = [
      [voucherAddress, 0, 0]
    ]
    await truffleAssert.reverts(raffle.stake('0', stakeItems), 'Stake value cannot be zero')
  })

  it('🙅‍♀️  Cannot stake prizes that dont exist', async function () {
    const stakeItems = [
      [voucherAddress, 6, 1]
    ]
    await truffleAssert.reverts(raffle.stake('0', stakeItems), 'Raffle: Stake item doesn\'t exist for this raffle')
  })

  it('🙆‍♂️  Should approve tickets to be transferred', async function () {
    let bobVouchers = vouchers.connect(bob)
    let caasperVouchers = vouchers.connect(caasper)
    await bobVouchers.setApprovalForAll(raffleAddress, true)
    await caasperVouchers.setApprovalForAll(raffleAddress, true)
    const bobApproved = await vouchers.isApprovedForAll(bobAddress, raffleAddress)
    const caasperApproved = await vouchers.isApprovedForAll(caasperAddress, raffleAddress)
    expect(bobApproved).to.equal(true)
    expect(caasperApproved).to.equal(true)
  })

  it('🙆‍♂️  Should stake tickets to raffle', async function () {
    const stakeItems = [
      // I'm staking twice, but since it's the same account
      [voucherAddress, 0, 1],
      [voucherAddress, 0, 1],
      [voucherAddress, 0, 1],
      [voucherAddress, 0, 1],
      [voucherAddress, 0, 1],
      [voucherAddress, 1, 5]
      // [voucherAddress, 2, 1],
    ]

    const bobItems = [
      // I'm staking twice, but since it's the same account
      [voucherAddress, 0, 10],
      // [voucherAddress, 2, 1],
    ]


    const caasperItems = [
      // I'm staking twice, but since it's the same account
      [voucherAddress, 0, 10],
      [voucherAddress, 1, 5],
      [voucherAddress, 2, 10],
      [voucherAddress, 1, 5]
    ]

    await raffle.stake('0', stakeItems)
    await bobRaffle.stake('0', bobItems)
    await caasperRaffle.stake('0', caasperItems)

    const stakerStats = await raffle.stakeStats('0')
    stakerStats.forEach((stake) => {

      let numberOfStakers = Number(stake.numberOfStakers)
      let stakeTotal = Number(stake.stakeTotal)


      if (stake.stakeId === 0) {
        expect(numberOfStakers).to.equal(3)
        expect(stakeTotal).to.equal(25)
      }
      else if (stake.stakeId === 1) {
        expect(numberOfStakers).to.equal(2)
        expect(stakeTotal).to.equal(15)
      }
      else if (stake.stakeId === 2) {
        expect(numberOfStakers).to.equal(1)
        expect(stakeTotal).to.equal(10)
      }

    })
  })

  it('🙆‍♂️  Should view individual staking stats', async function () {
    const stats = await raffle.stakerStats('0', account)
    expect(stats.length).to.equal(6)
  })

  it('🙆‍♂️  Should not draw a number before raffle ends', async function () {
    await truffleAssert.reverts(raffle.drawRandomNumber('0'), 'Raffle: Raffle time has not expired')
  })

  it('🙆‍♂️  Should draw random number for each prize', async function () {
    ethers.provider.send('evm_increaseTime', [86401]) // add 60 seconds
    await raffle.drawRandomNumber('0')
    const winners = await raffle['winners(uint256)']('0')


    let totalPrizes = 0

    winners.forEach((obj) => {
      totalPrizes = totalPrizes + Number(obj.prizeValue)
      expect(obj.claimed).to.equal(false)
    })

    expect(totalPrizes).to.equal(15)
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
    let balance = await vouchers.balanceOf(account, '0')
    expect(balance).to.equal(0)
    await raffle.claimPrize('0')
    await bobRaffle.claimPrize('0')
    await caasperRaffle.claimPrize('0')
    const winners = await raffle['winners(uint256)']('0')
    winners.forEach((obj) => {
      expect(obj.claimed).to.equal(true)
    })
    balance = await vouchers.balanceOf(account, '0')
    let bobBalance = await vouchers.balanceOf(bobAddress, '0')
    let caasperBalance = await vouchers.balanceOf(caasperAddress, '0')
    let total = Number(balance) + Number(bobBalance) + Number(caasperBalance)

    let contractBalance = await vouchers.balanceOf(raffleAddress, '0')

    //There are still 25 tickets remaining in the raffle 
    expect(contractBalance).to.equal(25)
    expect(total).to.equal(5)
  })

  it('🙅‍♀️  Cannot claim again', async function () {
    await truffleAssert.reverts(raffle.claimPrize('0'), 'Raffle: Any prizes for account have already been claimed')
  })

  it('🙅‍♀️  Should not have any open raffles', async function () {
    const openRaffles = await raffle.openRaffles()
    expect(openRaffles.length).to.equal(0)
  })
})
