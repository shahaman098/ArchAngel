import "dotenv/config";
import { setNetworkId } from "@midnight-ntwrk/compact-runtime";
import { MidnightSetupAPI } from "@meshsdk/midnight-setup";
import { generateEligibilityProof } from "./generate-proof";
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
  APPLICANT_ID_HASH?: string;
}

function getEnv(): Env {
  const {
    MIDNIGHT_RPC_URL,
    WALLET_MNEMONIC,
    JOB_BOARD_CONTRACT_ADDRESS,
    APPLICANT_ID_HASH
  } = process.env;

  if (!MIDNIGHT_RPC_URL) {
    throw new Error("MIDNIGHT_RPC_URL is required");
  }

  if (!WALLET_MNEMONIC) {
    throw new Error("WALLET_MNEMONIC is required");
  }

  return {
    MIDNIGHT_RPC_URL,
    WALLET_MNEMONIC,
    JOB_BOARD_CONTRACT_ADDRESS,
    APPLICANT_ID_HASH
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
  console.log("[TEST-APPLY] Deploying JobBoard contract...");

  const api = await MidnightSetupAPI.deployContract(
    client.providers,
    client.contractInstance,
    { mnemonic: client.mnemonic }
  );

  const contractAddress = api.getContractAddress();
  const txHash = api.getDeploymentTxHash();

  console.log(`[TEST-APPLY] Deployed JobBoard at ${contractAddress}, tx hash: ${txHash}`);
  return contractAddress;
}

async function postJob(
  client: any,
  contractAddress: string,
  requiredSkillThreshold: number
): Promise<number> {
  console.log(
    `[TEST-APPLY] Posting job to JobBoard at ${contractAddress} with requiredSkillThreshold=${requiredSkillThreshold}...`
  );

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

  console.log("[TEST-APPLY] postJob transaction submitted:");
  console.log("  Tx hash:", submittedTx.txHash || submittedTx.hash || "pending");

  // Get the jobId - it should be the nextJobId - 1 (since it was just incremented)
  // Or we can query the contract state to get the latest job
  // For now, assume jobId starts at 0 for first job
  const state = await api.getContractState();
  let jobId = 0;
  
  // Try to get the actual jobId from state or transaction result
  if (state && state.nextJobId !== undefined) {
    jobId = Number(state.nextJobId) - 1;
  } else if (submittedTx.jobId !== undefined) {
    jobId = Number(submittedTx.jobId);
  }

  console.log(`[TEST-APPLY] Posted job with jobId=${jobId}`);
  return jobId;
}

async function applyWithProof(
  client: any,
  contractAddress: string,
  jobId: number,
  applicantIdHash: string,
  skillScore: number,
  requiredThreshold: number
): Promise<void> {
  console.log(
    `[TEST-APPLY] Generating eligibility proof for skillScore=${skillScore}, requiredThreshold=${requiredThreshold}...`
  );

  const { proof, publicInputs } = await generateEligibilityProof(
    skillScore,
    requiredThreshold
  );

  console.log("[TEST-APPLY] Proof generated (truncated view):", {
    proofSummary: typeof proof === "object" ? Object.keys(proof) : String(proof),
    publicInputs
  });

  // Join the contract using MidnightSetupAPI
  const api = await MidnightSetupAPI.joinContract(
    client.providers,
    client.contractInstance,
    contractAddress,
    { mnemonic: client.mnemonic }
  );

  // Build and submit apply transaction
  const tx = client.contractInstance.apply({
    jobId: BigInt(jobId),
    applicantIdHash,
    proof,
    publicInputs
  });

  const balancedAndProven = await api.balanceAndProveTransaction(tx);
  const submittedTx = await api.submitTransaction(balancedAndProven);

  console.log("[TEST-APPLY] apply transaction submitted:");
  console.log("  Tx hash:", submittedTx.txHash || submittedTx.hash || "pending");
}

async function getApplicationsForJob(
  client: any,
  contractAddress: string,
  jobId: number
): Promise<void> {
  console.log(
    `[TEST-APPLY] Fetching applications for JobBoard at ${contractAddress}, jobId=${jobId}...`
  );

  // Join the contract using MidnightSetupAPI
  const api = await MidnightSetupAPI.joinContract(
    client.providers,
    client.contractInstance,
    contractAddress,
    { mnemonic: client.mnemonic }
  );

  // Get contract state to read applications
  const state = await api.getContractState();
  
  // Try to get applications from state
  let applications;
  if (client.contractInstance.getApplications) {
    const tx = client.contractInstance.getApplications({ jobId: BigInt(jobId) });
    const result = await api.queryTransaction(tx);
    applications = result;
  } else if (state && state.applications) {
    // Applications might be stored in state.applications[jobId]
    applications = state.applications[jobId] || state.applications[String(jobId)] || [];
  } else {
    applications = [];
  }

  console.log("[TEST-APPLY] Applications for job", jobId, ":");
  console.log(JSON.stringify(applications, null, 2));
  
  // Check if any application has accepted: true
  const hasAccepted = Array.isArray(applications) && 
    applications.some((app: any) => app.accepted === true);
  
  if (hasAccepted) {
    console.log("[TEST-APPLY] ✅ Found accepted application!");
  } else {
    console.log("[TEST-APPLY] ⚠️  No accepted applications found yet");
  }
}

async function main(): Promise<void> {
  const env = getEnv();

  console.log("[TEST-APPLY] Initialising client...");
  console.log("[TEST-APPLY] Network ID:", networkId);
  const client = await createClient(env);

  let contractAddress = env.JOB_BOARD_CONTRACT_ADDRESS;
  if (contractAddress) {
    console.log(
      `[TEST-APPLY] Using existing JobBoard contract at ${contractAddress}`
    );
  } else {
    console.log("[TEST-APPLY] No contract address provided, deploying new contract...");
    contractAddress = await deployJobBoard(client);
    console.log("[TEST-APPLY] 💡 Add this to your .env file:");
    console.log(`[TEST-APPLY] JOB_BOARD_CONTRACT_ADDRESS=${contractAddress}`);
  }

  const requiredSkillThreshold = 70;
  const jobId = await postJob(client, contractAddress, requiredSkillThreshold);

  const applicantIdHash =
    env.APPLICANT_ID_HASH ??
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  const skillScore = 80;

  await applyWithProof(
    client,
    contractAddress,
    jobId,
    applicantIdHash,
    skillScore,
    requiredSkillThreshold
  );

  // Wait a bit for the transaction to be processed
  console.log("[TEST-APPLY] Waiting for transaction to be processed...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  await getApplicationsForJob(client, contractAddress, jobId);

  console.log("[TEST-APPLY] ✅ Full apply flow completed");
}

main().catch((err) => {
  console.error("[TEST-APPLY] Test apply script failed:", err);
  process.exit(1);
});





