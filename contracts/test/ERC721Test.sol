pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721 {
    constructor() ERC721("test", "test") {}

    mapping(address => uint256[]) ownerTokenIds;

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

    function tokenIdsOfOwner(address _owner) external view returns (uint256[] memory tokenIds_) {
        return ownerTokenIds[_owner];
    }

    function getParcelInfo(uint256 _tokenId) external view returns (ParcelOutput memory output_) {
        if (_tokenId < 25) return ParcelOutput("0", "0", address(this), 0, 0, 0, 0, [uint256(0), 0, 0, 0]);
        else if (_tokenId < 50) return ParcelOutput("0", "0", address(this), 0, 0, 1, 0, [uint256(0), 0, 0, 0]);
        else if (_tokenId < 75) return ParcelOutput("0", "0", address(this), 0, 0, 2, 0, [uint256(0), 0, 0, 0]);
        else return ParcelOutput("0", "0", address(this), 0, 0, 3, 0, [uint256(0), 0, 0, 0]);
    }

    function mint(address _to, uint256 _amount) external {
        for (uint256 i = 0; i < _amount; i++) {
            _mint(_to, i);
            ownerTokenIds[_to].push(i);
        }
    }
}
