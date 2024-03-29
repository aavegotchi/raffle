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

  let itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
  //Voucher Address
  prizeAddress = "0x51cc2818f31A9037040da5F5F623B8aEc24682a9";

  //Raffle contract
  rafflesAddress = "0x6c723cac1E35FE29a175b287AE242d424c52c1CE";

  //Raffle tickets
  ticketAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";
  const gasPrice = 100000000000;

  const testing = ["hardhat", "localhost"].includes(hre.network.name);

  if (testing) {
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

  let prizeContract = await ethers.getContractAt(
    "VouchersContract",
    prizeAddress,
    signer
  );

  console.log("signer:", signer);

  let contractBal = await prizeContract.balanceOf(itemManager, "0");

  console.log("bal:", contractBal.toString());
  contractBal = await prizeContract.balanceOf(rafflesAddress, "0");

  console.log("bal:", contractBal.toString());

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

  prizeContract = await ethers.getContractAt(
    "VouchersContract",
    prizeAddress,
    signer
  );

  await prizeContract;

  const balance = await prizeContract.balanceOf(itemManager, "0");
  console.log("Balance:", balance.toString());

  tx = await prizeContract.setApprovalForAll(rafflesAddress, true, {
    gasPrice: gasPrice,
  });
  await tx.wait();

  tx = await rafflesContract.startRaffle(time, raffleItems, {
    gasPrice: gasPrice,
  });
  receipt = await tx.wait();

  const openRaffles = await rafflesContract.getRaffles();
  console.log("open raffles:", openRaffles);

  const raffleInfo = await rafflesContract.raffleInfo("4");

  console.log("raffle info:", raffleInfo.raffleItems_);
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
