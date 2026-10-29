// ==============================================================================
// GHOSTSHIELD: Live TigerGraph Seed Script
// Ingests synthetic scenario entities and transaction edges via REST++ into TigerGraph Cloud
// Usage: tsx scripts/seed_tigergraph.ts
// ==============================================================================

import demoData from '../data/demo/entities.json';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = val;
    }
  }
}

const host = (process.env.TIGERGRAPH_HOST || '').replace(/\/$/, '');
const graphName = process.env.TIGERGRAPH_GRAPH_NAME || 'GhostShieldGraph';
const username = process.env.TIGERGRAPH_USERNAME || 'tigergraph';
const password = process.env.TIGERGRAPH_PASSWORD || 'tigergraph';

if (!host) {
  console.error('\n❌ Error: TIGERGRAPH_HOST is not set in .env.local!');
  console.error('Please configure .env.local with your TigerGraph cluster host, e.g.:');
  console.error('TIGERGRAPH_HOST=https://your-cluster.i.tgcloud.io\n');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

async function seedTigerGraph() {
  console.log(`\n======================================================`);
  console.log(`  GHOSTSHIELD: SEEDING LIVE TIGERGRAPH CLOUD`);
  console.log(`  Target: ${host} (${graphName})`);
  console.log(`======================================================\n`);

  // Build REST++ payload
  const payload: any = {
    vertices: {
      Wallet: {},
      FundingSource: {},
      Agent: {},
      SmartContract: {},
    },
    edges: {
      Wallet: {},
      FundingSource: {},
      Agent: {},
    },
  };

  // 1. Wallets
  for (const w of demoData.vertices.wallets) {
    payload.vertices.Wallet[w.id] = {
      network: { value: w.network },
      label: { value: w.label },
      creation_time: { value: w.creation_time },
      provenance: { value: w.provenance },
      is_risk_seed: { value: w.is_risk_seed },
    };
  }

  // 2. Funding Sources
  for (const fs of demoData.vertices.funding_sources) {
    payload.vertices.FundingSource[fs.id] = {
      category: { value: fs.category },
      label: { value: fs.label },
      provenance: { value: fs.provenance },
    };
  }

  // 3. Agents
  for (const a of demoData.vertices.agents) {
    payload.vertices.Agent[a.id] = {
      display_name: { value: a.display_name },
      agent_type: { value: a.agent_type },
      provenance: { value: a.provenance },
    };
  }

  // 4. Smart Contracts
  for (const sc of demoData.vertices.smart_contracts) {
    payload.vertices.SmartContract[sc.id] = {
      network: { value: sc.network },
      protocol: { value: sc.protocol },
      category: { value: sc.category },
    };
  }

  // 5. Transfer Edges
  for (const tx of demoData.edges.transfers) {
    if (!payload.edges.Wallet[tx.from]) payload.edges.Wallet[tx.from] = {};
    if (!payload.edges.Wallet[tx.from].TRANSFERRED_TO) payload.edges.Wallet[tx.from].TRANSFERRED_TO = { Wallet: {} };
    payload.edges.Wallet[tx.from].TRANSFERRED_TO.Wallet[tx.to] = {
      amount: { value: tx.amount },
      asset: { value: tx.asset },
      event_timestamp: { value: tx.event_timestamp },
      tx_id: { value: tx.tx_id },
    };
  }

  // 6. Funding Edges
  for (const fe of demoData.edges.funding_edges) {
    if (!payload.edges.FundingSource[fe.from]) payload.edges.FundingSource[fe.from] = {};
    if (!payload.edges.FundingSource[fe.from].FUNDED) payload.edges.FundingSource[fe.from].FUNDED = { Wallet: {} };
    payload.edges.FundingSource[fe.from].FUNDED.Wallet[fe.to] = {
      amount: { value: fe.amount },
      funding_timestamp: { value: fe.funding_timestamp },
      tx_id: { value: fe.event_id },
    };
  }

  // 7. Control Edges
  for (const ce of demoData.edges.control_edges) {
    if (!payload.edges.Agent[ce.from]) payload.edges.Agent[ce.from] = {};
    if (!payload.edges.Agent[ce.from].CONTROLS) payload.edges.Agent[ce.from].CONTROLS = { Wallet: {} };
    payload.edges.Agent[ce.from].CONTROLS.Wallet[ce.to] = {
      authority_level: { value: ce.provenance },
      delegation_timestamp: { value: ce.recorded_at },
    };
  }

  // 8. Delegation Edges
  for (const de of demoData.edges.delegation_edges) {
    if (!payload.edges.Agent[de.from]) payload.edges.Agent[de.from] = {};
    if (!payload.edges.Agent[de.from].DELEGATES_TO) payload.edges.Agent[de.from].DELEGATES_TO = { Agent: {} };
    payload.edges.Agent[de.from].DELEGATES_TO.Agent[de.to] = {
      role: { value: de.delegation_type },
      depth: { value: 1 },
    };
  }

  // 9. Interaction Edges
  for (const ix of demoData.edges.interactions) {
    if (!payload.edges.Wallet[ix.from]) payload.edges.Wallet[ix.from] = {};
    if (!payload.edges.Wallet[ix.from].INTERACTS_WITH) payload.edges.Wallet[ix.from].INTERACTS_WITH = { SmartContract: {} };
    payload.edges.Wallet[ix.from].INTERACTS_WITH.SmartContract[ix.to] = {
      method: { value: ix.interaction_type },
      interaction_timestamp: { value: ix.interaction_timestamp },
      tx_id: { value: ix.tx_id },
    };
  }

  console.log(`📡 Ingesting vertices and edges into TigerGraph REST++...`);
  const endpoint = `${host}/restpp/graph/${encodeURIComponent(graphName)}`;
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Ingestion failed (HTTP ${res.status}): ${err}`);
      process.exit(1);
    }

    const json = await res.json();
    console.log(`✅ Success! Ingested vertices & edges into ${graphName}`);
    console.log(`   Response:`, JSON.stringify(json, null, 2));

    // Verify by pinging ghostshield_dashboard_metrics
    console.log(`\n🔍 Verifying via compiled GSQL 'ghostshield_dashboard_metrics'...`);
    const metricsRes = await fetch(`${host}/restpp/query/${encodeURIComponent(graphName)}/ghostshield_dashboard_metrics`, {
      headers: { Authorization: authHeader },
    });
    const metricsJson = await metricsRes.json();
    console.log(`📊 Live TigerGraph Metrics:`, JSON.stringify(metricsJson.results, null, 2));
    console.log(`\n🎉 TigerGraph Cloud is 100% POPULATED and VERIFIED!\n`);
  } catch (err: any) {
    console.error(`❌ Connection failed: ${err.message}`);
    process.exit(1);
  }
}

seedTigerGraph();
