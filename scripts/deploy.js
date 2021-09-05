/* global ethers */

async function main(owner, vrfCoordinator, linkAddress, keyHash, fee) {
  const accounts = await ethers.getSigners();
  const account = await accounts[0].getAddress();

  const RafflesContract = await ethers.getContractFactory("RafflesContract");
  const rafflesContract = await RafflesContract.deploy(
    owner,
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
