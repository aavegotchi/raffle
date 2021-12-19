/* global ethers hre */
import { run } from "hardhat";

export async function main() {
  const voucherIds = ["0", "1", "2", "3"];
  const quantities = ["1217", "1217", "373", "193"];

  const constructorArgs = [voucherIds, quantities];

  await run("verify:verify", {
    address: "0x96ac66A3BF1305e06c722e37f8a2706c4E38Bc77",
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
