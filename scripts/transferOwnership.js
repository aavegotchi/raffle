//@ts-ignore

const gasPrice = 20000000000;

async function transferOwner() {
  const accounts = await ethers.getSigners();

  //raffle matic
  const contractAddress = "0x6c723cac1E35FE29a175b287AE242d424c52c1CE";
  let currentOwner = "0x585E06CA576D0565a035301819FD2cfD7104c1E8";
  let signer;

  // deploy DiamondCutFacet

  const testing = ["hardhat", "localhost"].includes(hre.network.name);

  if (testing) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [currentOwner],
    });
    signer = await ethers.provider.getSigner(currentOwner);
  } else if (hre.network.name === "matic") {
    signer = accounts[0];
  } else {
    throw Error("Incorrect network selected");
  }

  //transfer ownership to multisig
  const transferContract = await ethers.getContractAt(
    "RafflesContract",
    contractAddress,
    signer
  );

  currentOwner = await transferContract.owner();
  console.log("old owner:", currentOwner);

  const newOwner = "0x8D46fd7160940d89dA026D59B2e819208E714E82";
  const tx = await transferContract.transferOwnership(newOwner);
  await tx.wait();

  currentOwner = await transferContract.owner();
  console.log("new owner:", currentOwner);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  transferOwner()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deployDiamond = transferOwner;
