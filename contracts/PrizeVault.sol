// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PrizeVault — the public attestation ledger for one HackVillage event.
 * @notice The chain is the LEDGER, not the CUSTODIAN (ADR-007): fiat funds live
 *         with Paystack from deposit to payout. This contract records
 *         tamper-proof state commitments so anyone can verify that a prize
 *         pool was locked before an event went live, that 50% paid out
 *         instantly, and that milestones settled. Every deposit and payout
 *         recorded here carries the off-chain payment reference for
 *         cross-verification on /trust.
 */
contract PrizeVault is AccessControl {
    // ── Roles ────────────────────────────────────────────────────────────
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");

    // ── State machine (mirrors plan §10.2 exactly) ────────────────────────
    enum State {
        AWAITING,      // vault created, waiting for the deposit webhook
        LOCKED,        // pool confirmed — event may go live ("Prize Verified")
        HALF_RELEASED, // winners announced, instant 50% tranche recorded
        SETTLED,       // all tranches recorded (cumulative >= pool)
        REFUNDED       // cancelled/disputed — funds returned to organizer
    }

    State public state;
    string public eventId;
    /// @notice pool portion only — the 5% platform fee (ADR-012) is never
    ///         attested here; it never reduces prizes.
    uint256 public amountKes;
    /// @notice cumulative recorded payout tranches, in KES.
    uint256 public releasedKes;

    uint256 public lockedAt;
    uint256 public halfReleasedAt;
    uint256 public settledAt;
    uint256 public refundedAt;

    // ── Events (the public ledger's source — plan §11.3) ─────────────────
    event DepositLocked(string eventId, bytes32 paystackRef, uint256 amountKes, uint256 lockedAt);
    event InstantPayoutRecorded(string eventId, bytes32 winner, uint256 amountKes, bytes32 txRef);
    event MilestonePayoutRecorded(string eventId, bytes32 winner, uint256 amountKes, bytes32 txRef, bool settled);
    event VaultRefunded(string eventId, bytes32 refundRef, uint256 refundedAt);

    modifier onlyAttester() {
        require(hasRole(ATTESTER_ROLE, msg.sender), "Vault: attester only");
        _;
    }

    constructor(string memory _eventId, uint256 _amountKes, address attester) {
        require(bytes(_eventId).length > 0, "Vault: empty eventId");
        require(_amountKes > 0, "Vault: zero pool");
        require(attester != address(0), "Vault: zero attester");

        eventId = _eventId;
        amountKes = _amountKes;
        state = State.AWAITING;

        // The attester rotates by re-deploying (immutable contract — plan §11.4):
        // the factory holds DEFAULT_ADMIN on child vaults for key ceremonies.
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ATTESTER_ROLE, attester);
        _grantRole(DEFAULT_ADMIN_ROLE, attester);
    }

    /// @notice Record the locked deposit once the pool webhook is confirmed.
    function lock(bytes32 paystackRef) external onlyAttester {
        require(state == State.AWAITING, "Vault: not awaiting deposit");
        state = State.LOCKED;
        lockedAt = block.timestamp;
        emit DepositLocked(eventId, paystackRef, amountKes, lockedAt);
    }

    /// @notice Record the instant 50% tranche for a winner.
    function recordInstantPayout(bytes32 winner, uint256 amount, bytes32 txRef) external onlyAttester {
        require(state == State.LOCKED, "Vault: not locked");
        require(amount > 0, "Vault: zero payout");
        state = State.HALF_RELEASED;
        halfReleasedAt = block.timestamp;
        releasedKes += amount;
        emit InstantPayoutRecorded(eventId, winner, amount, txRef);
    }

    /// @notice Record a milestone tranche; settles when the cumulative
    ///         released amount covers the pool.
    function recordMilestonePayout(bytes32 winner, uint256 amount, bytes32 txRef) external onlyAttester {
        require(state == State.HALF_RELEASED, "Vault: not half released");
        require(amount > 0, "Vault: zero payout");
        releasedKes += amount;
        bool settled = releasedKes >= amountKes;
        if (settled) {
            state = State.SETTLED;
            settledAt = block.timestamp;
        }
        emit MilestonePayoutRecorded(eventId, winner, amount, txRef, settled);
    }

    /// @notice Record a full refund (pre-live cancellation, or admin-approved
    ///         dispute resolution). Partial refunds are deliberately not
    ///         expressible — no ambiguous money states (P2).
    function refund(bytes32 refundRef) external onlyAttester {
        require(
            state == State.LOCKED || state == State.HALF_RELEASED,
            "Vault: not refundable"
        );
        state = State.REFUNDED;
        refundedAt = block.timestamp;
        emit VaultRefunded(eventId, refundRef, refundedAt);
    }

    /// @notice Human-readable state for the /trust explorer.
    function vaultState() external view returns (string memory) {
        if (state == State.AWAITING) return "AWAITING";
        if (state == State.LOCKED) return "LOCKED";
        if (state == State.HALF_RELEASED) return "HALF_RELEASED";
        if (state == State.SETTLED) return "SETTLED";
        return "REFUNDED";
    }
}
