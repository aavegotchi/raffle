/* global ethers hre */
import { run, ethers, network } from "hardhat";
import { gasPrice, impersonate } from "../helpers";

import { IERC721 } from "../typechain-types/IERC721";

import { TransferRealm } from "../typechain-types/TransferRealm";

export async function main() {
  //Setup the variables
  const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
  const realmDiamond = "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11";
  const convertContract = "0xd5724BCA82423D5792C676cd453c1Bf66151dC04";

  //impersonate account with parcels
  let erc721: IERC721 = (await ethers.getContractAt(
    "contracts/interfaces/IERC721.sol:IERC721",
    realmDiamond
  )) as IERC721;

  const accounts = await ethers.getSigners();

  console.log("account:", accounts[0]);

  //use itemManager to convert parcels
  let convert: TransferRealm = (await ethers.getContractAt(
    "TransferRealm",
    convertContract,
    accounts[0]
  )) as TransferRealm;

  if (["hardhat", "localhost"].includes(network.name)) {
    convert = await impersonate(itemManager, convert, ethers, network);
  }

  const bal = await erc721.balanceOf(convertContract);
  console.log("bal:", bal.toString());

  const beforeBal = await erc721.balanceOf(itemManager);
  console.log("before:", beforeBal.toString());

  // convert = await impersonate(itemManager, convert, ethers, network);

  const tx = await convert.estimateGas.withdrawPortals("0", "10", {
    gasPrice: gasPrice,
  });

  console.log("tx:", tx.toString());

  // const receipt = await tx.wait();

  // console.log("receipt:", receipt.gasUsed.toString());

  const afterBal = await erc721.balanceOf(itemManager);
  console.log("after:", afterBal.toString());
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
