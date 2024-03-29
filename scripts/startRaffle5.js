/* global ethers hre */
// import { LedgerSigner } from "@ethersproject/hardware-wallets";

const {
  LedgerSigner,
} = require("../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets");

async function main() {
  const accounts = await ethers.getSigners();
  // const account = await accounts[0].getAddress();
  let ticketAddress;

  let prizeAddress;
  let rafflesAddress;
  let rafflesContract;
  let time;
  let signer;

  const itemManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
  //Voucher Address
  prizeAddress = "0x86935F11C86623deC8a25696E1C19a8659CbF95d";

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
  } else
    signer = new LedgerSigner(hre.ethers.provider, "hid", "m/44'/60'/2'/0/0");

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

  time = 3600 * 74 /* 72 hours */;

  const common = [252, 253, 254];
  const uncommon = [246, 247, 248];
  const rare = [249, 250, 251];
  const legendary = [255, 256, 257];
  const mythical = [261, 262, 263];
  const godlike = [258, 259, 260];

  const quantities = [1000, 500, 250, 100, 50, 5];
  const prizes = [common, uncommon, rare, legendary, mythical, godlike];

  const prizeQuantitys = [];
  const raffleItems = [];

  for (let ticketId = 0; ticketId < 6; ticketId++) {
    const itemIds = prizes[ticketId];
    const prizeQuantity = quantities[ticketId];

    const prizeItems = [];
    for (let j = 0; j < itemIds.length; j++) {
      const prizeId = itemIds[j];
      prizeQuantitys.push(prizeQuantity);
      prizeItems.push({
        prizeAddress: prizeAddress,
        prizeId: prizeId,
        prizeQuantity: prizeQuantity,
      });

      /*
      let balance = await prizeContract.balanceOf(itemManager, prizeId);
      console.log(`Item manager balance of ${prizeId}`, balance.toString());

      balance = await prizeContract.balanceOf(rafflesAddress, prizeId);
      console.log(`Raffle contract balance of ${prizeId}`, balance.toString());
      */
    }

    raffleItems.push({
      ticketAddress: ticketAddress,
      ticketId: ticketId,
      raffleItemPrizes: prizeItems,
    });
  }

  raffleItems.forEach((item) => {
    console.log(item.raffleItemPrizes);
  });

  //console.log("raffle items:", raffleItems);

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

  console.log("Set Approval");
  tx = await prizeContract.setApprovalForAll(rafflesAddress, true, {
    gasPrice: gasPrice,
  });
  await tx.wait();

  console.log("Deploy Raffle");
  tx = await rafflesContract.startRaffle(time, raffleItems, {
    gasPrice: gasPrice,
  });
  receipt = await tx.wait();

  const openRaffles = await rafflesContract.getRaffles();
  console.log("open raffles:", openRaffles);

  const raffleInfo = await rafflesContract.raffleInfo("5");

  console.log("raffle info:", raffleInfo);
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
