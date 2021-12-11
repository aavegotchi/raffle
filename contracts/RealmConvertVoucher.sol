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

contract TransferRealm is Ownable, IERC721Receiver {
    // contract address for voucher erc1155
    address voucherContract;
    address erc721TokenAddress;
    bool isPaused = false;

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

    function convertUint256Array(uint256[4] memory _inputs) internal pure returns (uint256[] memory output_) {
        for (uint256 i = 0; i < _inputs.length; i++) {
            output_[i] = _inputs[i];
        }
        return output_;
    }

    function transferERC721FromVoucher(
        uint256 _humbleAmount,
        uint256 _reasonableAmount,
        uint256 _spaciousHorAmount,
        uint256 _spaciousVerAmount // bytes memory _signature
    ) external {
        address sender = msg.sender;
        // require(tx.origin == sender, "Not authorized, fren");

        require(!isPaused, "Portal transfer is paused");

        require(_humbleAmount + _reasonableAmount + _spaciousHorAmount + _spaciousVerAmount <= 20, "Can't mint more than 20 at once");

        require(IERC1155(voucherContract).balanceOf(sender, 0) >= _humbleAmount, "Not enough humble ERC1155");
        require(IERC1155(voucherContract).balanceOf(sender, 1) >= _reasonableAmount, "Not enough reasonable ERC1155");
        require(IERC1155(voucherContract).balanceOf(sender, 2) >= _spaciousHorAmount, "Not enough spacious ERC1155");
        require(IERC1155(voucherContract).balanceOf(sender, 3) >= _spaciousVerAmount, "Not enough spacious ERC1155");

        uint256 balance = IERC721(erc721TokenAddress).balanceOf(address(this));
        require(balance >= _humbleAmount + _reasonableAmount + _spaciousHorAmount + _spaciousVerAmount, "Not enough Portals");

        IERC1155(voucherContract).safeBatchTransferFrom(
            sender,
            address(0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF),
            convertUint256Array([uint256(0), 1, 2, 3]),
            convertUint256Array([_humbleAmount, _reasonableAmount, _spaciousHorAmount, _spaciousVerAmount]),
            new bytes(0)
        );

        transferPortals(sender, 0, _humbleAmount);
        transferPortals(sender, 1, _reasonableAmount);
        transferPortals(sender, 2, _spaciousHorAmount);
        transferPortals(sender, 3, _spaciousVerAmount);
    }

    //If portals need to be withdrawn
    function withdrawPortals(uint256 _voucherType, uint256 _amount) external onlyOwner {
        address sender = msg.sender; //LibMeta.msgSender();

        uint256 balance = IERC721(erc721TokenAddress).balanceOf(address(this));
        require(balance >= _amount, "Not enough Portals");

        transferPortals(sender, _voucherType, _amount);
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

    function transferPortals(
        address _sender,
        uint256 _voucherType,
        uint256 _amount
    ) internal {
        uint256 transferredAmount;
        uint256 j;

        //Get all the tokenIds of this contract (shouldn't revert)
        uint32[] memory tokenIds = IRealmFacet(erc721TokenAddress).tokenIdsOfOwner(address(this));

        //Loop through the tokenIds and transfer to sender if size equals voucher type
        do {
            uint256 tokenId = tokenIds[j];

            IRealmFacet.ParcelOutput memory parcel = IRealmFacet(erc721TokenAddress).getParcelInfo(tokenId);

            if (parcel.size == _voucherType) {
                IERC721(erc721TokenAddress).safeTransferFrom(address(this), _sender, tokenId);
                transferredAmount++;
            }

            j++;
        } while (transferredAmount < _amount);
    }
}
