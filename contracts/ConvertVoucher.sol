// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IAavegotchiFacet} from "./interfaces/IAavegotchiFacet.sol";

contract TransferPortals is Ownable, IERC721Receiver {
    // contract address for voucher erc1155
    address voucherContract;
    address erc721TokenAddress;
    bool isPaused = false;
    uint256 voucherId = 0;

    event VoucherContractSet(address voucherContract);
    event TokenAddressSet(address tokenAddress);

    constructor(address _voucherContract, address _tokenAddress) {
        voucherContract = _voucherContract;
        erc721TokenAddress = _tokenAddress;
    }

    function setVoucherContract(address _voucherContract) external onlyOwner {
        voucherContract = _voucherContract;
        emit VoucherContractSet(voucherContract);
    }

    function setTokenAddress(address _tokenAddress) external onlyOwner {
        erc721TokenAddress = _tokenAddress;
        emit TokenAddressSet(_tokenAddress);
    }

    function togglePause(bool _pause) external onlyOwner {
        isPaused = _pause;
    }

    function paused() external view returns (bool) {
        return isPaused;
    }

    function transferPortalsFromVoucher(uint256 _amount) external {
        require(!isPaused, "Portal transfer is paused");

        require(_amount <= 20, "Can't mint more than 20 at once");
        address sender = msg.sender; //LibMeta.msgSender();

        uint256 voucherBalance = IERC1155(voucherContract).balanceOf(sender, voucherId);
        require(voucherBalance >= _amount, "Not enough ERC1155");

        uint256 balance = IERC721(erc721TokenAddress).balanceOf(address(this));
        require(balance >= _amount, "Not enough Portals");

        // burn erc1155 first
        IERC1155(voucherContract).safeTransferFrom(sender, address(0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF), voucherId, _amount, new bytes(0));

        transferPortals(sender, _amount);
    }

    //If portals need to be withdrawn
    function withdrawPortals(uint256 _amount) external onlyOwner {
        address sender = msg.sender; //LibMeta.msgSender();

        uint256 balance = IERC721(erc721TokenAddress).balanceOf(address(this));
        require(balance >= _amount, "Not enough Portals");

        transferPortals(sender, _amount);
    }

    function onERC721Received(
        address,
        address _from,
        uint256,
        bytes calldata
    ) external view override returns (bytes4) {
        require(_from == owner(), "Can only receive from contract owner");
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

    function transferPortals(address _sender, uint256 _amount) internal {
        uint256 transferredAmount;
        uint256 j;

        //Get all the tokenIds of this contract (shouldn't revert)
        uint32[] memory tokenIds = IAavegotchiFacet(erc721TokenAddress).tokenIdsOfOwner(address(this));

        //Loop through the tokenIds and transfer to sender
        do {
            uint256 tokenId = tokenIds[j];
            IERC721(erc721TokenAddress).safeTransferFrom(address(this), _sender, tokenId);
            transferredAmount++;

            j++;
        } while (transferredAmount < _amount);
    }
}
