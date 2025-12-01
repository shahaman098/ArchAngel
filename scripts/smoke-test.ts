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

interface Env {
  MIDNIGHT_RPC_URL: string;
  WALLET_MNEMONIC: string;
  JOB_BOARD_CONTRACT_ADDRESS?: string;
}

function getEnv(): Env {
  const { MIDNIGHT_RPC_URL, WALLET_MNEMONIC, JOB_BOARD_CONTRACT_ADDRESS } =
    process.env;

  if (!MIDNIGHT_RPC_URL) {
    throw new Error("MIDNIGHT_RPC_URL is required");
  }

  if (!WALLET_MNEMONIC) {
    throw new Error("WALLET_MNEMONIC is required");
  }

  return {
    MIDNIGHT_RPC_URL,
    WALLET_MNEMONIC,
    JOB_BOARD_CONTRACT_ADDRESS
  };
}

async function loadJobBoardArtifact() {
  const managedDir = path.join(__dirname, "..", "contract", "managed", "job_board");
  const contractDir = path.join(managedDir, "contract");

  try {
    return await import(path.join(contractDir, "index.js"));
  } catch (err) {
    try {
      return await import(path.join(managedDir, "contract.js"));
    } catch (err2) {
      throw new Error(
        `Could not load contract artifact from ${contractDir}. ` +
          "Run `npm run build:contract` first."
      );
    }
  }
}

async function createClient(env: Env) {
  const artifact = await loadJobBoardArtifact();
  const contractInstance = artifact.default || artifact;

  const providers = {
    rpcUrl: env.MIDNIGHT_RPC_URL
  };

  return {
    providers,
    contractInstance,
    mnemonic: env.WALLET_MNEMONIC
  };
}

async function deployJobBoard(client: any): Promise<string> {
  console.log("[SMOKE] Deploying JobBoard contract...");

  const api = await MidnightSetupAPI.deployContract(
    client.providers,
    client.contractInstance,
    { mnemonic: client.mnemonic }
  );

  const contractAddress = api.getContractAddress();
  const txHash = api.getDeploymentTxHash();

  console.log(`[SMOKE] Deployed JobBoard at ${contractAddress}, tx hash: ${txHash}`);
  return contractAddress;
}

async function postSampleJob(
  client: any,
  contractAddress: string
): Promise<void> {
  console.log(
    `[SMOKE] Posting sample job to JobBoard at ${contractAddress} (requiredSkillThreshold=70)...`
  );

  const requiredSkillThreshold = 70;
  const descriptionHash =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Join the contract using MidnightSetupAPI
  const api = await MidnightSetupAPI.joinContract(
    client.providers,
    client.contractInstance,
    contractAddress,
    { mnemonic: client.mnemonic }
  );

  // Build and submit postJob transaction
  const tx = client.contractInstance.postJob({
    requiredSkillThreshold,
    descriptionHash
  });

  const balancedAndProven = await api.balanceAndProveTransaction(tx);
  const submittedTx = await api.submitTransaction(balancedAndProven);

  console.log("[SMOKE] postJob transaction submitted:");
  console.log("  Tx hash:", submittedTx.txHash || submittedTx.hash || "pending");
}

async function listJobs(
  client: any,
  contractAddress: string
): Promise<void> {
  console.log(`[SMOKE] Listing jobs from JobBoard at ${contractAddress}...`);

  // Join the contract using MidnightSetupAPI
  const api = await MidnightSetupAPI.joinContract(
    client.providers,
    client.contractInstance,
    contractAddress,
    { mnemonic: client.mnemonic }
  );

  // Get contract state to read listJobs
  const state = await api.getContractState();
  
  // The exact structure depends on the generated bindings
  // Try to access listJobs from the contract instance or state
  let jobs;
  if (client.contractInstance.listJobs) {
    const tx = client.contractInstance.listJobs();
    const result = await api.queryTransaction(tx);
    jobs = result;
  } else if (state && state.jobs) {
    jobs = state.jobs;
  } else {
    // Fallback: try to get jobs from state directly
    jobs = state;
  }

  console.log("[SMOKE] Jobs from contract:");
  console.log(JSON.stringify(jobs, null, 2));
}

async function main(): Promise<void> {
  try {
    const env = getEnv();
    console.log("[SMOKE] Environment loaded");
    console.log("[SMOKE] Network ID:", networkId);

    const client = await createClient(env);

    let contractAddress = env.JOB_BOARD_CONTRACT_ADDRESS;
    if (contractAddress) {
      console.log(
        `[SMOKE] Using existing JobBoard contract at ${contractAddress}`
      );
    } else {
      console.log("[SMOKE] No contract address provided, deploying new contract...");
      contractAddress = await deployJobBoard(client);
      console.log("[SMOKE] 💡 Add this to your .env file:");
      console.log(`[SMOKE] JOB_BOARD_CONTRACT_ADDRESS=${contractAddress}`);
    }

    await postSampleJob(client, contractAddress);
    await listJobs(client, contractAddress);

    console.log("[SMOKE] ✅ Smoke test completed successfully");
  } catch (err) {
    console.error("[SMOKE] ❌ Smoke test failed:", err);
    process.exit(1);
  }
}

void main();



