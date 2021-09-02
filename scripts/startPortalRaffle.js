/* global ethers hre */

const {deployContracts} = require("./deploy.js");

async function main() {
  const accounts = await ethers.getSigners();
  const account = await accounts[0].getAddress();
  let ticketAddress;

  let prizeAddress;
  let rafflesAddress;
  let rafflesContract;
  let time;
  let signer;

  let vrfCoordinator = "0x3d2341ADb2D31f1c5530cDC622016af293177AE0";
  let linkAddress = "0xb0897686c545045aFc77CF20eC7A532E3120E0F1";
  let keyHash =
    "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da";
  let fee = ethers.utils.parseEther("0.0001");
  initialHauntSize = "10000";
  const raffleAddress = await deployContracts(
    vrfCoordinator,
    linkAddress,
    keyHash,
    fee
  );

  //Voucher Address
  prizeAddress = "0x1F24A6F957b35441A3d1dD659E3bd647aA0e11e5";

  //TBD
  rafflesAddress = raffleAddress; //"0x6c723cac1E35FE29a175b287AE242d424c52c1CE";

  //Matic GHST Staking
  ticketAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";

  const testing = ["hardhat"].includes(hre.network.name);

  if (testing) {
    let itemManager = "0x585E06CA576D0565a035301819FD2cfD7104c1E8";
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
  time = 3600 /* one hour */ * 24;

  const raffleItems = [];
  const prizeItems = [];

  prizeItems.push({
    prizeAddress: prizeAddress,
    prizeId: "0",
    prizeQuantity: 1,
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
