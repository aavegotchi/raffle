/* global ethers hre */
import { ethers, network } from "hardhat";
import { impersonate } from "../helpers";

import { TransferPortals } from "../typechain-types/TransferPortals";
import { ERC1155Voucher } from "../typechain-types/ERC1155Voucher";
import { IERC721 } from "../typechain-types/IERC721";

export async function main() {
  //Setup the variables
  const itemManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
  const realmDiamond = "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11";

  const convertContract = "0x038d7eD80A500D2D181f67fd0DF60c57628Dcc7C";
  let convertVoucher: TransferPortals = (await ethers.getContractAt(
    "TransferPortals",
    convertContract
  )) as TransferPortals;

  convertVoucher = (await impersonate(
    itemManager,
    convertVoucher,
    ethers,
    network
  )) as TransferPortals;

  let voucher = (await ethers.getContractAt(
    "ERC1155Voucher",
    "0x8f1C6Dc1de3bbe5AA3Cf24B720bf7aE0a3cF97d0"
  )) as ERC1155Voucher;
  voucher = await impersonate(itemManager, voucher, ethers, network);

  let tx = await voucher.setApprovalForAll(convertContract, true);
  await tx.wait();

  const approved = await voucher.isApprovedForAll(itemManager, convertContract);
  console.log("approved:", approved);

  tx = await convertVoucher.transferPortalsFromVoucher("3");
  await tx.wait();

  let voucherBalance = await voucher.balanceOf(itemManager, "0");
  console.log("IM balance:", voucherBalance.toString());

  voucherBalance = await voucher.balanceOf(convertContract, "0");
  console.log("Convert contract balance:", voucherBalance.toString());

  const erc721 = (await ethers.getContractAt(
    "IERC721",
    realmDiamond
  )) as IERC721;

  let nftBalance = await erc721.balanceOf(itemManager);
  console.log("im nft balance:", nftBalance.toString());

  nftBalance = await erc721.balanceOf(convertContract);
  console.log("convert nft balance:", nftBalance.toString());
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
