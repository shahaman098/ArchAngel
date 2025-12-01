import "dotenv/config";

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

// TODO: replace these with real Midnight SDK types (provider, wallet, contract)
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
  // In the official examples (counter / bboard), the managed directory contains
  // JS/TS bindings that are imported here. For example:
  //   const artifact = await import("../contract/managed/job_board");
  //
  // This function is structured so you can simply replace the body with a real
  // dynamic import once you know the exact file name.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeArtifact: any = { name: "JobBoardArtifactPlaceholder" };
  return fakeArtifact;
}

async function createClient(env: Env): Promise<MidnightClient> {
  const artifact = await loadJobBoardArtifact();

  // TODO: Replace this entire block with real Midnight SDK initialisation.
  //
  // Example pattern (following counter / example-bboard style):
  //
  //   const provider = new MidnightProvider(env.MIDNIGHT_RPC_URL);
  //   const wallet = MidnightWallet.fromMnemonic(env.WALLET_MNEMONIC).connect(provider);
  //
  //   function getJobBoard(contractAddress: string): JobBoardContract {
  //     return new Contract(contractAddress, artifact, wallet);
  //   }
  //
  //   return { provider, wallet, getJobBoard };

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
      // In real code, return a contract instance bound to provider+wallet.
      return {
        address: contractAddress,
        artifact
      };
    }
  };

  console.log("[SMOKE] Created Midnight client (provider + wallet stubs)");
  return client;
}

async function deployJobBoard(client: MidnightClient): Promise<string> {
  console.log("[SMOKE] Deploying JobBoard contract...");

  // TODO: Once the Midnight SDK is wired, replace this with an actual deploy:
  //
  //   const tx = await client.wallet.deployContract(jobBoardArtifact, { ... });
  //   const receipt = await tx.wait();
  //   const contractAddress = receipt.contractAddress;
  //
  //   console.log(`Deployed JobBoard at ${contractAddress}, tx hash: ${receipt.txHash}`);
  //   return contractAddress;

  const fakeAddress = "jobboard-testnet-address-0001";
  console.log(
    `[SMOKE] Would deploy JobBoard here via wallet+provider. Using fake address: ${fakeAddress}`
  );
  return fakeAddress;
}

async function postSampleJob(
  client: MidnightClient,
  contractAddress: string
): Promise<void> {
  console.log(
    `[SMOKE] Posting sample job to JobBoard at ${contractAddress} (requiredSkillThreshold=70)...`
  );

  const jobBoard = client.getJobBoard(contractAddress);

  const requiredSkillThreshold = 70;
  const descriptionHash =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  // TODO: Replace this log with a real contract call:
  //
  //   const tx = await jobBoard.postJob(requiredSkillThreshold, descriptionHash);
  //   const receipt = await tx.wait();
  //
  //   console.log("postJob tx hash:", receipt.txHash);

  console.log("[SMOKE] JobBoard.postJob would be called with:", {
    contractAddress: jobBoard.address,
    requiredSkillThreshold,
    descriptionHash
  });
}

async function listJobs(
  client: MidnightClient,
  contractAddress: string
): Promise<void> {
  console.log(`[SMOKE] Listing jobs from JobBoard at ${contractAddress}...`);

  const jobBoard = client.getJobBoard(contractAddress);

  // TODO: Replace this with a real read-only call:
  //
  //   const jobs = await jobBoard.listJobs();
  //   console.log("Jobs:", jobs);

  const fakeJobs = [
    {
      id: 0,
      employer: "midnight1fakeemployer...",
      requiredSkillThreshold: 70,
      descriptionHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      createdAt: 0
    }
  ];

  console.log("[SMOKE] JobBoard.listJobs would return something like:", {
    contractAddress: jobBoard.address,
    jobs: fakeJobs
  });
}

async function main(): Promise<void> {
  try {
    const env = getEnv();
    console.log("[SMOKE] Environment loaded");

    const client = await createClient(env);

    let contractAddress = env.JOB_BOARD_CONTRACT_ADDRESS;
    if (contractAddress) {
      console.log(
        `[SMOKE] Using existing JobBoard contract at ${contractAddress}`
      );
    } else {
      contractAddress = await deployJobBoard(client);
    }

    await postSampleJob(client, contractAddress);
    await listJobs(client, contractAddress);

    console.log("[SMOKE] Smoke test completed successfully");
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exit(1);
  }
}

void main();


