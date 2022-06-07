/* global ethers */
// import { LedgerSigner } from "@ethersproject/hardware-wallets";
import { ethers, network } from "hardhat";
import { gasPrice, impersonate } from "../helpers";

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
  let signer;

  const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
  //Voucher Address
  prizeAddress = "0x86935F11C86623deC8a25696E1C19a8659CbF95d";

  //Raffle contract
  rafflesAddress = "0x6c723cac1E35FE29a175b287AE242d424c52c1CE";

  //Raffle tickets
  ticketAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";

  const testing = ["hardhat", "localhost"].includes(network.name);

  if (testing) {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [itemManager],
    });
    signer = await ethers.provider.getSigner(itemManager);

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [itemManager],
    });
    signer = await ethers.provider.getSigner(itemManager);
  } else signer = await (await ethers.getSigners())[0];

  console.log("signer:", signer);

  rafflesContract = await ethers.getContractAt(
    "RafflesContract",
    rafflesAddress,
    signer
  );

  let prizeContract = await ethers.getContractAt(
    "ERC1155Voucher",
    prizeAddress,
    signer
  );

  const thirtyMinutes = 25 * 60;
  const time = 3600 * 72 + thirtyMinutes; /* 72 hours */

  const common = [292, 293, 294, 295, 298]; //brunette ponytail, leather tunic, bow and arrow, forked beard, horned helmet
  const uncommon = [296, 297, 299, 300]; //double-sided axe, animal skins, longbow, feathered cap
  const rare = [301, 302, 303, 304]; //alluring eyes, geisha headpiece, kimono, paper fan
  const legendary = [305, 306, 307, 308]; //sus butterfly, flower studs, fairy wings, red hair
  const mythical = [309, 310, 311, 312]; //citaadel helm, plate armor, spirit sword, plate shield
  const godlike = [313, 314, 315]; //kabuto helmet, yoroi armor, haanzo katana

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

      // let balance = await prizeContract.balanceOf(itemManager, prizeId);
      // console.log(`Item manager balance of ${prizeId}`, balance.toString());

      // balance = await prizeContract.balanceOf(rafflesAddress, prizeId);
      // console.log(`Raffle contract balance of ${prizeId}`, balance.toString());
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

  const owner = await rafflesContract.owner();
  console.log("owner:", owner);

  console.log("Execute startRaffle function");

  prizeContract = await ethers.getContractAt(
    "ERC1155Voucher",
    prizeAddress,
    signer
  );

  await prizeContract;

  // console.log("Set Approval");
  // const tx = await prizeContract.setApprovalForAll(rafflesAddress, true, {
  //   gasPrice: gasPrice,
  // });
  // await tx.wait();

  console.log("Deploy Raffle");
  const tx = await rafflesContract.startRaffle(time, raffleItems, {
    gasPrice: gasPrice,
  });
  await tx.wait();

  console.log("Raffle started");
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
