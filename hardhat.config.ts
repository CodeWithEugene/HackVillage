import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

/**
 * HackVillage contracts (ADR-007): the PrizeVault attestation ledger.
 * Local tests run against the built-in Hardhat network — no external chain
 * needed (CONTRIBUTING.md: contract tests never run on public testnets).
 * Amoy deployment happens from CI/release tooling with RPC_URL +
 * ATTESTER_PRIVATE_KEY set.
 */
const networks: HardhatUserConfig["networks"] = {
  hardhat: {},
};
if (process.env.RPC_URL && process.env.ATTESTER_PRIVATE_KEY) {
  networks.amoy = {
    url: process.env.RPC_URL,
    accounts: [process.env.ATTESTER_PRIVATE_KEY],
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./contracts/cache",
    artifacts: "./contracts/artifacts",
  },
  networks,
};

export default config;
