import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { Signer } from "@ethersproject/abstract-signer";
import { ERC1155Voucher } from "../typechain-types/ERC1155Voucher";
import { RafflesContract } from "../typechain-types/RafflesContract";

import {
  gasPrice,
  getLedgerSigner,
  getSigner,
  maticRafflesAddress,
  maticTicketAddress,
} from "../helpers";

export interface StartDropRaffleTaskArgs {
  prizeAddress: string;
  prizeAmount: string;
  duration: string;
  voucherId: string;
  deployer: string;
}

task(
  "startDropRaffle",
  "Starts a Drop raffle for Drop Tickets and ERC1155 vouchers, redeemable for ERC721 NFTs"
)
  .addParam(
    "prizeAddress",
    "The contract address of the Voucher used to convert into the ERC721"
  )
  .addParam("prizeAmount")
  .addParam("duration", "Number of hours the raffle will last")
  .addParam("voucherId")
  .addParam("deployer")

  .setAction(
    async (
      taskArgs: StartDropRaffleTaskArgs,
      hre: HardhatRuntimeEnvironment
    ) => {
      // const itemManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
      console.log(taskArgs.deployer);
      let signer: Signer = await getSigner(hre, taskArgs.deployer);

      const rafflesContract = (await hre.ethers.getContractAt(
        "RafflesContract",
        maticRafflesAddress,
        signer
      )) as RafflesContract;

      const prizeContract = (await hre.ethers.getContractAt(
        "ERC1155Voucher",
        taskArgs.prizeAddress,
        signer
      )) as ERC1155Voucher;

      let contractBal = await prizeContract.balanceOf(taskArgs.deployer, "0");

      console.log("Item manager balance:", contractBal.toString());
      contractBal = await prizeContract.balanceOf(maticRafflesAddress, "0");

      console.log("Raffle contract balance:", contractBal.toString());

      const time = taskArgs.duration; /* 72 hours */

      const raffleItems = [];
      const prizeItems = [];

      prizeItems.push({
        prizeAddress: taskArgs.prizeAddress,
        prizeId: taskArgs.voucherId,
        prizeQuantity: taskArgs.prizeAmount,
      });

      raffleItems.push({
        ticketAddress: maticTicketAddress,
        ticketId: "6",
        raffleItemPrizes: prizeItems,
      });

      console.log("raffle items:", raffleItems[0].raffleItemPrizes);

      const owner = await rafflesContract.owner();
      console.log("owner:", owner);

      console.log("Setting approval ");

      const tx = await prizeContract.setApprovalForAll(
        maticRafflesAddress,
        true,
        {
          gasPrice: gasPrice,
        }
      );
      await tx.wait();

      console.log("Executing start raffle");
      const raffletx = await rafflesContract.startRaffle(time, raffleItems, {
        gasPrice: gasPrice,
      });
      console.log("tx hash:", raffletx.hash);
      await raffletx.wait();

      let balance = await prizeContract.balanceOf(taskArgs.deployer, "0");
      console.log("Item Manager Balance:", balance.toString());

      balance = await prizeContract.balanceOf(maticRafflesAddress, "0");
      console.log("Raffle contract Prize Balance:", balance.toString());

      const openRaffles = await rafflesContract.getRaffles();

      const raffleInfo = await rafflesContract.raffleInfo(
        openRaffles.length - 1
      );

      console.log(
        `Raffle ${
          openRaffles.length - 1
        } has been created with ticket type: ${raffleInfo.raffleItems_[0].ticketId.toString()}`,
        raffleInfo.raffleItems_
      );
    }
  );
