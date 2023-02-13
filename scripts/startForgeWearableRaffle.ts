/* global ethers */
// import { LedgerSigner } from "@ethersproject/hardware-wallets";
import { ethers, network } from "hardhat";
import {
  gasPrice,
  getSigner,
  maticRafflesAddress as rafflesAddress,
  maticTicketAddress as ticketAddress,
} from "../helpers";
import { Signer } from "@ethersproject/abstract-signer";

const prizeAddress = "0x58de9AaBCaeEC0f69883C94318810ad79Cc6a44f";
const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";

async function main() {
  let signer: Signer = await getSigner(hre, itemManager);
  // console.log("signer:", signer);

  const rafflesContract = await ethers.getContractAt(
    "RafflesContract",
    rafflesAddress,
    signer
  );

  let prizeContract = await ethers.getContractAt(
    "ERC1155Voucher",
    prizeAddress,
    signer
  );

  const time = 3600 * 72; /* 72 hours */

  const common = [350, 351, 352, 353]; //
  const uncommon = [354, 356]; //
  const rare = [355, 357]; //
  const legendary = [358, 359, 360, 361]; //
  const mythical = [362, 363, 364, 365]; //
  const godlike = [366, 367, 368, 369]; //
  const quantities = [1000, 500, 250, 100, 50, 5];
  const prizes = [common, uncommon, rare, legendary, mythical, godlike];

  const prizeQuantities = [];
  const raffleItems = [];

  for (let ticketId = 0; ticketId < 6; ticketId++) {
    const itemIds = prizes[ticketId];
    const prizeQuantity = quantities[ticketId];

    const prizeItems = [];
    for (let j = 0; j < itemIds.length; j++) {
      const prizeId = itemIds[j];
      prizeQuantities.push(prizeQuantity);
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
