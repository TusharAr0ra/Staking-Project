// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Practice is ERC20, Ownable {
    constructor(string memory name, string memory symbol, uint amount) ERC20(name, symbol) Ownable(msg.sender)
    {
        _mint(msg.sender, amount * 10 ** uint(decimals()));
    }
    function mint(address to, uint amount) public onlyOwner
    {
        _mint(to, amount);
    }
    

    //For the testing of ERC20(mint(address, uint) and getOwner()
    // function getOwner() public view returns(address)
    // {
    //     return owner();
    // }
}
