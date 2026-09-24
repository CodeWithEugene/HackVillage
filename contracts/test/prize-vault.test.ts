import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";
import { ethers } from "hardhat";

/**
 * PrizeVault full transition + access-control suite (plan §11.4): every legal
 * transition, every illegal transition, and role enforcement. The vault is
 * immutable and testnet-deployed before mainnet — these are the gates.
 */

describe("PrizeVaultFactory", () => {
  async function deploy() {
    const [deployer, attester, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PrizeVaultFactory");
    const factory = await Factory.connect(deployer).deploy();
    await factory.waitForDeployment();
    return { deployer, attester, outsider, factory };
  }

  const EVENT_ID = "evt_fintech_matatu";

  it("deploys and registers vaults", async () => {
    const { deployer, attester, factory } = await deploy();
    await expect(factory.createVault(EVENT_ID, 500_000, attester.address))
      .to.emit(factory, "VaultCreated")
      .withArgs(EVENT_ID, anyValue, 500_000, attester.address);

    const vaultAddress = await factory.vaultFor(EVENT_ID);
    expect(vaultAddress).to.not.equal(ethers.ZeroAddress);
    expect(await factory.hasRole(await factory.ATTESTER_ROLE(), deployer.address)).to.equal(true);
  });

  it("rejects duplicate vaults for the same event — the ledger cannot fork", async () => {
    const { attester, factory } = await deploy();
    await factory.createVault(EVENT_ID, 500_000, attester.address);
    await expect(factory.createVault(EVENT_ID, 500_000, attester.address)).to.be.revertedWith(
      "Factory: vault exists"
    );
  });

  it("rejects non-attesters and empty eventIds", async () => {
    const { attester, outsider, factory } = await deploy();
    await expect(
      factory.connect(outsider).createVault(EVENT_ID, 500_000, attester.address)
    ).to.be.revertedWithCustomError(factory, "AccessControlUnauthorizedAccount");

    await expect(factory.createVault("", 500_000, attester.address)).to.be.revertedWith(
      "Factory: empty eventId"
    );
  });
});

describe("PrizeVault state machine", () => {
  async function deployVault(amountKes = 500_000) {
    const [deployer, attester, outsider] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("PrizeVault");
    const vault = await Vault.connect(deployer).deploy("evt_test", amountKes, attester.address);
    await vault.waitForDeployment();
    return { vault, attester, outsider };
  }

  const REF = ethers.id("paystack-ref-001");
  const WINNER = ethers.id("user_wanjiku");
  const TXREF = ethers.id("transfer-ref-001");

  it("starts AWAITING and locks on deposit confirmation", async () => {
    const { vault, attester } = await deployVault();
    expect(await vault.vaultState()).to.equal("AWAITING");

    await expect(vault.connect(attester).lock(REF))
      .to.emit(vault, "DepositLocked")
      .withArgs("evt_test", REF, 500_000, anyValue);

    expect(await vault.vaultState()).to.equal("LOCKED");
  });

  it("rejects double locks and non-attester locks", async () => {
    const { vault, attester, outsider } = await deployVault();
    await vault.connect(attester).lock(REF);

    await expect(vault.connect(attester).lock(REF)).to.be.revertedWith("Vault: not awaiting deposit");
    const fresh = await deployVault();
    await expect(fresh.vault.connect(outsider).lock(REF)).to.be.revertedWith(
      "Vault: attester only"
    );
  });

  it("requires LOCKED before instant payouts and flips to HALF_RELEASED", async () => {
    const { vault, attester } = await deployVault();
    // Illegal: payouts before the deposit is locked.
    await expect(
      vault.connect(attester).recordInstantPayout(WINNER, 250_000, TXREF)
    ).to.be.revertedWith("Vault: not locked");

    await vault.connect(attester).lock(REF);
    await expect(vault.connect(attester).recordInstantPayout(WINNER, 250_000, TXREF))
      .to.emit(vault, "InstantPayoutRecorded")
      .withArgs("evt_test", WINNER, 250_000, TXREF);

    expect(await vault.vaultState()).to.equal("HALF_RELEASED");
    expect(await vault.releasedKes()).to.equal(250_000);
  });

  it("requires HALF_RELEASED before milestones and settles at full release", async () => {
    const { vault, attester } = await deployVault();
    await vault.connect(attester).lock(REF);

    await expect(
      vault.connect(attester).recordMilestonePayout(WINNER, 250_000, TXREF)
    ).to.be.revertedWith("Vault: not half released");

    await vault.connect(attester).recordInstantPayout(WINNER, 250_000, TXREF);

    // First milestone: not yet the full pool.
    await expect(vault.connect(attester).recordMilestonePayout(WINNER, 100_000, TXREF))
      .to.emit(vault, "MilestonePayoutRecorded")
      .withArgs("evt_test", WINNER, 100_000, TXREF, false);
    expect(await vault.vaultState()).to.equal("HALF_RELEASED");

    // Final milestone: cumulative release covers the pool → SETTLED.
    await expect(vault.connect(attester).recordMilestonePayout(WINNER, 150_000, TXREF))
      .to.emit(vault, "MilestonePayoutRecorded")
      .withArgs("evt_test", WINNER, 150_000, TXREF, true);
    expect(await vault.vaultState()).to.equal("SETTLED");
  });

  it("refunds from LOCKED or HALF_RELEASED, never from SETTLED", async () => {
    const { vault, attester } = await deployVault();
    await vault.connect(attester).lock(REF);

    await expect(vault.connect(attester).refund(REF))
      .to.emit(vault, "VaultRefunded")
      .withArgs("evt_test", REF, anyValue);
    expect(await vault.vaultState()).to.equal("REFUNDED");

    // A settled vault is terminal — no refund, no re-lock.
    const settled = await deployVault();
    await settled.vault.connect(settled.attester).lock(REF);
    await settled.vault.connect(settled.attester).recordInstantPayout(WINNER, 500_000, TXREF);
    // Milestone settles it (cumulative release now covers the pool).
    await settled.vault.connect(settled.attester).recordMilestonePayout(WINNER, 1, TXREF);
    expect(await settled.vault.vaultState()).to.equal("SETTLED");
    await expect(
      settled.vault.connect(settled.attester).refund(REF)
    ).to.be.revertedWith("Vault: not refundable");
    await expect(settled.vault.connect(settled.attester).lock(REF)).to.be.revertedWith(
      "Vault: not awaiting deposit"
    );
  });

  it("rejects zero pools and zero payouts at construction/call time", async () => {
    const [deployer, attester] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("PrizeVault");
    await expect(Vault.connect(deployer).deploy("evt_x", 0, attester.address)).to.be.revertedWith(
      "Vault: zero pool"
    );

    const { vault, outsider } = await deployVault(500_000);
    await expect(vault.connect(outsider).lock(REF)).to.be.revertedWith("Vault: attester only");
  });
});
