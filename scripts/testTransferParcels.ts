/* global ethers hre */
import { run, ethers, network } from "hardhat";
import { impersonate } from "../helpers";
import { DeployRaffleVoucherArgs } from "../tasks/deployRaffleVoucher";
import { DeployVoucherConverterTaskArgs } from "../tasks/deployVoucherConverter";
import { StartDropRaffleTaskArgs } from "../tasks/startDropRaffle";
import { IERC721 } from "../typechain-types/IERC721";
import { TransferPortals } from "../typechain-types/TransferPortals";
import { ERC1155Voucher } from "../typechain-types/ERC1155Voucher";
import { TestConvert } from "../typechain-types/TestConvert";
import { ContractFactory } from "@ethersproject/contracts";
import { TestConvert__factory } from "../typechain-types/factories/TestConvert__factory";

export async function main() {
  //Setup the variables
  const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
  const realmDiamond = "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11";
  const prizeAmount = "4000";
  const raffleDuration = /*3600 * 72 +*/ (60 * 30).toString(); //"73"; //in hours
  const voucherId = "0";

  const convertContract = "0xA97946357a1f6C251b9d257833ab0233ed863527";
  const voucherAddress = "0xCCC9087e6511dE330e2213600540ffe87E75145a";
  const owner = "0x72cBf65c994A14cb0D36e112eD2C615027C6f0bd";

  //impersonate account with parcels
  let erc721: IERC721 = (await ethers.getContractAt(
    "contracts/interfaces/IERC721.sol:IERC721",
    realmDiamond
  )) as IERC721;
  erc721 = (await impersonate(owner, erc721, ethers, network)) as IERC721;

  // await erc721["safeTransferFrom(address,address,uint256)"](
  //   "0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5",
  //   convertContract,
  //   "2258"
  // );

  let ownerBalance = await erc721.balanceOf(owner);
  console.log("owner balance should be 1 now", ownerBalance.toString());
  //send parcel to conversion contract

  //use itemManager to convert parcels
  let convert: TransferPortals = (await ethers.getContractAt(
    "TransferPortals",
    convertContract
  )) as TransferPortals;

  let erc1155: ERC1155Voucher = (await ethers.getContractAt(
    "ERC1155Voucher",
    voucherAddress
  )) as ERC1155Voucher;
  erc1155 = await impersonate(owner, erc1155, ethers, network);

  //contract should fail
  // let testClaimFactory: ContractFactory = (await ethers.getContractFactory(
  //   "TestConvert"
  // )) as ContractFactory;

  // const testClaim: TestConvert = (await testClaimFactory.deploy(
  //   "0x5DbFEeF2dfF0D81C93b3a0f2479F14264904E936"
  // )) as TestConvert;
  // await testClaim.deployed();

  //transfer voucher to testClaim contract
  // await erc1155.safeTransferFrom(itemManager, testClaim.address, "0", "1", []);

  // await erc1155.setApprovalForAll(convertContract, true);

  // ownerBalance = await erc721.balanceOf(itemManager);
  convert = await impersonate(owner, convert, ethers, network);

  console.log("item manager balance should be 1 now", ownerBalance.toString());

  //@ts-ignore
  let backendSigner = new ethers.Wallet(process.env.GBM_PK);

  // bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, _amount, voucherBalance));

  const balance = await erc1155.balanceOf(owner, "0");

  console.log("erc1155 balance:", balance.toString());

  let messageHash = ethers.utils.solidityKeccak256(
    ["address", "uint256", "uint256"],
    [owner, "1", balance.toString()]
  );

  console.log("message hash:", messageHash);

  let signedMessage = await backendSigner.signMessage(
    ethers.utils.arrayify(messageHash)
  );
  // console.log("signed message:", signedMessage);
  let signature = ethers.utils.arrayify(signedMessage);

  const tx = await convert.transferERC721FromVoucher("1", signature);

  ownerBalance = await erc721.balanceOf(owner);
  console.log("owner balance should be 1 now", ownerBalance.toString());
  //write test smart contract to convert

  // await testClaim.testConversion();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
