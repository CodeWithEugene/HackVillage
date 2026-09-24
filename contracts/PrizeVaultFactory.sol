// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { PrizeVault } from "./PrizeVault.sol";

/**
 * @title PrizeVaultFactory — one attestation vault per event.
 * @notice The factory address is the one pinned in SMART_CONTRACT_ADDRESS.
 *         Only holders of ATTESTER_ROLE may create vaults; the child vault
 *         receives its own ATTESTER grant for the runtime signer (the
 *         platform key — env-only, per SECURITY.md).
 */
contract PrizeVaultFactory is AccessControl {
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");

    mapping(string => address) public eventToVault;

    event VaultCreated(string eventId, address indexed vault, uint256 amountKes, address indexed attester);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ATTESTER_ROLE, msg.sender);
    }

    /// @notice Create the vault for an event. One vault per eventId, forever —
    ///         a re-created vault for the same event would be a ledger fork.
    function createVault(
        string calldata eventId,
        uint256 amountKes,
        address attester
    ) external onlyRole(ATTESTER_ROLE) returns (address vault) {
        require(bytes(eventId).length > 0, "Factory: empty eventId");
        require(eventToVault[eventId] == address(0), "Factory: vault exists");

        vault = address(new PrizeVault(eventId, amountKes, attester));
        eventToVault[eventId] = vault;

        emit VaultCreated(eventId, vault, amountKes, attester);
    }

    function vaultFor(string calldata eventId) external view returns (address) {
        return eventToVault[eventId];
    }
}
