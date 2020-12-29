/* global ethers */

async function main (vrfCoordinator, linkAddress, keyHash, fee) {
  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()

  // const AavePrizesContract = await ethers.getContractFactory('VouchersContract')
  // const aavePrizesContract = await AavePrizesContract.deploy(account)
  // console.log('Deployed AavePrizesContract:' + aavePrizesContract.address)

  const RafflesContract = await ethers.getContractFactory('RafflesContract')
  const rafflesContract = await RafflesContract.deploy(account, vrfCoordinator, linkAddress, keyHash, fee)
  await rafflesContract.deployed()
  console.log('Deployed RaffleContract:' + rafflesContract.address)
  console.log()
  // return [aavePrizesContract.address, rafflesContract.address]
  return rafflesContract.address
}
/*
if (require.main === module) {
  main(vrfCoordinator, linkAddress, keyHash)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
*/
exports.deployContracts = main
