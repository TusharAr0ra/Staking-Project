//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @dev This contract delegates calls to another contract (implementation) and allows upgrades.
 *      It also supports maintenance mode and is owned by an admin.
 */
contract UpgradableProxy is TransparentUpgradeableProxy
{
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Upgraded(address indexed implementation);

    // Storage position of the address of the maintenance boolean
    bytes32 private constant maintenancePosition = bytes32(uint(keccak256("com.proxy.maintenance")) - 1);
    // Storage position of the address of the current implementation
    bytes32 private constant implementationPosition = bytes32(uint(keccak256("com.proxy.implementation")) -1);
    // Storage position of the owner of the contract
    bytes32 private constant proxyOwnerPosition = bytes32(uint(keccak256("com.proxy.owner")) -1);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 

    constructor(address _logic, address admin_, bytes memory _data) TransparentUpgradeableProxy(_logic, admin_, _data)
    {
        upgradeTo(_logic);//upgrading to a new logic
        setOwner(msg.sender);
    }

    /**
     * @notice Checks if the proxy is in maintenance mode.
     * @return _maintenance Returns true if in maintenance mode, false otherwise.
     */
    function maintenance() public view returns (bool _maintenance) 
    {
        bytes32 position = maintenancePosition;
        assembly 
        {
            _maintenance := sload(position)    //
        }
    }

    /**
     * @notice Enables or disables maintenance mode.
     * @param _maintenance Boolean indicating the new maintenance status.
     */
    function setMaintenance(bool _maintenance) external onlyProxyOwner 
    {
        bytes32 position = maintenancePosition;
        assembly 
        {
            sstore(position, _maintenance)
        }
    }

    function proxyOwner() public view returns (address owner) 
    {
        bytes32 position = proxyOwnerPosition;
        assembly 
        {
            owner := sload(position)
        }
    }

    function setUpgradeabilityOwner(address newProxyOwner) internal 
    {
        bytes32 position = proxyOwnerPosition;
        assembly 
        {
            sstore(position, newProxyOwner)
        }
    }

    function transferProxyOwnership(address newOwner) public onlyProxyOwner
    {
        require(newOwner != address(0), 'not a valid address');
        emit OwnershipTransferred(proxyOwner(), newOwner);
        setUpgradeabilityOwner(newOwner);
    }

    /**
     * @notice Upgrades the proxy to a new implementation address.
     * @param newImplementation The address of the new logic contract.
     */
    function upgradeTo(address newImplementation) public onlyProxyOwner 
    {
        _upgradeTo(newImplementation);
    }

    /**
     * @notice Upgrades the proxy to a new implementation and calls a function on the new implementation.
     * @param newImplementation The address of the new logic contract.
     * @param data Encoded function call data to be executed on the new implementation.
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) payable public onlyProxyOwner
    {
        upgradeTo(newImplementation);
        (bool success, ) = address(this).call{value: msg.value}(data);    //low level call.

        require(success, "Call failed");
    }

    fallback() external override payable 
    {
        _fallback();
    }

    receive () external payable 
    {
        _fallback();
    }

    //Tells the address of the current implementation
    function implementation() public view returns (address impl) 
    {
        bytes32 position = implementationPosition;
        assembly 
        {
            impl := sload(position)
        }
    }
    function setImplementation(address newImplementation) internal 
    {
        bytes32 position = implementationPosition;
        assembly 
        {
            sstore(position, newImplementation)
        }
    }
    function setOwner(address newProxyOwner) internal 
    {
        bytes32 position = proxyOwnerPosition;
        assembly 
        {
            sstore(position, newProxyOwner)
        }
    }
    
    //upgrade teh implementation address.
    function _upgradeTo(address newImplementation) internal 
    {
        address currentImplementation = implementation();
        require(currentImplementation != newImplementation, 'same implementation');

        setImplementation(newImplementation);
        emit Upgraded(newImplementation);
    }

    //delegate calles the current implementation.
    function _fallback() override internal 
    {
        if (maintenance()) 
        {
            require(msg.sender == proxyOwner(), 'on maintenance');
        }
        address _impl = implementation();
        require(_impl != address(0), 'invalid');

        assembly 
        {
            calldatacopy(0, 0, calldatasize())//copying call data.
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)//delegate call
            let size := returndatasize()
            returndatacopy(0, 0, size)//copy the returned data.

            switch result
            case 0 { revert(0, size) }//if it fails
            default { return(0, size) }
        }
    }
    modifier onlyProxyOwner() 
    {
        require(msg.sender == proxyOwner(), 'OwnedUpgradeabilityProxy: FORBIDDEN');
        _;
    }
}