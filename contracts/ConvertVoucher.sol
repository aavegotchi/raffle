// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IRealmFacet} from "./interfaces/IRealmFacet.sol";

import "./libraries/LibSignature.sol";
import "hardhat/console.sol";

contract TransferPortals is Ownable, IERC721Receiver {
    // contract address for voucher erc1155
    address voucherContract;
    address erc721TokenAddress;
    uint256 voucherId;
    bytes backendPubKey;
    bool isPaused = false;

    event VoucherContractSet(address voucherContract);
    event TokenAddressSet(address tokenAddress);

    constructor(
        address _voucherContract,
        address _tokenAddress,
        uint256 _voucherId,
        bytes memory _backendPubKey
    ) {
        voucherContract = _voucherContract;
        erc721TokenAddress = _tokenAddress;
        voucherId = _voucherId;
        backendPubKey = _backendPubKey;
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

    function transferERC721FromVoucher(uint256 _amount, bytes memory _signature) external {
        address sender = msg.sender;
        require(tx.origin == sender, "Not authorized, fren");

        uint256 voucherBalance = IERC1155(voucherContract).balanceOf(sender, voucherId);

        //check signature
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, _amount, voucherBalance));

        require(LibSignature.isValid(messageHash, _signature, backendPubKey), "Not authorized, fren");

        require(!isPaused, "Portal transfer is paused");

        require(_amount <= 20, "Can't mint more than 20 at once");

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
        uint32[] memory tokenIds = IRealmFacet(erc721TokenAddress).tokenIdsOfOwner(address(this));

        //Loop through the tokenIds and transfer to sender
        do {
            uint256 tokenId = tokenIds[j];
            IERC721(erc721TokenAddress).safeTransferFrom(address(this), _sender, tokenId);
            transferredAmount++;

            j++;
        } while (transferredAmount < _amount);
    }
}
