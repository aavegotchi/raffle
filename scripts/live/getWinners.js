/* global ethers */
// const fs = require('fs')
// const { ethers } = require('ethers')
const { raffleInfo, userEntries } = require('./raffle0WinnersData.js')

function getWins (entrantAddress, winners) {
  const wins = []
  let lastValue = -1
  let prizeWin
  for (const winner of winners) {
    if (winner.entrant === entrantAddress) {
      const winningPrizeNumbers = [...winner.winningPrizeNumbers]
      winningPrizeNumbers.reverse()
      if (Number(winner.userEntryIndex) === lastValue) {
        prizeWin.unshift([winner.raffleItemPrizeIndex, winningPrizeNumbers])
      } else {
        prizeWin = [[winner.raffleItemPrizeIndex, winningPrizeNumbers]]
        wins.unshift([
          winner.userEntryIndex,
          prizeWin
        ])
      }
      lastValue = Number(winner.userEntryIndex)
    }
  }
  return wins
}
exports.getWins = getWins

function toBig (value) {
  return ethers.BigNumber.from(value.hex)
}

async function getWinners (raffleId, entrant, raffleContract) {
  const winners = []
  const randomNumber = toBig(raffleInfo.randomNumber)
  const raffleItems = raffleInfo.raffleItems
  if (randomNumber.eq(0)) {
    throw Error('random number not drawn for raffle')
  }
  const entries = userEntries[entrant]
  // console.log(entries)
  for (let userEntryIndex = 0; userEntryIndex < entries.length; userEntryIndex++) {
    const raffleItemIndex = entries[userEntryIndex][0]
    const rangeStart = toBig(entries[userEntryIndex][1])
    const rangeEnd = toBig(entries[userEntryIndex][2])
    const totalEntered = toBig(raffleItems[raffleItemIndex].totalEntered)
    const raffleItemPrizes = raffleItems[raffleItemIndex].raffleItemPrizes
    for (let raffleItemPrizeIndex = 0; raffleItemPrizeIndex < raffleItemPrizes.length; raffleItemPrizeIndex++) {
      const winningPrizeNumbers = []
      // console.log(raffleItemPrizes[raffleItemPrizeIndex].prizeQuantity)
      // const prizeAddress = raffleItemPrizes[raffleItemPrizeIndex][0]
      const prizeId = toBig(raffleItemPrizes[raffleItemPrizeIndex][1])
      const prizeQuantity = toBig(raffleItemPrizes[raffleItemPrizeIndex][2])
      for (let prizeNumber = 0; prizeNumber < prizeQuantity; prizeNumber++) {
        let ticketNumber = ethers.utils.solidityKeccak256(['uint256', 'uint32', 'uint256', 'uint256'], [randomNumber, raffleItemIndex, raffleItemPrizeIndex, prizeNumber])
        // console.log(ticketNumber, totalEntered)
        ticketNumber = ethers.BigNumber.from(ticketNumber).mod(totalEntered)
        if (ticketNumber.gte(rangeStart) && ticketNumber.lt(rangeEnd)) {
          winningPrizeNumbers.push(prizeNumber)
        }
      }
      if (winningPrizeNumbers.length > 0) {
        winners.push({
          entrant: entrant,
          claimed: false,
          userEntryIndex: userEntryIndex,
          raffleItemIndex: raffleItemIndex,
          raffleItemPrizeIndex: raffleItemPrizeIndex,
          winningPrizeNumbers: winningPrizeNumbers,
          prizeId: prizeId.toString()
        })
      }
    }
  }
  return winners
}

exports.getWinners = getWinners

// function getRaffleItemIndex (raffleItems, ticketAddress, ticketId) {
//   for (let i = 0; i < raffleItems.length; i++) {
//     const raffleItemTicketId = toBig(raffleItems[i].ticketId)
//     if (raffleItems[i].ticketAddress === ticketAddress &&
//         raffleItemTicketId.eq(ticketId)) {
//       return i
//     }
//   }
//   throw Error('raffleItemIndex not found')
// }

// async function getUserEntries (raffleId, rafflesContract) {
//   const raffleItems = raffleInfo.raffleItems
//   const filter = rafflesContract.filters.RaffleTicketsEntered(0)
//   const events = await rafflesContract.queryFilter(filter)
//   const userEntries = {}
//   const ticketTotals = []
//   for (let i = 0; i < 6; i++) {
//     ticketTotals.push(ethers.BigNumber.from('0'))
//   }
//   for (const event of events) {
//     const [, entrant, ticketItems] = event.args
//     for (const ticketItem of ticketItems) {
//       let entries = userEntries[entrant]
//       if (entries === undefined) {
//         entries = []
//         userEntries[entrant] = entries
//       }
//       const raffleItemIndex = getRaffleItemIndex(raffleItems, ticketItem.ticketAddress, ticketItem.ticketId)
//       const total = ticketTotals[raffleItemIndex]
//       // console.log(ticketItem.ticketAddress, ticketItem.ticketId, raffleItemIndex, total)
//       entries.push([raffleItemIndex, total, total.add(ticketItem.ticketQuantity)])
//       ticketTotals[raffleItemIndex] = total.add(ticketItem.ticketQuantity)
//     }
//   }

//   fs.writeFileSync('./userEntries.js', JSON.stringify(userEntries))
// }

// get raffle info:
// let raffleInfo = await raffleContract.raffleInfo('0')
//   const ticketStats = await raffleContract.ticketStats('0')
//   const raffleItems = []
//   for (const raffleItem of raffleInfo.raffleItems_) {
//     let totalEntered
//     for (const ticketItem of ticketStats) {
//       if (ticketItem.ticketAddress === raffleItem.ticketAddress &&
//                 ticketItem.ticketId.eq(raffleItem.ticketId)) {
//         totalEntered = ticketItem.totalEntered
//         break
//       }
//     }
//     if (totalEntered === undefined) {
//       throw Error('raffle item not found')
//     }
//     raffleItems.push(
//       {
//         ticketAddress: raffleItem.ticketAddress,
//         ticketId: raffleItem.ticketId,
//         totalEntered: totalEntered,
//         raffleItemPrizes: raffleItem.raffleItemPrizes
//       }
//     )
//   }
//   raffleInfo = {
//     raffleItems: raffleItems,
//     randomNumber: raffleInfo.randomNumber_
//   }
//   // console.log(JSON.stringify(raffleInfo))
//   fs.writeFileSync('./raffleInfo.js', JSON.stringify(raffleInfo))

async function main () {
  // const accounts = await ethers.getSigners()
  // const account = await accounts[0].getAddress()
  // const account = '0x0b22380B7c423470979AC3eD7d3c07696773dEa1'
  // const account = '0x5f4c72567e8fC2Dad577532e4f1339EdBD161DC7'
  const account = '0x2c123fc5C27888571CD525e8ae9b0c5ff848386D'

  const rafflesContract = await ethers.getContractAt('RafflesContract', '0x144d196Bf99a4EcA33aFE036Da577d7D66583DB6')
  const winners1 = await getWinners('0', account, rafflesContract)
  console.log(JSON.stringify(winners1))
  //const winners2 = await rafflesContract['winners(uint256,address[])']('0', [account])
  //console.log(winners2)

//   const entrants = await rafflesContract.getEntrants('0')

//   let totalPeople = 0
//   let skippedPeople = 0
//   for (const entrant of entrants) {
//     totalPeople++
//     console.log('Showing: ' + entrant)
//     const skip = ['0xCabdBFCf0aA88743D0552f4FAb6b7B8203A3cdE2', '0x2c123fc5C27888571CD525e8ae9b0c5ff848386D']    
//     if (skip.includes(entrant)) {
//       skippedPeople++
//       console.log('Out of gas so skipped')
//       continue
//     }
//     const account = entrant
//     const winners1 = await getWinners('0', account, rafflesContract)
//     const winners2 = await rafflesContract['winners(uint256,address[])']('0', [account])
//     // console.log(winners1)
//     // console.log('--------------')
//     const winnersFormatted = []
//     for (const winner of winners2) {
//       const winningNumbers = []
//       for (const num of winner.winningPrizeNumbers) {
//         winningNumbers.push(Number(num))
//       }
//       winnersFormatted.push({
//         entrant: winner.entrant,
//         claimed: false,
//         userEntryIndex: Number(winner.userEntryIndex),
//         raffleItemIndex: Number(winner.raffleItemIndex),
//         raffleItemPrizeIndex: Number(winner.raffleItemPrizeIndex),
//         winningPrizeNumbers: winningNumbers,
//         prizeId: winner.prizeId
//       })
//     }
//     // console.log(winnersFormatted)
//     console.log(JSON.stringify(getWins(account, winnersFormatted)) === JSON.stringify(getWins(account, winners1)))
//   }
//   // const userEntries = await getUserEntries('0', rafflesContract)
//   console.log('totalPeople:' + totalPeople)
//   console.log('skipped people:' + skippedPeople)
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
