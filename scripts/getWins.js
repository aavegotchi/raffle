/* global ethers */

async function getWinsInfo (rafflesContract, raffleId, entrant) {
  const [, raffleItems, randomNumber] = await rafflesContract.raffleInfo(raffleId)
  const entries = await rafflesContract.getEntries(raffleId, entrant)
  const winsInfo = []
  for (const [entryIndex, entry] of entries.entries()) {
    const raffleItem = raffleItems[entry.raffleItemIndex]
    const raffleItemPrizes = raffleItem.raffleItemPrizes
    for (const [raffleItemPrizeIndex, raffleItemPrize] of raffleItemPrizes.entries()) {
      const winningPrizeNumbers = []
      for (let prizeNumber = 0; prizeNumber < raffleItemPrize.prizeQuantity; prizeNumber++) {
        let ticketNumber = ethers.utils.solidityKeccak256(['uint256', 'uint24', 'uint256', 'uint256'], [randomNumber, entry.raffleItemIndex, raffleItemPrizeIndex, prizeNumber])
        ticketNumber = ethers.BigNumber.from(ticketNumber).mod(raffleItem.totalEntered)
        if (ticketNumber.gte(entry.rangeStart) && ticketNumber.lt(entry.rangeEnd)) {
          winningPrizeNumbers.push(prizeNumber)
        }
      }
      if (winningPrizeNumbers.length > 0) {
        // Ticket numbers are numbers between 0 and raffleItem.totalEntered - 1 inclusive.
        // Winning ticket numbers are ticket numbers that won one or more prizes
        // Prize numbers are numbers between 0 and raffleItemPrize.prizeQuanity - 1 inclusive.
        // Prize numbers are used to calculate ticket numbers
        // Winning prize numbers are prize numbers used to calculate winning ticket numbers
        winsInfo.push({
          claimed: entry.prizesClaimed,
          entryIndex: entryIndex, // index into contract entries array (Who entered into raffle and by how much)
          raffleItemIndex: entry.raffleItemIndex, // index into contract RaffleItems array
          raffleItemPrizeIndex: raffleItemPrizeIndex, // index into contract RaffleItemPrize array (What is the prize)
          winningPrizeNumbers: winningPrizeNumbers, // // winning prize numbers (The length of the array is the number of prizes won)
          prizeId: raffleItemPrize.prizeId.toString() // ERC1155 type id (ERC1155 type of prize)
        })
      }
    }
  }
  return winsInfo
}

function getWins (winsInfo) {
  const wins = []
  let lastValue = -1
  let prizeWin
  for (const winInfo of winsInfo) {
    const winningPrizeNumbers = [...winInfo.winningPrizeNumbers]
    winningPrizeNumbers.reverse()
    if (winInfo.entryIndex === lastValue) {
      prizeWin.unshift([winInfo.raffleItemPrizeIndex, winningPrizeNumbers])
    } else {
      prizeWin = [[winInfo.raffleItemPrizeIndex, winningPrizeNumbers]]
      wins.unshift([
        winInfo.entryIndex,
        prizeWin
      ])
    }
    lastValue = winInfo.entryIndex
  }
  return wins
}

exports.getWinsInfo = getWinsInfo
exports.getWins = getWins
