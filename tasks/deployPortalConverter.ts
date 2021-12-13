import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { TransferPortals__factory } from "../typechain-types/factories/TransferPortals__factory";

import { gasPrice, getLedgerSigner, getSigner } from "../helpers";
import { Signer } from "@ethersproject/abstract-signer";

export interface DeployVoucherConverterTaskArgs {
  voucherAddress: string;
  erc721TokenAddress: string;
  voucherIds: string;
  deployer: string;
}

task(
  "deployVoucherConverter",
  "Starts a Drop raffle for Drop Tickets and ERC1155 vouchers, redeemable for ERC721 NFTs"
)
  .addParam(
    "voucherAddress",
    "The address of the Voucher convertible for ERC721"
  )
  .addParam("erc721TokenAddress", "Contract address of the ERC721 convertible")
  .addParam("deployer")
  .addOptionalParam("voucherId", "ID of the ERC1155 voucher")
  .setAction(
    async (
      taskArgs: DeployVoucherConverterTaskArgs,
      hre: HardhatRuntimeEnvironment
    ) => {
      let signer: Signer = await getSigner(hre, taskArgs.deployer);

      if (
        taskArgs.deployer.toLowerCase() !==
        (await (await signer.getAddress()).toLowerCase())
      ) {
        throw new Error(
          `Deployer ${
            taskArgs.deployer
          } is not signer ${await signer.getAddress()}`
        );
      }

      //Deploy TransferPortals
      console.log(
        `Deploying TransferPortals Contract with voucher address ${taskArgs.voucherAddress} for ERC721 token ${taskArgs.erc721TokenAddress}`
      );

      // const TransferPortals = await (
      //   (await hre.ethers.getContractFactory(
      //     "TransferPortals",
      //     signer
      //   )) as TransferPortals__factory
      // ).deploy(taskArgs.voucherAddress, taskArgs.erc721TokenAddress, "", ",", {
      //   gasPrice: gasPrice,
      // });
      // await TransferPortals.deployed();

      // console.log("Convert contract deployed to:", TransferPortals.address);

      // return TransferPortals.address;
    }
  );
