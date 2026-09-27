// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { PrizeVault } from "./PrizeVault.sol";

/**
 * @title PrizeVaultFactory — one attestation vault per event.
 * @notice The factory address is the one pinned in SMART_CONTRACT_ADDRESS.
 *         Only holders of ATTESTER_ROLE may create vaults; the child vault
 *         receives its own ATTESTER grant for the runtime signer (the
 *         platform key — env-only, per SECURITY.md). The factory holds
 *         DEFAULT_ADMIN_ROLE on every vault it creates so a compromised hot
 *         key can be rotated on-chain (see rotateAttester).
 */
contract PrizeVaultFactory is AccessControl {
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");

    mapping(string => address) public eventToVault;

    event VaultCreated(string eventId, address indexed vault, uint256 amountKes, address indexed attester);
    event AttesterRotated(address indexed vault, address indexed oldAttester, address indexed newAttester);

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

    /**
     * @notice Rotate the attester key on a vault this factory created.
     * @dev Runbook — hot-key compromise:
     *      1. A factory admin (cold key) calls rotateAttester(vault, old, new).
     *      2. The vault grants ATTESTER_ROLE to the new key, then revokes it
     *         from the old one — the old key is dead on-chain immediately,
     *         with no redeploy and no ledger fork. Grant happens before
     *         revoke so the vault is never left without an attester.
     *      The factory can do this because every PrizeVault grants it
     *      DEFAULT_ADMIN_ROLE at construction; the hot attester key itself
     *      never holds admin and cannot perform this rotation.
     */
    function rotateAttester(
        address vault,
        address oldAttester,
        address newAttester
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(vault != address(0), "Factory: zero vault");
        require(newAttester != address(0), "Factory: zero new attester");
        require(oldAttester != newAttester, "Factory: same attester");

        // The vault's ATTESTER_ROLE is the same constant (keccak256 of the
        // same string); the external grantRole/revokeRole calls are
        // authorized by the factory's DEFAULT_ADMIN_ROLE on the vault.
        PrizeVault(vault).grantRole(ATTESTER_ROLE, newAttester);
        PrizeVault(vault).revokeRole(ATTESTER_ROLE, oldAttester);

        emit AttesterRotated(vault, oldAttester, newAttester);
    }
}
