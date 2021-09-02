/* global ethers */

async function main(vrfCoordinator, linkAddress, keyHash, fee) {
  const accounts = await ethers.getSigners();
  const account = await accounts[0].getAddress();

  const testing = ["hardhat"].includes(hre.network.name);
  let itemManager = "0x585E06CA576D0565a035301819FD2cfD7104c1E8";

  /* if (testing) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [itemManager],
    });
    signer = await ethers.provider.getSigner(itemManager);
  } else signer = accounts[0];
  */

  const RafflesContract = await ethers.getContractFactory("RafflesContract");
  const rafflesContract = await RafflesContract.deploy(
    itemManager,
    vrfCoordinator,
    linkAddress,
    keyHash,
    fee
  );
  await rafflesContract.deployed();
  console.log("Deployed RaffleContract:" + rafflesContract.address);
  console.log();
  return rafflesContract.address;
}

if (require.main === module) {
  main(vrfCoordinator, linkAddress, keyHash)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deployContracts = main;
