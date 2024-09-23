//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import "hardhat/console.sol";

contract CounterV1
{
    uint256 public count;
    
    function initialize(uint256 val) external 
    {
        count = val;
    } 
    function inc() external 
    {
        count += 1;
    } 
}
contract CounterV2 
{
    uint256 public count;

    function inc() external
    {
        count += 1;
    }

    function dec() external 
    {
        count -= 1;
    }
}

/**
 * @title Proxy Contract for Upgradeability
 */
contract Proxy 
{
    bytes32 public constant IMPLEMENTATION_SLOT = bytes32(uint(keccak256("eip1967.proxy.implementation")) - 1);
    bytes32 public constant ADMIN_SLOT = bytes32(uint(keccak256("eip1967.proxy.admin")) - 1);

    event NewImplementation(address indexed newImplementation);

    error OnlyAdmin(string message);
    
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    constructor()
    {
        _setAdmin(msg.sender);
    }

    modifier ifAdmin() 
    {   console.log(msg.sender == _getAdmin());
        if (msg.sender == _getAdmin()) 
            _;
        else 
            _fallback();
    }

    function _getAdmin() private view returns (address) 
    {
        return StorageSlot.getAddressSlot(ADMIN_SLOT).value;
    }

    function _setAdmin(address _admin) private 
    {
        require(_admin != address(0), "admin == zero address");
        StorageSlot.getAddressSlot(ADMIN_SLOT).value = _admin;
    }

    function _getImplementation() private view returns (address) 
    {
        return StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value;
    }

    function _setImplementation(address _implementation) private 
    {
        require(_implementation.code.length > 0, "implementation is not contract");
        console.log("Potentiale error");
        StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = _implementation;
        console.log("Potentiale error");
    }

    function admin() external view returns(address)
    {
        return _getAdmin();
    }

    function implementation() external view returns(address)
    {
        return _getImplementation();
    }
    /**
     * @notice Allows the admin to upgrade the implementation.
     * @param _newImplementation The address of the new implementation contract.
     */
    function upgradeTo(address _newImplementation) external ifAdmin
    {
        console.log("If admin");
        _setImplementation(_newImplementation);
        emit NewImplementation(_newImplementation);
        console.log("Address");
    }
    function changeAdmin(address _admin) external ifAdmin
    {
        _setAdmin(_admin);
    }

    /**
     * @notice Fallback function to delegate calls to the implementation contract.
     */
   function _fallback() private 
   {
        _delegate(_getImplementation());
    }

    fallback() external payable 
    {
        _fallback();
    }
    receive() external payable 
    {
        _fallback();
    }

    /**
     * @notice Delegate the current call to the implementation contract.
     * @param _impl The address of the implementation contract.
     */
    function _delegate(address _impl) internal 
    {
        assembly 
        {
            // 1. Copy the calldata (function name and arguments) to memory
            calldatacopy(0, 0, calldatasize()) //destination memory, start position in calldata, no. of bytes to copy.

            // 2. Forward the call to the implementation contract
                        //delegateCall(gas, address, in, inSize, out, outSize);
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            let size := returndatasize() //size of the last returnData

            // 3. Copy the return data from the call
            //returndatacpoy- it copies the "size" bytes at position f to memory at position t
            returndatacopy(0, 0, size)

            // Handle the result    
            switch result
            case 0 
            {
                //if delegate call fails
                revert(0, size) 
            }
            default 
            { 
                return(0, size) 
            }
        }
    }
}
contract ProxyAdmin 
{
    address public owner;

    constructor() 
    {
        owner = msg.sender;
    }

    modifier onlyOwner() 
    {
        console.log(msg.sender, owner, "owner called");
        require(msg.sender == owner, "not owner");
        _;
    }

    function getProxyAdmin(address proxy) external view returns (address) 
    {
        (bool ok, bytes memory res) = proxy.staticcall(abi.encodeCall(Proxy.admin, ()));
        require(ok, "call failed");
        return abi.decode(res, (address));
    }

    function getProxyImplementation(address proxy) external view returns (address)
    {
        console.log("reaching in getproxyimplementation1");
        (bool ok, bytes memory res) = proxy.staticcall(abi.encodeCall(Proxy.implementation, ()));
        console.log("reaching in getproxyimplementation2");
        require(ok, "call failed");
        console.log("reaching in getproxyimplementation3");
        return abi.decode(res, (address));
    }

    function changeProxyAdmin(address payable proxy, address admin) external onlyOwner
    {
        Proxy(proxy).changeAdmin(admin);
    }

    function upgrade(address payable proxy, address implementation) external onlyOwner
    {
        console.log("reachi ng in upgrade");
        Proxy(proxy).upgradeTo(implementation);
        console.log("Upgrade call compeleted");
    }
}
library StorageSlot 
{   struct AddressSlot 
    {
        address value;
    }

    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r)
    {
        assembly 
        {
            r.slot := slot
        }
    }
}
contract TestSlot 
{
    bytes32 public constant slot = keccak256("TEST_SLOT");

    function getSlot() external view returns (address) 
    {
        return StorageSlot.getAddressSlot(slot).value;
    }

    function writeSlot(address _addr) external 
    {
        StorageSlot.getAddressSlot(slot).value = _addr;
    }
}
