// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./stakingRebasingUpgradable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
contract FactoryOfStakingRebasingUpgradable 
{
    // Address of the implementation contract
    address public immutable implementation;

    event CloneCreated(address indexed cloneAddress, address indexed owner, address indexed token);

    error zeroAddress(string message);

    constructor(address _stakingTokenImplementation) 
    {
        implementation = _stakingTokenImplementation;
    }

    /**
     * @notice Create a new clone of the staking contract and initialize it.
     * @param _token The ERC20 token address used for staking.
     * @param _owner The owner of the newly created staking contract clone.
     * @return The address of the newly created clone.
     */
    function createStakingToken(IERC20 _token, address _owner) external returns (address) 
    {
        if(address(_token) == address(0))
        {
            revert zeroAddress("token is with zero address");   
        }
        // Create a clone of the stakingRebasingUpgradable contract
        address clone = Clones.clone(implementation);
        
        // Initialize the clone with token and owner
        StakingTokenUpgradable(clone).initialize(_token, _owner);

        emit CloneCreated(clone, _owner, address(_token));

        return clone;
    }
}