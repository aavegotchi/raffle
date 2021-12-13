// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

interface IRealmFacet {
    /// @param _owner The owner account of Aavegotchi
    /// @return tokenIds_ aavegotchi ids of the _owner
    function tokenIdsOfOwner(address _owner) external view returns (uint256[] memory tokenIds_);

    struct ParcelOutput {
        string parcelId;
        string parcelAddress;
        address owner;
        uint256 coordinateX; //x position on the map
        uint256 coordinateY; //y position on the map
        uint256 size; //0=humble, 1=reasonable, 2=spacious vertical, 3=spacious horizontal, 4=partner
        uint256 district;
        uint256[4] boost;
    }

    function getParcelInfo(uint256 _tokenId) external view returns (ParcelOutput memory output_);
}
