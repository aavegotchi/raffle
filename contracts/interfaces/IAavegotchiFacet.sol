// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

interface IAavegotchiFacet {
    /// @param _owner The owner account of Aavegotchi
    /// @return tokenIds_ aavegotchi ids of the _owner
    function tokenIdsOfOwner(address _owner) external view returns (uint32[] memory tokenIds_);
}
