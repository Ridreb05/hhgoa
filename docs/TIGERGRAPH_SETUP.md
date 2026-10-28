# GhostShield: TigerGraph Cloud Setup & GSQL Deployment Guide

This document provides step-by-step instructions to deploy the GhostShield schema, compile the GSQL queries, load the demo dataset, and connect GhostShield to a live **TigerGraph Cloud** instance.

---

## 1. Prerequisites

* A **TigerGraph Cloud** account (sign up free at [tgcloud.io](https://tgcloud.io)) OR a local TigerGraph 3.x/4.x Docker instance.
* Terminal with `curl` or the `gsql` CLI client.

---

## 2. Step 1: Provision a TigerGraph Cloud Cluster

1. Log in to [TigerGraph Cloud Console](https://tgcloud.io).
2. Click **Create Cluster**.
3. Choose **TigerGraph Version 3.x or 4.x** (Evaluation Tier: Free tier `tg.free` is sufficient).
4. Enter cluster name: `ghostshield-cluster`.
5. Set your administrative password (e.g. `tigergraph`).
6. Click **Configure Cluster** and wait for cluster status to show **Ready** (approx. 3–5 minutes).
7. Note your public cluster URL, e.g.:
   ```text
   https://ghostshield-cluster.i.tgcloud.io
   ```

---

## 3. Step 2: Deploy Schema & Compile GSQL Queries

You can execute the GSQL scripts either via **GraphStudio** in the browser or using the GSQL command line.

### Option A: Via Command Line (Recommended)
From the root of the GhostShield repository, execute:

```bash
# Connect to your TigerGraph Cloud instance
gsql -u tigergraph -p "<your_password>" -ip "ghostshield-cluster.i.tgcloud.io"

# Inside the GSQL shell, execute the setup script:
@database/tigergraph/setup_graph.gsql
```

The script will:
1. Drop any previous conflicting types or graphs.
2. Define the 4 vertices (`Wallet`, `FundingSource`, `Agent`, `SmartContract`) and 5 directed edges (`TRANSFERRED_TO`, `FUNDED`, `CONTROLS`, `DELEGATES_TO`, `INTERACTS_WITH`).
3. Instantiate `GhostShieldGraph`.
4. Compile and install all four queries:
   * `ghostshield_dashboard_metrics`
   * `ghostshield_detect_cycles`
   * `ghostshield_investigate_wallet`
   * `ghostshield_risk_evidence`

### Option B: Via GraphStudio Web Console
1. Open GraphStudio by clicking **GraphStudio** in the TigerGraph Cloud dashboard.
2. Navigate to **Design Schema** → click **Import Existing Schema** or copy-paste `database/tigergraph/schema.gsql`. Click **Publish Schema**.
3. Navigate to **Write Queries** → create the 4 queries from `database/tigergraph/queries/`.
4. Click **Install All Queries** (this triggers C++ code generation and compilation into REST++ endpoints).

---

## 4. Step 3: Ingest Synthetic Dataset

Load the 12 wallets, 5 funding sources, 3 agents, 3 contracts, and transaction edges using the automated loading job:

```bash
# Execute the loading job
gsql -u tigergraph -p "<your_password>" -g GhostShieldGraph database/tigergraph/load_data.gsql
```

Verify ingestion by running:
```bash
gsql -u tigergraph -p "<your_password>" -g GhostShieldGraph "SELECT count() FROM Wallet;"
```

Expected count: `12` vertices.

---

## 5. Step 4: Configure GhostShield Environment Variables

In your local `.env.local` or environment configuration, specify your live TigerGraph credentials:

```bash
# Enable Live TigerGraph Cloud Mode
GHOSTSHIELD_ENGINE_MODE=tigergraph

# TigerGraph REST++ Endpoint (Port 9000 or Cloud HTTPS URL)
TIGERGRAPH_HOST=https://ghostshield-cluster.i.tgcloud.io
TIGERGRAPH_GRAPH_NAME=GhostShieldGraph
TIGERGRAPH_USERNAME=tigergraph
TIGERGRAPH_PASSWORD=your_password_here

# Optional: Secret token auth (if generated via GraphStudio)
# TIGERGRAPH_SECRET=your_graph_secret_here

# Query Timeout in Milliseconds
TIGERGRAPH_TIMEOUT_MS=8000
```

---

## 6. Step 5: Verify Live Query Execution

Restart the GhostShield application:
```bash
npm run dev
```

1. Open `http://localhost:3000` in your browser.
2. Observe the header badge: it will now display **TIGERGRAPH LIVE** with a green status indicator.
3. Observe the Query Latency pill: it will report real measured round-trip REST++ latency (typically 20–45ms depending on geographic distance).
4. Open the **System Status** tab and verify the TigerGraph status card reports:
   ```text
   [ONLINE] Connected to TigerGraph server at https://ghostshield-cluster.i.tgcloud.io (GhostShieldGraph)
   ```
5. Run **Scenario A** in the Transaction Simulator. The query will execute against the live database, evaluate temporal cycle constraints in C++ GSQL, and return verified topological evidence.
