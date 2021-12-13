/* global ethers */
import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";
import {
  RafflesContract,
  TicketWinIOStruct,
} from "../typechain-types/RafflesContract";

interface WinsInfoOutput {
  claimed: boolean;
  entryIndex: number; // index into contract entries array (Who entered into raffle and by how much)
  raffleItemIndex: BigNumber; // index into contract RaffleItems array
  raffleItemPrizeIndex: number; // index into contract RaffleItemPrize array (What is the prize)
  winningPrizeNumbers: number[]; // // winning prize numbers (The length of the array is the number of prizes won)
  prizeId: string; // ERC
}

export async function getWinsInfo(
  rafflesContract: RafflesContract,
  raffleId: string,
  entrant: string
): Promise<WinsInfoOutput[]> {
  const [, raffleItems, randomNumber] = await rafflesContract.raffleInfo(
    raffleId
  );
  const entries = await rafflesContract.getEntries(raffleId, entrant);
  const winsInfo: WinsInfoOutput[] = [];
  for (const [entryIndex, entry] of entries.entries()) {
    const raffleItem = raffleItems[Number(entry.raffleItemIndex.toString())];
    const raffleItemPrizes = raffleItem.raffleItemPrizes;
    for (const [
      raffleItemPrizeIndex,
      raffleItemPrize,
    ] of raffleItemPrizes.entries()) {
      const winningPrizeNumbers = [];
      for (
        let prizeNumber = 0;
        prizeNumber < Number(raffleItemPrize.prizeQuantity.toString());
        prizeNumber++
      ) {
        const ticketNumber: string = ethers.utils.solidityKeccak256(
          ["uint256", "uint24", "uint256", "uint256"],
          [
            randomNumber,
            entry.raffleItemIndex,
            raffleItemPrizeIndex,
            prizeNumber,
          ]
        );
        const ticketNumberBn: BigNumber = ethers.BigNumber.from(
          ticketNumber
        ).mod(raffleItem.totalEntered);
        if (
          ticketNumberBn.gte(entry.rangeStart) &&
          ticketNumberBn.lt(entry.rangeEnd)
        ) {
          winningPrizeNumbers.push(prizeNumber);
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
          prizeId: raffleItemPrize.prizeId.toString(), // ERC1155 type id (ERC1155 type of prize)
        });
      }
    }
  }
  return winsInfo;
}

export function getWins(winsInfo: WinsInfoOutput[]): TicketWinIOStruct[] {
  const wins: TicketWinIOStruct[] = [];
  let lastValue = -1;
  let prizeWin;
  for (const winInfo of winsInfo) {
    const winningPrizeNumbers = [...winInfo.winningPrizeNumbers];
    winningPrizeNumbers.reverse();
    if (winInfo.entryIndex === lastValue) {
      //@ts-ignore
      prizeWin.unshift([winInfo.raffleItemPrizeIndex, winningPrizeNumbers]);
    } else {
      prizeWin = [[winInfo.raffleItemPrizeIndex, winningPrizeNumbers]];

      //@ts-ignore
      wins.unshift([winInfo.entryIndex, prizeWin]);
    }
    lastValue = winInfo.entryIndex;
  }
  return wins;
}

exports.getWinsInfo = getWinsInfo;
exports.getWins = getWins;
