// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC1155Voucher is ERC1155 {
    constructor(uint256[] memory _tokenIds, uint256[] memory _mintNumber) ERC1155("https://aavegotchi.com/portalRaffle/") {
        require(_tokenIds.length == _mintNumber.length, "ERC1155Voucher: Incompatible lengths");

        for (uint256 i = 0; i < _tokenIds.length; i++) {
            _mint(msg.sender, _tokenIds[i], _mintNumber[i], "");
        }
    }

    function burn(
        address account,
        uint256 id,
        uint256 value
    ) public virtual {
        require(account == msg.sender || isApprovedForAll(account, msg.sender), "ERC1155: caller is not owner nor approved");

        _burn(account, id, value);
    }

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) public virtual {
        require(account == msg.sender || isApprovedForAll(account, msg.sender), "ERC1155: caller is not owner nor approved");

        _burnBatch(account, ids, values);
    }
}
