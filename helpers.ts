import { HardhatRuntimeEnvironment } from "hardhat/types";

const {
  LedgerSigner,
} = require("../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets");

//Raffle contract
export const maticRafflesAddress = "0x6c723cac1E35FE29a175b287AE242d424c52c1CE";

export const maticTicketAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";

export const gasPrice = 100000000000;

export async function getLedgerSigner(
  hre: HardhatRuntimeEnvironment,
  deployer: string
) {
  let testing = ["hardhat", "localhost"].includes(hre.network.name);

  if (testing) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [deployer],
    });
    return await hre.ethers.getSigner(deployer);
  } else {
    return new LedgerSigner(hre.ethers.provider, "hid", "m/44'/60'/2'/0/0");
  }
}
