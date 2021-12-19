/* global ethers hre */
import { run } from "hardhat";

export async function main() {
  const constructorArgs = [
    "0x96ac66A3BF1305e06c722e37f8a2706c4E38Bc77",
    "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11",
  ];

  await run("verify:verify", {
    address: "0xd5724BCA82423D5792C676cd453c1Bf66151dC04",
    constructorArguments: constructorArgs,
  });
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
