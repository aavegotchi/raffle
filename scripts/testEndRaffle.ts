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

import { TestERC721__factory } from "../typechain-types/factories/TestERC721__factory";
import { TestERC721 } from "../typechain-types/TestERC721";

export async function main() {
  //Setup the variables

  let raffle = (await ethers.getContractAt(
    "RafflesContract",
    maticRafflesAddress
  )) as RafflesContract;

  raffle = await impersonate(
    "0x51208e5cC9215c6360210C48F81C8270637a5218",
    raffle,
    ethers,
    network
  );

  //Raffle ends
  ethers.provider.send("evm_increaseTime", [86401 * 3]);

  //draw number
  await raffle.drawRandomNumber("9");

  //fulfill randomness
  const vrfCoordinator = "0x3d2341ADb2D31f1c5530cDC622016af293177AE0";

  raffle = await impersonate(vrfCoordinator, raffle, ethers, network);

  const keyhash =
    "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da";

  const encodedVrfSeed = ethers.utils.defaultAbiCoder.encode(
    ["bytes32", "uint256", "address", "uint256"],
    [keyhash, "0", "0x6c723cac1E35FE29a175b287AE242d424c52c1CE", "7"]
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

  //claim tickets
  const winsInfo = await getWinsInfo(
    raffle,
    "9",
    "0x51208e5cC9215c6360210C48F81C8270637a5218"
  );

  console.log("wins info:", winsInfo);

  const wins = await getWins(winsInfo);

  console.log("wins:", wins);

  raffle = await impersonate(
    "0x51208e5cC9215c6360210C48F81C8270637a5218",
    raffle,
    ethers,
    network
  );
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
