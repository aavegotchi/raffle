import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
const {
  LedgerSigner,
} = require("../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets");
import { Signer } from "@ethersproject/abstract-signer";
import { VouchersContract } from "../typechain-types/VouchersContract";
import { RafflesContract } from "../typechain-types/RafflesContract";

import { gasPrice, maticRafflesAddress, maticTicketAddress } from "../helpers";

export interface StartDropRaffleTaskArgs {
  prizeAddress: string;
  prizeAmount: string;
  duration: string;
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

  .setAction(
    async (
      taskArgs: StartDropRaffleTaskArgs,
      hre: HardhatRuntimeEnvironment
    ) => {
      const itemManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
      console.log(itemManager);
      let signer: Signer;
      const testing = ["hardhat", "localhost"].includes(hre.network.name);
      if (testing) {
        await hre.network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [itemManager],
        });
        signer = await hre.ethers.provider.getSigner(itemManager);
      } else if (hre.network.name === "matic") {
        signer = new LedgerSigner(
          hre.ethers.provider,
          "hid",
          "m/44'/60'/2'/0/0"
        );
      } else {
        throw Error("Incorrect network selected");
      }

      const rafflesContract = (await hre.ethers.getContractAt(
        "RafflesContract",
        maticRafflesAddress,
        signer
      )) as RafflesContract;

      const prizeContract = (await hre.ethers.getContractAt(
        "VouchersContract",
        taskArgs.prizeAddress,
        signer
      )) as VouchersContract;

      console.log("signer:", signer);

      let contractBal = await prizeContract.balanceOf(itemManager, "0");

      console.log("bal:", contractBal.toString());
      contractBal = await prizeContract.balanceOf(maticRafflesAddress, "0");

      console.log("bal:", contractBal.toString());

      const time = 3600 * Number(taskArgs.duration); /* 72 hours */

      const raffleItems = [];
      const prizeItems = [];

      prizeItems.push({
        prizeAddress: taskArgs.prizeAmount,
        prizeId: "0",
        prizeQuantity: taskArgs.prizeAmount,
      });

      raffleItems.push({
        ticketAddress: maticTicketAddress,
        ticketId: "6",
        raffleItemPrizes: prizeItems,
      });

      console.log("raffle items:", raffleItems[0].raffleItemPrizes);

      let tx;

      const owner = await rafflesContract.owner();
      console.log("owner:", owner);

      console.log("Execute startRaffle function");

      const balance = await prizeContract.balanceOf(itemManager, "0");
      console.log("Balance:", balance.toString());

      tx = await prizeContract.setApprovalForAll(maticRafflesAddress, true, {
        gasPrice: gasPrice,
      });
      await tx.wait();

      tx = await rafflesContract.startRaffle(time, raffleItems, {
        gasPrice: gasPrice,
      });
      await tx.wait();

      const openRaffles = await rafflesContract.getRaffles();
      console.log("open raffles:", openRaffles);

      const raffleInfo = await rafflesContract.raffleInfo(
        openRaffles.length - 1
      );

      console.log("raffle info:", raffleInfo.raffleItems_);
    }
  );
