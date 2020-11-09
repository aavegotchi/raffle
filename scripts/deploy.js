/* global ethers */

async function main (vrfCoordinator, linkAddress, keyHash, fee) {
  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()

  const VouchersContract = await ethers.getContractFactory('VouchersContract')
  const vouchersContract = await VouchersContract.deploy(account)
  await vouchersContract.deployed()
  console.log('Deployed VouchersContract:' + vouchersContract.address)

  const RafflesContract = await ethers.getContractFactory('RafflesContract')
  const rafflesContract = await RafflesContract.deploy(account, vrfCoordinator, linkAddress, keyHash, fee)
  await rafflesContract.deployed()
  console.log('Deployed RaffleContract:' + rafflesContract.address)
  console.log()
  return [vouchersContract.address, rafflesContract.address]
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
