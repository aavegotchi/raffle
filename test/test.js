const { expect } = require("chai");

describe("Raffle", function () {

  let account;
  let raffle;
  let vouchers;
  let voucherAddress

  before(async function () {
    const accounts = await ethers.getSigners()
    account = await accounts[0].getAddress()
    console.log('Account: ' + account)
    console.log('---')

    const RaffleContract = await ethers.getContractFactory("RaffleContract");
    raffle = await RaffleContract.deploy(account);
    await raffle.deployed();

    const VoucherContract = await ethers.getContractFactory("VouchersFacet")
    vouchers = await VoucherContract.deploy(account)
    await vouchers.deployed()
    voucherAddress = vouchers.address
  })

  it("Should have 10 of each ticket", async function () {
    const balances = await vouchers.balanceOfAll(account)
    const totalSupply = await vouchers.totalSupply(0)
    expect(balances[0]).to.equal(10)
    expect(balances.length).to.equal(6)
    expect(balances.length).to.equal(6)
    expect(totalSupply).to.equal(10)
  })

  it("Should start raffle", async function () {

    //Create Raffle Items array
    const items = [
      [
        voucherAddress,   //address stakeAddress;
        "0", // uint256 stakeId;
        voucherAddress,  //address prizeAddress;
        "0", // uint256 prizeId;
        "5"  //uint256 prizeValue;
      ]
    ]

    //Approve vouchers to transfer
    await vouchers.setApprovalForAll(raffle.address, true)
    //I changed the end time to a uint256 because Date.now() uses the millisecond version of timestamps. Can change back to uint32 if you'd prefer. 
    const raffleEndTime = Date.now() + 86400
    await raffle.startRaffle(raffleEndTime, items)
    const info = await raffle.raffleInfo("0")
    console.log('info:', info)
    const raffleEnd = Number(info.raffleEnd_)
    expect(raffleEnd).to.greaterThan(Date.now())
  });
});
