/* global ethers hre */
import { run } from "hardhat";
import { DeployRaffleVoucherArgs } from "../tasks/deployRaffleVoucher";
import { DeployVoucherConverterTaskArgs } from "../tasks/deployVoucherConverter";
import { StartDropRaffleTaskArgs } from "../tasks/startDropRaffle";

export async function main() {
  //Setup the variables
  const itemManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
  const realmDiamond = "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11";
  const prizeAmount = "4000";
  const raffleDuration = "72"; //in hours
  const voucherId = "0";

  //First deploy the Voucher to be used as the Raffle Prize
  const deployVoucherTaskArgs: DeployRaffleVoucherArgs = {
    deployer: itemManager,
  };

  const voucherAddress = await run(
    "deployRaffleVoucher",
    deployVoucherTaskArgs
  );

  //Then deploy the converter contract that is used to convert vouchers into ERC721
  const deployConverterTaskArgs: DeployVoucherConverterTaskArgs = {
    voucherAddress: voucherAddress,
    erc721TokenAddress: realmDiamond,
    deployer: itemManager,
    voucherId: voucherId,
  };
  await run("deployVoucherConverter", deployConverterTaskArgs);

  //Then start the raffle, using the voucher address as the prize
  const startDropRaffleTaskArgs: StartDropRaffleTaskArgs = {
    prizeAddress: voucherAddress,
    prizeAmount: prizeAmount,
    duration: raffleDuration,
    deployer: itemManager,
    voucherId: voucherId,
  };

  await run("startDropRaffle", startDropRaffleTaskArgs);

  console.log("REMEMBER TO TRANSFER THE PRIZES TO THE CONVERTER CONTRACT!!!");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
