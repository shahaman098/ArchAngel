/**
 * Browser client example for JobBoard contract integration.
 * 
 * This shows how to use the DApp connector API to interact with the JobBoard
 * contract from a browser application (React, Vue, etc.).
 * 
 * Usage in your front-end:
 * 1. Import this file or copy the functions into your component
 * 2. Ensure Lace wallet extension is installed
 * 3. Call the functions when user interacts with your UI
 */

import { setNetworkId } from "@midnight-ntwrk/compact-runtime";

// Set network ID before using any Compact runtime features
setNetworkId("TestNet");

// Lazy-load the generated contract bindings
// In a browser context, you'll need to bundle this or serve it statically
let JobBoardCache: any = null;

async function loadJobBoard() {
  if (JobBoardCache) {
    return JobBoardCache;
  }

  try {
    // Try to import from the managed directory
    // In a browser context, you'll need to bundle this or serve it statically
    JobBoardCache = await import("../contract/managed/job_board/contract/index.js");
  } catch (err) {
    console.warn("Could not load JobBoard contract. Make sure to bundle the managed contract files.");
    throw new Error("JobBoard contract not available");
  }

  return JobBoardCache;
}

/**
 * Connect to Lace wallet and get the DApp connector API
 */
async function connectWallet() {
  if (typeof window === "undefined" || !window.midnight) {
    throw new Error("Midnight wallet not found. Please install Lace wallet extension.");
  }

  if (!window.midnight.lace) {
    throw new Error("Lace wallet not found. Please install Lace wallet extension.");
  }

  const walletApi = await window.midnight.lace.enable();
  return walletApi;
}

/**
 * Post a job to the JobBoard contract
 * 
 * @param contractAddress - The deployed JobBoard contract address
 * @param requiredSkillThreshold - Minimum skill score required for the job
 * @param descriptionHash - Hash of the job description (stored off-chain)
 * @returns Transaction result
 */
export async function postJobFromBrowser(
  contractAddress: string,
  requiredSkillThreshold: number,
  descriptionHash: string
) {
  const walletApi = await connectWallet();
  const JobBoard = await loadJobBoard();

  // Build the transaction using JobBoard bindings
  const tx = JobBoard.postJob({
    requiredSkillThreshold,
    descriptionHash
  });

  // Balance and prove the transaction (wallet handles proof generation)
  const balancedAndProven = await walletApi.balanceAndProveTransaction(tx);

  // Submit to the network
  const submittedTx = await walletApi.submitTransaction(balancedAndProven);

  console.log("Job posted tx:", submittedTx);
  return submittedTx;
}

/**
 * Apply to a job with a ZK proof
 * 
 * @param contractAddress - The deployed JobBoard contract address
 * @param jobId - The ID of the job to apply to
 * @param applicantIdHash - Hash of the applicant's identifier
 * @param proof - The ZK proof (generated via proof server)
 * @param publicInputs - Public inputs for the proof
 * @returns Transaction result
 */
export async function applyToJobFromBrowser(
  contractAddress: string,
  jobId: bigint,
  applicantIdHash: string,
  proof: any,
  publicInputs: { requiredThreshold: number }
) {
  const walletApi = await connectWallet();
  const JobBoard = await loadJobBoard();

  // Build the transaction
  const tx = JobBoard.apply({
    jobId,
    applicantIdHash,
    proof,
    publicInputs
  });

  // Balance and prove
  const balancedAndProven = await walletApi.balanceAndProveTransaction(tx);

  // Submit
  const submittedTx = await walletApi.submitTransaction(balancedAndProven);

  console.log("Application submitted tx:", submittedTx);
  return submittedTx;
}

/**
 * List all jobs from the JobBoard contract
 * 
 * @param contractAddress - The deployed JobBoard contract address
 * @returns List of jobs
 */
export async function listJobsFromBrowser(contractAddress: string) {
  const walletApi = await connectWallet();
  const JobBoard = await loadJobBoard();

  // Build query transaction
  const tx = JobBoard.listJobs();

  // Query the contract state
  const result = await walletApi.queryTransaction(tx);

  return result;
}

/**
 * Get applications for a specific job
 * 
 * @param contractAddress - The deployed JobBoard contract address
 * @param jobId - The ID of the job
 * @returns List of applications
 */
export async function getApplicationsFromBrowser(
  contractAddress: string,
  jobId: bigint
) {
  const walletApi = await connectWallet();
  const JobBoard = await loadJobBoard();

  // Build query transaction
  const tx = JobBoard.getApplications({ jobId });

  // Query the contract state
  const result = await walletApi.queryTransaction(tx);

  return result;
}

// TypeScript declarations for window.midnight
declare global {
  interface Window {
    midnight?: {
      lace?: {
        enable: () => Promise<any>;
      };
    };
  }
}

