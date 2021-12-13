pragma solidity 0.8.0;

contract SelfDestructooor {
    // Payable constructor can receive Ether

    address transferAddress;

    constructor(address _transferAddress) payable {
        transferAddress = _transferAddress;
    }

    // Function to deposit Ether into this contract.
    // Call this function along with some Ether.
    // The balance of this contract will be automatically updated.
    function deposit() public payable {}

    function withdraw() external payable {
        address payable addr = payable(address(transferAddress));
        selfdestruct(addr);
    }
}
