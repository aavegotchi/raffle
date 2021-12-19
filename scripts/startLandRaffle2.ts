/* global ethers hre */
import { run, ethers, network } from "hardhat";
import {
  impersonate,
  maticRafflesAddress,
  maticTicketAddress,
} from "../helpers";
import { DeployRaffleVoucherArgs } from "../tasks/deployRaffleVoucher";
import { DeployRealmConverterTaskArgs } from "../tasks/deployRealmConverter";
import { StartRealmRaffleTaskArgs } from "../tasks/startRealmRaffle";
import { RafflesContract } from "../typechain-types/RafflesContract";
import { getWins, getWinsInfo } from "./getWins";
import { SelfDestructooor__factory } from "../typechain-types/factories/SelfDestructooor__factory";
import { IERC20 } from "../typechain-types/IERC20";
import { TransferRealm } from "../typechain-types/TransferRealm";
import { ERC1155Voucher } from "../typechain-types/ERC1155Voucher";

export async function main() {
  //Setup the variables
  const itemManager = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
  const realmDiamond = "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11";
  const raffleDuration = (3600 * 72 + 60 * 10).toString(); //ends in 72 hours and 10 mins
  const voucherIds = ["0", "1", "2", "3"];

  //humble, reasonable, spacious-ver, spacious-hor
  const quantities = ["1217", "1217", "373", "193"];

  // // //First deploy the Voucher to be used as the Raffle Prize
  // const deployVoucherTaskArgs: DeployRaffleVoucherArgs = {
  //   deployer: itemManager,
  //   quantities: quantities.join(","),
  //   voucherIds: voucherIds.join(","),
  // };

  // const voucherAddress = await run(
  //   "deployRaffleVoucher",
  //   deployVoucherTaskArgs
  // );

  // //Then deploy the converter contract that is used to convert vouchers into ERC721
  // const deployConverterTaskArgs: DeployRealmConverterTaskArgs = {
  //   voucherAddress: voucherAddress,
  //   erc721TokenAddress: realmDiamond,
  //   deployer: itemManager,
  //   voucherIds: voucherIds.join(","),
  // };
  // const convertAddress = await run(
  //   "deployRealmConverter",
  //   deployConverterTaskArgs
  // );

  // let voucher = (await ethers.getContractAt(
  //   "ERC1155Voucher",
  //   voucherAddress
  // )) as ERC1155Voucher;

  // const balance = await voucher.balanceOfBatch(
  //   [itemManager, itemManager, itemManager, itemManager],
  //   ["0", "1", "2", "3"]
  // );
  // console.log("item manager baances:", balance.toString());

  let voucherAddress = "0x96ac66A3BF1305e06c722e37f8a2706c4E38Bc77";
  let convertAddress = "0xd5724BCA82423D5792C676cd453c1Bf66151dC04";
  // let converrter

  //Then start the raffle, using the voucher address as the prize
  // const startRealmRaffleTaskArgs: StartRealmRaffleTaskArgs = {
  //   prizeAddress: voucherAddress,
  //   prizeAmounts: quantities.join(","),
  //   duration: raffleDuration,
  //   deployer: itemManager,
  // };

  // await run("startRealmRaffle", startRealmRaffleTaskArgs);

  // console.log("REMEMBER TO TRANSFER THE PRIZES TO THE CONVERTER CONTRACT!!!");

  // Enter tickets

  let raffle = (await ethers.getContractAt(
    "RafflesContract",
    maticRafflesAddress
  )) as RafflesContract;

  // raffle = await impersonate(
  //   "0x51208e5cC9215c6360210C48F81C8270637a5218",
  //   raffle,
  //   ethers,
  //   network
  // );

  // await raffle.enterTickets("7", [
  //   { ticketAddress: maticTicketAddress, ticketId: "6", ticketQuantity: "10" },
  // ]);

  //Raffle ends
  ethers.provider.send("evm_increaseTime", [86401]);

  //draw number
  await raffle.drawRandomNumber("7");

  //fulfill randomness
  const vrfCoordinator = "0x3d2341ADb2D31f1c5530cDC622016af293177AE0";

  raffle = await impersonate(vrfCoordinator, raffle, ethers, network);

  const keyhash =
    "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da";

  const encodedVrfSeed = ethers.utils.defaultAbiCoder.encode(
    ["bytes32", "uint256", "address", "uint256"],
    [keyhash, "0", "0x6c723cac1E35FE29a175b287AE242d424c52c1CE", "5"]
  );

  const vrfSeed = ethers.utils.keccak256(encodedVrfSeed);

  const requestIdEncoded = ethers.utils.defaultAbiCoder.encode(
    ["bytes32", "uint256"],
    [keyhash, vrfSeed]
  );

  const requestId = ethers.utils.keccak256(requestIdEncoded);

  console.log("request id:", requestId);

  const selfdestruct = (await ethers.getContractFactory(
    "SelfDestructooor"
  )) as SelfDestructooor__factory;

  const deployed = await selfdestruct.deploy(
    "0x3d2341ADb2D31f1c5530cDC622016af293177AE0"
  );
  const selfdestructooor = await deployed.deployed();

  await selfdestructooor.deposit({
    value: ethers.utils.parseEther("0.1"),
  });

  await selfdestructooor.withdraw();

  let matic = (await ethers.getContractAt(
    "IERC20",
    "0x0000000000000000000000000000000000001010"
  )) as IERC20;

  const after = await matic.balanceOf(
    "0x3d2341ADb2D31f1c5530cDC622016af293177AE0"
  );

  console.log("after val:", after.toString());

  console.log("transferred");

  await raffle?.rawFulfillRandomness(requestId, "10000");

  // //claim tickets
  // const winsInfo = await getWinsInfo(
  //   raffle,
  //   "7",
  //   "0x51208e5cC9215c6360210C48F81C8270637a5218"
  // );

  // console.log("wins info:", winsInfo);

  // const wins = await getWins(winsInfo);

  // console.log("wins:", wins);

  // raffle = await impersonate(
  //   "0x51208e5cC9215c6360210C48F81C8270637a5218",
  //   raffle,
  //   ethers,
  //   network
  // );

  // //mint prizes
  // // await erc721.mint(convertAddress, "200");

  // console.log("claiming prizes");
  // await raffle.claimPrize(
  //   "7",
  //   "0x51208e5cC9215c6360210C48F81C8270637a5218",
  //   wins
  // );

  // //convert
  // let realmConverter = (await ethers.getContractAt(
  //   "TransferRealm",
  //   convertAddress
  // )) as TransferRealm;
  // realmConverter = await impersonate(
  //   "0x51208e5cC9215c6360210C48F81C8270637a5218",
  //   realmConverter,
  //   ethers,
  //   network
  // );

  // voucher = await impersonate(
  //   "0x51208e5cC9215c6360210C48F81C8270637a5218",
  //   voucher,
  //   ethers,
  //   network
  // );
  // await voucher.setApprovalForAll(convertAddress, true);

  return {
    voucherAddress: voucherAddress,
    convertAddress: convertAddress,
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
