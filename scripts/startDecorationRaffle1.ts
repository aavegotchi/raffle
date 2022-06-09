/* global ethers */
// import { LedgerSigner } from "@ethersproject/hardware-wallets";
import { ethers, network } from "hardhat";
import { gasPrice, impersonate } from "../helpers";

async function main() {
  //installation address
  let prizeAddress = "0x19f870bD94A34b3adAa9CaA439d333DA18d6812A";
  let rafflesAddress = "0x6c723cac1E35FE29a175b287AE242d424c52c1CE";
  let rafflesContract;
  let signer;

  //Raffle tickets
  const ticketAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";
  const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";

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

  const erc1155 = await ethers.getContractAt(
    "ERC1155Voucher",
    prizeAddress,
    signer
  );

  await erc1155.setApprovalForAll(rafflesAddress, true);

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

  // const thirtyMinutes = 25 * 60;
  const time = 3600 * 72; //+ thirtyMinutes; /* 72 hours */

  const common = [19, 25, 31, 37, 43, 49];
  const uncommon = [20, 26, 32, 38, 44, 50];
  const rare = [21, 27, 33, 39, 45, 51];
  const legendary = [22, 28, 34, 40, 46, 52];
  const mythical = [23, 29, 35, 41, 47, 53];
  const godlike = [24, 30, 36, 42, 48, 54];

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

  const raffles = await rafflesContract.getRaffles();
  console.log("raffles:", raffles);

  const newRaffle = raffles[10];
  console.log("end time:", newRaffle.raffleEnd.toString());

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
