pragma solidity ^0.8.0;

import "./interfaces/IERC1155TokenReceiver.sol";
import {TransferPortals} from "./ConvertVoucher.sol";
import {IERC1155TokenReceiver} from "./interfaces/IERC1155TokenReceiver.sol";
import {IERC721TokenReceiver} from "./interfaces/IERC721TokenReceiver.sol";
import {IERC1155} from "./interfaces/IERC1155.sol";

contract TestConvert is IERC1155TokenReceiver, IERC721TokenReceiver {
    address convertAddress;
    address voucherAddress;

    bytes4 internal constant ERC1155_ACCEPTED = 0xf23a6e61; // Return value from `onERC1155Received` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`).
    bytes4 internal constant ERC1155_BATCH_ACCEPTED = 0xbc197c81; // Return value from `onERC1155BatchReceived` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`).

    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;

    constructor(address _convertAddress, address _voucherAddress) {
        convertAddress = _convertAddress;
        voucherAddress = _voucherAddress;
    }

    function testConversion(bytes memory _signature) external {
        IERC1155(voucherAddress).setApprovalForAll(convertAddress, true);
        TransferPortals(convertAddress).transferERC721FromVoucher(1, _signature);
    }

    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external pure override returns (bytes4) {
        return ERC1155_ACCEPTED;
    }

    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external pure override returns (bytes4) {
        return ERC1155_BATCH_ACCEPTED;
    }

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external pure override returns (bytes4) {
        return ERC721_RECEIVED;
    }
}
