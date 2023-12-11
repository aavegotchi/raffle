/* global ethers */
// import { LedgerSigner } from "@ethersproject/hardware-wallets";
import * as hre from "hardhat";
import {
  gasPrice,
  getSigner,
  maticRafflesAddress as rafflesAddress,
  maticTicketAddress as ticketAddress,
} from "../helpers";
import { Signer } from "@ethersproject/abstract-signer";

const prizeAddress = "0x4fDfc1B53Fd1D80d969C984ba7a8CE4c7bAaD442"; // forge diamond
const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";

async function main() {
  let signer: Signer = await getSigner(hre, itemManager); // should be forge schematic owner
  // console.log("signer:", signer);

  const rafflesContract = await hre.ethers.getContractAt(
    "RafflesContract",
    rafflesAddress,
    signer
  );

  let prizeContract = await hre.ethers.getContractAt(
    "ERC1155Voucher",
    prizeAddress,
    signer
  );

  const time = 3600 * 72; /* 72 hours */

  const common = [370, 371, 372, 375]; //
  const uncommon = [373, 377]; //
  const rare = [374, 376, 378, 379]; //
  const legendary: number[] = [380, 381, 382, 383]; //
  const mythical = [384]; //
  const godlike = [385, 386, 387]; //
  const quantities = [400, 200, 100, 40, 20, 2];
  const prizes = [common, uncommon, rare, legendary, mythical, godlike];

  const prizeQuantities: number[] = [];
  const raffleItems: any[] = [];

  for (let ticketId = 0; ticketId < prizes.length; ticketId++) {
    const itemIds = prizes[ticketId];
    let prizeQuantity = quantities[ticketId];
    if (prizeQuantity === 0) {
      continue;
    }
    const prizeItems: any[] = [];
    for (let j = 0; j < itemIds.length; j++) {
      const prizeId = itemIds[j];

      console.log("prize id:", prizeId);

      prizeQuantity = quantities[ticketId];

      console.log("ticket id:", ticketId);

      prizeQuantities.push(prizeQuantity);
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

  console.log("Set Approval");
  let tx = await prizeContract.setApprovalForAll(rafflesAddress, true, {
    gasPrice: gasPrice,
  });
  await tx.wait();

  console.log("Deploy Raffle");
  tx = await rafflesContract.startRaffle(time, raffleItems, {
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
