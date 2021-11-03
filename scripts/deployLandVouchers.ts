import { run } from "hardhat";
import { DeployRaffleVoucherArgs } from "../tasks/deployRaffleVoucher";
import { DeployVoucherConverterTaskArgs } from "../tasks/deployVoucherConverter";

async function main() {
  const itemManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";

  const deployRaffleVoucherArgs: DeployRaffleVoucherArgs = {
    deployer: itemManager,
  };

  const voucherAddress = await run(
    "deployRaffleVoucher",
    deployRaffleVoucherArgs
  );
  console.log("Voucher deployed to address:", voucherAddress);

  const realmAddress = "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11";

  const converterArgs: DeployVoucherConverterTaskArgs = {
    voucherAddress: voucherAddress,
    erc721TokenAddress: realmAddress,
    deployer: itemManager,
  };
  await run("deployVoucherConverter", converterArgs);
}

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

exports.deploy = main;
