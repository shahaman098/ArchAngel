# JobBoard Blockchain Integration Guide

## What the Contract Does

- **Employers** can post job listings with a required skill threshold
- **Applicants** can submit applications with zero-knowledge proofs that demonstrate they meet the skill threshold without revealing their actual score
- All job postings and applications are stored on-chain on Midnight testnet
- The contract uses ZK proofs to maintain privacy while ensuring eligibility

## Deployment Information

- **Network**: Midnight testnet
- **Contract Address**: `<JOB_BOARD_CONTRACT_ADDRESS>` (set in `.env` after deployment)
- **RPC Endpoint**: `https://rpc.ankr.com/midnight_testnet`

## Prerequisites

1. **Node.js** v20.x or higher
2. **Compact Compiler** - Install from [Midnight releases](https://midnight.network/releases)
3. **Docker** - For running the proof server
4. **Lace Wallet** - Midnight Preview extension for browser interactions
5. **Testnet Tokens** - Get tDUST from [Midnight faucet](https://midnight.network/faucet)

## Environment Setup

1. Create your `.env` file (copy from `env.example` if it exists, or create manually):
   ```bash
   cp env.example .env
   # OR create .env manually
   ```

2. Fill in your `.env` file:
   ```bash
   MIDNIGHT_RPC_URL=https://rpc.ankr.com/midnight_testnet
   NETWORK_ID=TestNet
   WALLET_MNEMONIC="your lace midnight seed phrase here"
   JOB_BOARD_CONTRACT_ADDRESS=
   ```

3. Get testnet tokens:
   - Install Lace wallet extension
   - Visit [Midnight faucet](https://midnight.network/faucet)
   - Request tDUST tokens

## How to Run Scripts

### 1. Build the Contract

Compile the Compact contract to generate TypeScript bindings:

```bash
npm run build:contract
```

This creates the managed contract artifacts in `contract/managed/job_board/`.

### 2. Deploy the Contract

Deploy the JobBoard contract to Midnight testnet:

```bash
npm run deploy
```

This will:
- Deploy the contract to testnet
- Print the contract address
- Copy the address to your `.env` file as `JOB_BOARD_CONTRACT_ADDRESS`

### 3. Smoke Test (Post Job + List Jobs)

Test basic contract interactions:

```bash
npm run smoke
```

This will:
- Use the deployed contract (from `JOB_BOARD_CONTRACT_ADDRESS`)
- Post a sample job with `requiredSkillThreshold=70`
- List all jobs from the contract

### 4. End-to-End Apply Test

Test the full application flow with ZK proofs:

```bash
# First, start the proof server in a separate terminal:
docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'

# Then run the test:
npm run test:apply
```

This will:
- Post a job with threshold 70
- Generate a ZK proof for skillScore=80 (meets threshold)
- Submit an application with the proof
- Fetch and display applications (should show `accepted: true`)

## Integration Guide

### Contract Methods

The JobBoard contract exposes the following methods:

#### `postJob(requiredSkillThreshold: u32, descriptionHash: Hash)`

Post a new job listing.

- **Parameters**:
  - `requiredSkillThreshold`: Minimum skill score required (number)
  - `descriptionHash`: Hash of job description (32-byte hex string)
- **Returns**: Transaction hash

#### `apply(jobId: JobId, applicantIdHash: Hash, proof: ZkProof, publicInputs: PublicInputs)`

Apply to a job with a ZK proof.

- **Parameters**:
  - `jobId`: The job ID to apply to (number or bigint)
  - `applicantIdHash`: Hash of applicant identifier (32-byte hex string)
  - `proof`: ZK proof object (from proof server)
  - `publicInputs`: `{ requiredThreshold: number }`
- **Returns**: Transaction hash

#### `listJobs() -> List<Job>`

Get all posted jobs.

- **Returns**: Array of job objects with `id`, `employer`, `requiredSkillThreshold`, `descriptionHash`, `createdAt`

#### `getApplications(jobId: JobId) -> List<Application>`

Get all applications for a specific job.

- **Parameters**:
  - `jobId`: The job ID (number or bigint)
- **Returns**: Array of application objects with `jobId`, `applicantIdHash`, `accepted`, `appliedAt`

### Browser Integration

For front-end integration, use the DApp connector API. See `scripts/browser-client-example.ts` for complete examples.

**Basic pattern**:

```typescript
import { setNetworkId } from "@midnight-ntwrk/compact-runtime";
import * as JobBoard from "../contract/managed/job_board/contract";

setNetworkId("TestNet");

// Connect to wallet
const walletApi = await window.midnight.lace.enable();

// Build transaction
const tx = JobBoard.postJob({
  requiredSkillThreshold: 70,
  descriptionHash: "0x..."
});

// Balance, prove, and submit
const balancedAndProven = await walletApi.balanceAndProveTransaction(tx);
const submittedTx = await walletApi.submitTransaction(balancedAndProven);
```

### Node.js Integration

For script-based interactions, use `MidnightSetupAPI` from `@meshsdk/midnight-setup`:

```typescript
import { MidnightSetupAPI } from "@meshsdk/midnight-setup";
import { setNetworkId } from "@midnight-ntwrk/compact-runtime";

setNetworkId("TestNet");

const providers = { rpcUrl: process.env.MIDNIGHT_RPC_URL };
const contractInstance = await import("./contract/managed/job_board/contract");

// Join existing contract
const api = await MidnightSetupAPI.joinContract(
  providers,
  contractInstance,
  contractAddress,
  { mnemonic: process.env.WALLET_MNEMONIC }
);

// Build and submit transaction
const tx = contractInstance.postJob({ requiredSkillThreshold: 70, descriptionHash: "0x..." });
const balancedAndProven = await api.balanceAndProveTransaction(tx);
const submittedTx = await api.submitTransaction(balancedAndProven);
```

## Proof Generation

ZK proofs are generated via the proof server. The proof server must be running:

```bash
docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'
```

Then use `scripts/generate-proof.ts`:

```bash
SKILL_SCORE=80 REQUIRED_THRESHOLD=70 ts-node scripts/generate-proof.ts
```

Or import the function:

```typescript
import { generateEligibilityProof } from "./scripts/generate-proof";

const { proof, publicInputs } = await generateEligibilityProof(80, 70);
```

## Troubleshooting

### Contract not found
- Run `npm run build:contract` first
- Verify `contract/managed/job_board/contract/` exists

### Deployment fails
- Check `MIDNIGHT_RPC_URL` is correct
- Verify `WALLET_MNEMONIC` is valid
- Ensure wallet has tDUST tokens

### Proof generation fails
- Ensure proof server is running: `docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'`
- Check proof server is accessible at `http://localhost:6300`

### Transaction fails
- Verify contract address in `.env` matches deployed contract
- Check wallet has sufficient tDUST for gas
- Ensure network ID is set to "TestNet"

## Project Structure

```
contracts-midnight/
├── contract/
│   ├── src/
│   │   └── job_board.compact          # Source contract
│   └── managed/
│       └── job_board/                  # Generated after build
│           └── contract/              # TypeScript bindings
├── scripts/
│   ├── deploy.ts                       # Deploy contract
│   ├── smoke-test.ts                  # Basic tests
│   ├── test-apply.ts                   # Full apply flow
│   ├── generate-proof.ts              # ZK proof generation
│   └── browser-client-example.ts      # Browser integration example
├── .env                                # Environment variables (create from .env.example)
└── BLOCKCHAIN_README.md               # This file
```

## Additional Resources

- [Midnight Documentation](https://docs.midnight.network)
- [Midnight Testnet Faucet](https://midnight.network/faucet)
- [Lace Wallet](https://www.lace.io/)

