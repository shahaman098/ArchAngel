import "dotenv/config";
import { generateEligibilityProof } from "./generate-proof";

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

// These mirror the stubbed client structure from `smoke-test.ts`.
// TODO: replace with real Midnight SDK types (provider, wallet, contract)
// once you install the official Midnight TypeScript SDK.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MidnightProvider = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MidnightWallet = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JobBoardContract = any;

interface MidnightClient {
  provider: MidnightProvider;
  wallet: MidnightWallet;
  getJobBoard(contractAddress: string): JobBoardContract;
}

async function loadJobBoardArtifact(): Promise<any> {
  // TODO: Adjust this path to match the actual managed output from:
  //   compact compile contract/src/job_board.compact contract/managed/job_board
  //
  // Example (once known):
  //   const artifact = await import("../contract/managed/job_board");
  //
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeArtifact: any = { name: "JobBoardArtifactPlaceholder" };
  return fakeArtifact;
}

async function createClient(env: Env): Promise<MidnightClient> {
  const artifact = await loadJobBoardArtifact();

  // TODO: Replace this with real provider + wallet initialisation following
  // the example-bboard / counter Midnight examples.
  const provider: MidnightProvider = {
    rpcUrl: env.MIDNIGHT_RPC_URL
  };

  const wallet: MidnightWallet = {
    mnemonic: env.WALLET_MNEMONIC
  };

  const client: MidnightClient = {
    provider,
    wallet,
    getJobBoard(contractAddress: string): JobBoardContract {
      // In real code, this would create a contract instance bound to provider+wallet.
      return {
        address: contractAddress,
        artifact
      };
    }
  };

  console.log("[TEST-APPLY] Created Midnight client (stub provider + wallet)");
  return client;
}

async function deployJobBoard(client: MidnightClient): Promise<string> {
  console.log("[TEST-APPLY] Deploying JobBoard contract...");

  // TODO: Once the Midnight SDK is wired, replace this with an actual deploy:
  //
  //   const tx = await client.wallet.deployContract(jobBoardArtifact, { ... });
  //   const receipt = await tx.wait();
  //   const contractAddress = receipt.contractAddress;
  //
  //   console.log(`Deployed JobBoard at ${contractAddress}, tx hash: ${receipt.txHash}`);
  //   return contractAddress;

  const fakeAddress = "jobboard-testnet-address-apply-0001";
  console.log(
    `[TEST-APPLY] Would deploy JobBoard here. Using fake address: ${fakeAddress}`
  );
  return fakeAddress;
}

async function postJob(
  client: MidnightClient,
  contractAddress: string,
  requiredSkillThreshold: number
): Promise<number> {
  console.log(
    `[TEST-APPLY] Posting job to JobBoard at ${contractAddress} with requiredSkillThreshold=${requiredSkillThreshold}...`
  );

  const jobBoard = client.getJobBoard(contractAddress);

  const descriptionHash =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  // TODO: Replace this with a real contract call and receipt handling:
  //
  //   const tx = await jobBoard.postJob(requiredSkillThreshold, descriptionHash);
  //   const receipt = await tx.wait();
  //   const jobId = receipt.returnValue; // depending on ABI
  //
  // For now we assume first job has jobId = 0.

  console.log("[TEST-APPLY] JobBoard.postJob would be called with:", {
    contractAddress: jobBoard.address,
    requiredSkillThreshold,
    descriptionHash
  });

  const jobId = 0;
  console.log(`[TEST-APPLY] Assuming jobId=${jobId} for this test run`);
  return jobId;
}

async function applyWithProof(
  client: MidnightClient,
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

  const jobBoard = client.getJobBoard(contractAddress);

  // TODO: Replace this with the real JobBoard.apply contract call:
  //
  //   const tx = await jobBoard.apply(jobId, applicantIdHash, proof, publicInputs);
  //   const receipt = await tx.wait();
  //
  console.log("[TEST-APPLY] JobBoard.apply would be called with:", {
    contractAddress: jobBoard.address,
    jobId,
    applicantIdHash,
    proof,
    publicInputs
  });
}

async function getApplicationsForJob(
  client: MidnightClient,
  contractAddress: string,
  jobId: number
): Promise<void> {
  console.log(
    `[TEST-APPLY] Fetching applications for JobBoard at ${contractAddress}, jobId=${jobId}...`
  );

  const jobBoard = client.getJobBoard(contractAddress);

  // TODO: Replace this with a real read-only contract call:
  //
  //   const applications = await jobBoard.getApplications(jobId);
  //   console.log("Applications:", applications);
  //

  const fakeApplications = [
    {
      jobId,
      applicantIdHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      accepted: true,
      appliedAt: Date.now()
    }
  ];

  console.log(
    "[TEST-APPLY] JobBoard.getApplications would return something like:",
    {
      contractAddress: jobBoard.address,
      applications: fakeApplications
    }
  );
}

async function main(): Promise<void> {
  const env = getEnv();

  console.log("[TEST-APPLY] Initialising client...");
  const client = await createClient(env);

  let contractAddress = env.JOB_BOARD_CONTRACT_ADDRESS;
  if (contractAddress) {
    console.log(
      `[TEST-APPLY] Using existing JobBoard contract at ${contractAddress}`
    );
  } else {
    contractAddress = await deployJobBoard(client);
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

  await getApplicationsForJob(client, contractAddress, jobId);

  console.log("[TEST-APPLY] Full apply flow completed (stubbed client)");
}

main().catch((err) => {
  console.error("[TEST-APPLY] Test apply script failed:", err);
  process.exit(1);
});


