// ==============================================================================
// GHOSTSHIELD: Synthetic Dataset Evaluation Benchmark
// Measures Precision, Recall, F1-Score, and Confusion Matrix on Ground Truth
// ==============================================================================

import demoData from '../data/demo/entities.json';
import { DemoGraphAdapter } from '../lib/graph/demo-adapter';
import { defaultRiskEngine } from '../lib/risk/engine';

async function runEvaluation() {
  console.log('================================================================');
  console.log('  GHOSTSHIELD: SYNTHETIC DATASET RISK DETECTION BENCHMARK');
  console.log('  Notice: Evaluated strictly over curated synthetic fixtures.');
  console.log('  Not to be construed as real-world blockchain distribution metric.');
  console.log('================================================================\n');

  const adapter = new DemoGraphAdapter();
  const scenarios = demoData.scenarios;

  let truePositives = 0; // Ground truth suspicious (REJECT/REVIEW), predicted suspicious
  let trueNegatives = 0; // Ground truth benign (ALLOW), predicted ALLOW
  let falsePositives = 0; // Ground truth benign (ALLOW), predicted REJECT/REVIEW
  let falseNegatives = 0; // Ground truth suspicious, predicted ALLOW

  const resultsTable: any[] = [];

  for (const scenario of scenarios) {
    const candidate = {
      from_wallet: scenario.target_wallet,
      to_wallet: scenario.counterparty,
      amount: 10.0,
      asset: 'ETH',
    };

    const evidence = await adapter.getRiskEvidence(scenario.target_wallet, candidate);
    const cycleRes = await adapter.detectCycles(600, 4);
    const assessment = defaultRiskEngine.evaluate(evidence, cycleRes.cycles, candidate);

    const actualSuspicious = scenario.expected_classification !== 'ALLOW';
    const predictedSuspicious = assessment.action !== 'ALLOW';

    let outcome = '';
    if (actualSuspicious && predictedSuspicious) {
      truePositives++;
      outcome = 'TP (True Positive)';
    } else if (!actualSuspicious && !predictedSuspicious) {
      trueNegatives++;
      outcome = 'TN (True Negative)';
    } else if (!actualSuspicious && predictedSuspicious) {
      falsePositives++;
      outcome = 'FP (False Positive)';
    } else {
      falseNegatives++;
      outcome = 'FN (False Negative)';
    }

    resultsTable.push({
      Scenario: scenario.name,
      Expected: scenario.expected_classification,
      Predicted: assessment.action,
      Score: `${assessment.score}/100`,
      Outcome: outcome,
    });
  }

  console.table(resultsTable);

  const precision =
    truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 1.0;
  const recall =
    truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 1.0;
  const f1 =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 1.0;
  const accuracy = (truePositives + trueNegatives) / scenarios.length;

  console.log('\n--- CONFUSION MATRIX ---');
  console.log(`True Positives  (TP): ${truePositives}`);
  console.log(`True Negatives  (TN): ${trueNegatives}`);
  console.log(`False Positives (FP): ${falsePositives}`);
  console.log(`False Negatives (FN): ${falseNegatives}`);

  console.log('\n--- PERFORMANCE METRICS ---');
  console.log(`Accuracy:  ${(accuracy * 100).toFixed(1)}%`);
  console.log(`Precision: ${(precision * 100).toFixed(1)}%`);
  console.log(`Recall:    ${(recall * 100).toFixed(1)}%`);
  console.log(`F1 Score:  ${(f1 * 100).toFixed(1)}%`);
  console.log('================================================================\n');
}

runEvaluation().catch(console.error);
