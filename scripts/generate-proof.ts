import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-load the managed contract artifact
let jobBoardManagedCache: any = null;

async function loadJobBoardManaged(): Promise<any> {
  if (jobBoardManagedCache) {
    return jobBoardManagedCache;
  }

  try {
    const managedDir = path.join(__dirname, "..", "contract", "managed", "job_board");
    const contractDir = path.join(managedDir, "contract");
    
    try {
      jobBoardManagedCache = await import(path.join(contractDir, "index.js"));
    } catch (err) {
      jobBoardManagedCache = await import(path.join(managedDir, "contract.js"));
    }
  } catch (err) {
    console.warn("Could not load managed contract. Proof generation may fail. Run `npm run build:contract` first.");
    jobBoardManagedCache = {};
  }

  return jobBoardManagedCache;
}

export interface EligibilityProof {
  // TODO: refine to the actual ZK proof type once you hook into the real SDK.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proof: any;
  publicInputs: {
    requiredThreshold: number;
  };
}

/**
 * Generate a ZK proof for SkillCircuit(private skillScore, public requiredThreshold)
 * by talking to the local proof server.
 *
 * Assumes the proof server is running via:
 *   docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'
 */
export async function generateEligibilityProof(
  skillScore: number,
  requiredThreshold: number
): Promise<EligibilityProof> {
  const url = "http://localhost:6300/prove";

  // Load the managed contract artifact
  const jobBoardManaged = await loadJobBoardManaged();

  // Payload shape for Midnight proof-server API
  // The proof server expects the circuit name and inputs
  const payload = {
    circuit: "SkillCircuit",
    // Pass the managed contract artifact if available
    artifact: jobBoardManaged.default || jobBoardManaged,
    inputs: {
      private: {
        skillScore
      },
      public: {
        requiredThreshold
      }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Proof server error (${response.status} ${response.statusText}): ${text}`
    );
  }

  // TODO: Adjust response parsing once you know the exact schema from the
  // proof-server. This assumes a shape like:
  //   { proof: ..., publicInputs: { requiredThreshold: number, ... } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await response.json();

  const proof = data.proof ?? data;
  const publicInputs = data.publicInputs ?? { requiredThreshold };

  return {
    proof,
    publicInputs: {
      requiredThreshold: publicInputs.requiredThreshold ?? requiredThreshold
    }
  };
}

// Lightweight CLI runner for manual testing:
//   ts-node scripts/generate-proof.ts

// These declarations make the `require.main === module` guard safe in both
// CommonJS and ESM/ts-node environments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

if (
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module
) {
  const skillScore =
    process.env.SKILL_SCORE !== undefined
      ? Number(process.env.SKILL_SCORE)
      : 80;
  const requiredThreshold =
    process.env.REQUIRED_THRESHOLD !== undefined
      ? Number(process.env.REQUIRED_THRESHOLD)
      : 60;

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    try {
      console.log(
        `Generating SkillCircuit proof with skillScore=${skillScore}, requiredThreshold=${requiredThreshold}...`
      );
      const result = await generateEligibilityProof(
        skillScore,
        requiredThreshold
      );
      console.log("EligibilityProof:", JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("Failed to generate eligibility proof:", err);
      process.exit(1);
    }
  })();
}




