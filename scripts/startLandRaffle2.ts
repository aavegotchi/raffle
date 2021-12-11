/* global ethers hre */
import { run } from "hardhat";
import { DeployRaffleVoucherArgs } from "../tasks/deployRaffleVoucher";
import { DeployRealmConverterTaskArgs } from "../tasks/deployRealmConverter";
import { StartRealmRaffleTaskArgs } from "../tasks/startRealmRaffle";

export async function main() {
  //Setup the variables
  const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
  const realmDiamond = "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11";
  const raffleDuration = /*3600 * 72 +*/ (60 * 10).toString(); //"73"; //in hours
  const voucherIds = ["0", "1", "2", "3"];
  const quantities = ["1", "1", "1", "1"];

  // //First deploy the Voucher to be used as the Raffle Prize
  const deployVoucherTaskArgs: DeployRaffleVoucherArgs = {
    deployer: itemManager,
    quantities: quantities.join(","),
    voucherIds: voucherIds.join(","),
  };

  const voucherAddress = await run(
    "deployRaffleVoucher",
    deployVoucherTaskArgs
  );

  //Then deploy the converter contract that is used to convert vouchers into ERC721
  const deployConverterTaskArgs: DeployRealmConverterTaskArgs = {
    voucherAddress: voucherAddress,
    erc721TokenAddress: realmDiamond,
    deployer: itemManager,
    voucherIds: voucherIds.join(","),
  };
  const convertAddress = await run(
    "deployRealmConverter",
    deployConverterTaskArgs
  );

  //Then start the raffle, using the voucher address as the prize
  const startRealmRaffleTaskArgs: StartRealmRaffleTaskArgs = {
    prizeAddress: voucherAddress,
    prizeAmounts: quantities.join(","),
    duration: raffleDuration,
    deployer: itemManager,
  };

  await run("startRealmRaffle", startRealmRaffleTaskArgs);

  // console.log("REMEMBER TO TRANSFER THE PRIZES TO THE CONVERTER CONTRACT!!!");

  return {
    voucherAddress: "0xCCC9087e6511dE330e2213600540ffe87E75145a",
    convertAddress: convertAddress,
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
