## JobBoard (Midnight / Compact)

This project contains a **JobBoard** smart contract written in **Compact** for the **Midnight testnet**, plus a small TypeScript toolbox around it.

The contract lets:

- **Employers** post job listings with a required skill threshold.
- **Applicants** submit applications.
- A **zero-knowledge circuit** proves that an applicant’s private `skillScore` meets the public `requiredSkillThreshold` without revealing the score.

The contract and circuit live in `contract/src/job_board.compact`.

---

### Project Structure

- `contract/src/job_board.compact` – JobBoard contract and `SkillCircuit` ZK circuit.
- `scripts/smoke-test.ts` – basic script that posts a sample job and lists jobs (stub client).
- `scripts/generate-proof.ts` – helper that talks to the local proof server and builds `{ proof, publicInputs }` for `SkillCircuit`.
- `scripts/test-apply.ts` – end-to-end script that posts a job, generates a proof, calls `apply`, and fetches applications (using stubbed on-chain calls).
- `package.json` – Node / TypeScript tooling and scripts.
- `tsconfig.json` – TypeScript compiler configuration for the scripts.

---

### Prerequisites

- **Node.js** v18 or later.
- **Compact CLI** (`compact`), installed per Midnight documentation.
- A configured environment with access to a **Midnight testnet RPC endpoint** and a funded deployer account.

---

### Install Dependencies

From the `contracts-midnight` directory:

```bash
npm install
```

---

### Build the Contract

Compile the Compact contract:

```bash
npm run build:contract
```

---

### Scripts

All commands are run from `contracts-midnight`:

- **Build contract**

  ```bash
  npm run build:contract
  ```

- **Smoke test (post + list jobs with stub client)**

  ```bash
  npm run smoke
  ```

- **Generate a ZK proof via local proof server**

  First start the proof server (example):

  ```bash
  docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'
  ```

  Then:

  ```bash
  ts-node scripts/generate-proof.ts
  ```

- **Full ZK apply flow (stubbed on-chain calls)**

  ```bash
  npm run test:apply
  ```

The TypeScript scripts currently use simple stub Midnight client types so you can focus on the Compact contract and ZK flow first. Replace the stubs with the real Midnight SDK client and managed contract bindings when you are ready to connect to the live testnet.



