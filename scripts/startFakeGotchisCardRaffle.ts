/* global ethers hre */
import { run } from "hardhat";
import { StartDropRaffleTaskArgs } from "../tasks/startDropRaffle";

export async function main() {
  // Setup the variables
  const fakeGotchisCard = "0x9f6BcC63e86D44c46e85564E9383E650dc0b56D7";
  const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
  const prizeAmount = "1500";
  const raffleDuration = (3600 * 72 + 1800).toString(); //in seconds
  const voucherId = "0";

  // Then start the raffle, using the voucher address as the prize
  const startDropRaffleTaskArgs: StartDropRaffleTaskArgs = {
    prizeAddress: fakeGotchisCard,
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
