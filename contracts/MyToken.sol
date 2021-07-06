// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address wallet
    ) ERC20(name, symbol) {
        _mint(wallet, initialSupply * 10**uint256(decimals()));
    }
}
