/* global ethers hre */

async function main() {
  const accounts = await ethers.getSigners();
  const account = await accounts[0].getAddress();
  let ticketAddress;

  let prizeAddress;
  let rafflesAddress;
  let rafflesContract;
  let time;
  let signer;

  //Voucher Address
  prizeAddress = "0x055C55C51876b5283F1Fbe2c1F5878B758E63EBE";

  //TBD
  rafflesAddress = "0x6c723cac1E35FE29a175b287AE242d424c52c1CE";

  //Matic GHST Staking
  ticketAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";

  const testing = ["hardhat"].includes(hre.network.name);

  if (testing) {
    let itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [itemManager],
    });
    signer = await ethers.provider.getSigner(itemManager);
  } else signer = accounts[0];

  rafflesContract = await ethers.getContractAt(
    "RafflesContract",
    rafflesAddress,
    signer
  );

  time = 3600 * 72 /* 72 hours */;

  const raffleItems = [];
  const prizeItems = [];

  prizeItems.push({
    prizeAddress: prizeAddress,
    prizeId: "0",
    prizeQuantity: 3000, //3000 Portal Vouchers
  });

  raffleItems.push({
    ticketAddress: ticketAddress,
    ticketId: "6",
    raffleItemPrizes: prizeItems,
  });

  console.log("raffle items:", raffleItems[0].raffleItemPrizes);

  let tx;

  const owner = await rafflesContract.owner();
  console.log("owner:", owner);

  console.log("Execute startRaffle function");

  const prizeContract = await ethers.getContractAt(
    "VouchersContract",
    prizeAddress,
    signer
  );

  await prizeContract;

  const balance = await prizeContract.balanceOf(account, "0");
  console.log("Balance:", balance.toString());

  tx = await prizeContract.setApprovalForAll(rafflesAddress, true);
  await tx.wait();

  tx = await rafflesContract.startRaffle(time, raffleItems);
  receipt = await tx.wait();

  const openRaffles = await rafflesContract.getRaffles();
  console.log("open raffles:", openRaffles);
}

exports.startRaffle = main;

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
