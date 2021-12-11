import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ERC1155Voucher } from "../typechain-types/ERC1155Voucher";
import { ERC1155Voucher__factory } from "../typechain-types/factories/ERC1155Voucher__factory";

import { gasPrice, getLedgerSigner, getSigner } from "../helpers";
import { Signer } from "@ethersproject/abstract-signer";

export interface DeployRaffleVoucherArgs {
  deployer: string;
  quantities: string;
  voucherIds: string;
}

task(
  "deployRaffleVoucher",
  "Starts a Drop raffle for Drop Tickets and ERC1155 vouchers, redeemable for ERC721 NFTs"
)
  .addParam("quantities")
  .addParam("voucherIds")
  .setAction(
    async (
      taskArgs: DeployRaffleVoucherArgs,
      hre: HardhatRuntimeEnvironment
    ) => {
      const accounts = await hre.ethers.getSigners();
      const owner = await accounts[0].getAddress();

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

      console.log("deployer:", taskArgs.deployer);

      console.log("owner:", owner);

      //Deploy Voucher

      console.log("Deploying ERC1155Voucher with deployer:", taskArgs.deployer);
      const ERC1155Voucher = await (
        (await hre.ethers.getContractFactory(
          "ERC1155Voucher",
          signer
        )) as ERC1155Voucher__factory
      ).deploy(taskArgs.voucherIds.split(","), taskArgs.quantities.split(","), {
        gasPrice: gasPrice,
      });
      await ERC1155Voucher.deployed();

      //Check balance
      const voucherAddress = ERC1155Voucher.address;
      const voucher = (await hre.ethers.getContractAt(
        "ERC1155Voucher",
        voucherAddress,
        signer
      )) as ERC1155Voucher;

      let balance = await voucher.balanceOf(taskArgs.deployer, "0");
      console.log(
        `Voucher balance of owner: ${taskArgs.deployer}`,
        balance.toString()
      );

      return voucher.address;
    }
  );
