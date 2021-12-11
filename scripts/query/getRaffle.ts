/* global ethers hre */
// import { LedgerSigner } from "@ethersproject/hardware-wallets";
import { ethers } from "hardhat";
import { RafflesContract } from "../../typechain-types/RafflesContract";

export async function main() {
  const accounts = await ethers.getSigners();
  // const account = await accounts[0].getAddress();

  //Raffle contract
  const rafflesAddress = "0x6c723cac1E35FE29a175b287AE242d424c52c1CE";

  const raffleContract = (await ethers.getContractAt(
    "RafflesContract",
    rafflesAddress
  )) as RafflesContract;
  const getRaffle = await (
    await raffleContract.raffleInfo("6")
  ).raffleItems_[0];
  console.log("get raffle:", getRaffle);
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
