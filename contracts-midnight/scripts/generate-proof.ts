import "dotenv/config";

// TODO: Import the actual managed JobBoard circuit/contract metadata once you
// know the exact output path from:
//   compact compile contract/src/job_board.compact contract/managed/job_board
//
// Example (to be adjusted):
//   import * as jobBoardManaged from "../contract/managed/job_board";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jobBoardManaged: any = {};

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

  // TODO: Adjust payload shape to match the official Midnight proof-server API.
  // This is a reasonable guess based on typical circuit/proof servers:
  const payload = {
    circuit: "SkillCircuit",
    // If the proof-server expects a reference to the compiled artifact,
    // you can pass something from `jobBoardManaged` here later.
    artifact: jobBoardManaged,
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


