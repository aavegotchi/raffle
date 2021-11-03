/* global ethers hre */
import { run } from "hardhat";
import { StartDropRaffleTaskArgs } from "../tasks/startDropRaffle";

export async function main() {
  const taskArgs: StartDropRaffleTaskArgs = {
    prizeAddress: "",
    prizeAmount: "4000",
    duration: "72",
  };

  await run("startDropRaffle", taskArgs);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
