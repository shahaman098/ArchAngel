/**
 * Deploy script for the ZK-Confidential Job Board contract.
 *
 * Deploys the compiled JobBoard contract to Midnight testnet.
 *
 * Environment:
 * - MIDNIGHT_RPC_URL: URL of the Midnight testnet RPC endpoint.
 * - WALLET_MNEMONIC: Seed phrase for the deployer account.
 * - NETWORK_ID: Network identifier (defaults to TestNet).
 */

import "dotenv/config";
import { setNetworkId } from "@midnight-ntwrk/compact-runtime";
import { MidnightSetupAPI } from "@meshsdk/midnight-setup";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set network ID before using any Compact runtime features
const networkId = process.env.NETWORK_ID || "TestNet";
setNetworkId(networkId);

async function main() {
  const rpcUrl = process.env.MIDNIGHT_RPC_URL;
  const walletMnemonic = process.env.WALLET_MNEMONIC;

  if (!rpcUrl) {
    throw new Error("MIDNIGHT_RPC_URL must be set in the environment.");
  }

  if (!walletMnemonic) {
    throw new Error("WALLET_MNEMONIC must be set in the environment.");
  }

  // Load the compiled contract artifact from managed directory
  const managedDir = path.join(__dirname, "..", "contract", "managed", "job_board");
  const contractDir = path.join(managedDir, "contract");

  // Try to import the generated contract bindings
  // The exact import path may vary based on compiler output structure
  let contractModule;
  try {
    contractModule = await import(path.join(contractDir, "index.js"));
  } catch (err) {
    // Fallback: try alternative import paths
    try {
      contractModule = await import(path.join(managedDir, "contract.js"));
    } catch (err2) {
      throw new Error(
        `Could not load contract artifact from ${contractDir}. ` +
          "Run `npm run build:contract` first and verify the output structure."
      );
    }
  }

  console.log("Loading contract artifact from:", contractDir);
  console.log("Network ID:", networkId);
  console.log("RPC URL:", rpcUrl);

  // Initialize providers for MidnightSetupAPI
  const providers = {
    rpcUrl: rpcUrl
  };

  // Get the contract instance from the managed module
  const contractInstance = contractModule.default || contractModule;

  try {
    console.log("\nDeploying ZK-Confidential Job Board contract to Midnight testnet...");

    // Deploy using MidnightSetupAPI
    const api = await MidnightSetupAPI.deployContract(providers, contractInstance, {
      mnemonic: walletMnemonic
    });

    // Get deployment result
    const contractAddress = api.getContractAddress();
    const txHash = api.getDeploymentTxHash();

    console.log("\n✅ Contract deployed successfully!");
    console.log(`Address: ${contractAddress}`);
    console.log(`Tx hash: ${txHash}`);
    console.log("\n💡 Add this to your .env file:");
    console.log(`JOB_BOARD_CONTRACT_ADDRESS=${contractAddress}`);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});


