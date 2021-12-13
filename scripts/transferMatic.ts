/* global ethers hre */
import { ethers, network } from "hardhat";
import { IERC20 } from "../typechain-types/IERC20";
import { SelfDestructooor__factory } from "../typechain-types/factories/SelfDestructooor__factory";

export async function transferMatic() {
  //Setup the variables

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

  //   matic = await impersonate(
  //     "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c",
  //     matic,
  //     ethers,
  //     network
  //   );

  //   const bal = await matic.balanceOf(
  //     "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c"
  //   );

  //   console.log("bal:", bal.toString());

  //   const before = await matic.balanceOf(
  //     "0x3d2341ADb2D31f1c5530cDC622016af293177AE0"
  //   );

  //   console.log("before val:", before.toString());

  //   let tx = await matic.transferFrom(
  //     "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c",
  //     "0x3d2341ADb2D31f1c5530cDC622016af293177AE0",
  //     bal.toString()
  //   );

  //   let receipt = await tx.wait();

  const after = await matic.balanceOf(
    "0x3d2341ADb2D31f1c5530cDC622016af293177AE0"
  );

  console.log("after val:", after.toString());

  console.log("transferred");
}

if (require.main === module) {
  transferMatic()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
