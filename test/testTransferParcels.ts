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
import { expect } from "chai";

import { main } from "../scripts/startLandRaffle1";

describe("Testing transfer parcels", function () {
  const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
  const realmDiamond = "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11";
  let convertContract: string;
  let voucherAddress: string;
  let testClaim: TestConvert;
  let transferPortal: TransferPortals;
  let erc1155: ERC1155Voucher;
  let erc721: IERC721;
  const owner = "0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5";

  before(async function () {
    const res = await main();
    convertContract = res.convertAddress;
    voucherAddress = res.voucherAddress;
  });

  it("Should transfer ERC721 to convert contract", async function () {
    //impersonate account with parcels
    erc721 = (await ethers.getContractAt(
      "contracts/interfaces/IERC721.sol:IERC721",
      realmDiamond
    )) as IERC721;
    erc721 = (await impersonate(owner, erc721, ethers, network)) as IERC721;

    await erc721["safeTransferFrom(address,address,uint256)"](
      "0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5",
      convertContract,
      "2258"
    );

    await erc721["safeTransferFrom(address,address,uint256)"](
      "0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5",
      convertContract,
      "22518"
    );

    const ownerBalance = await erc721.balanceOf(owner);
    expect(ownerBalance).to.equal(0);

    const convertBalance = await erc721.balanceOf(convertContract);
    expect(convertBalance).to.equal(2);
  });

  it("Should transfer voucher to testclaim contract", async function () {
    //use itemManager to convert parcels
    transferPortal = (await ethers.getContractAt(
      "TransferPortals",
      convertContract
    )) as TransferPortals;

    erc1155 = (await ethers.getContractAt(
      "ERC1155Voucher",
      voucherAddress
    )) as ERC1155Voucher;
    erc1155 = await impersonate(itemManager, erc1155, ethers, network);

    //contract should fail
    let testClaimFactory: ContractFactory = (await ethers.getContractFactory(
      "TestConvert"
    )) as ContractFactory;

    testClaim = (await testClaimFactory.deploy(
      convertContract,
      voucherAddress
    )) as TestConvert;
    await testClaim.deployed();

    //transfer voucher to testClaim contract
    await erc1155.safeTransferFrom(
      itemManager,
      testClaim.address,
      "0",
      "1",
      []
    );
    let balance = await erc1155.balanceOf(itemManager, "0");
    expect(balance).to.equal(3999);

    balance = await erc1155.balanceOf(testClaim.address, "0");
    expect(balance).to.equal(1);
  });

  it("EOA should be able to reclaim ERC721 ", async function () {
    erc1155 = await impersonate(itemManager, erc1155, ethers, network);
    await erc1155.setApprovalForAll(convertContract, true);

    transferPortal = await impersonate(
      itemManager,
      transferPortal,
      ethers,
      network
    );

    //@ts-ignore
    let backendSigner = new ethers.Wallet(process.env.GBM_PK);

    let balance = await erc1155.balanceOf(itemManager, "0");

    let messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256"],
      [itemManager, "1", balance.toString()]
    );

    let signedMessage = await backendSigner.signMessage(
      ethers.utils.arrayify(messageHash)
    );
    // console.log("signed message:", signedMessage);
    let signature = ethers.utils.arrayify(signedMessage);

    balance = await erc721.balanceOf(itemManager);
    expect(balance).to.equal(0);

    await transferPortal.transferERC721FromVoucher("1", signature);

    balance = await erc721.balanceOf(itemManager);
    expect(balance).to.equal(1);
  });

  it("Contract cannot claim parcel", async function () {
    //@ts-ignore
    let backendSigner = new ethers.Wallet(process.env.GBM_PK);

    let balance = await erc1155.balanceOf(testClaim.address, "0");

    //claimer, amount, balance
    let messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256"],
      [testClaim.address, "1", balance.toString()]
    );

    let signedMessage = await backendSigner.signMessage(
      ethers.utils.arrayify(messageHash)
    );
    // console.log("signed message:", signedMessage);
    let signature = ethers.utils.arrayify(signedMessage);

    await expect(testClaim.testConversion(signature)).to.be.revertedWith(
      "Not authorized, fren"
    );
  });
});
