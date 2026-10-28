// ==============================================================================
// GHOSTSHIELD: Mode-Aware Graph Provider Factory
// Selects DemoGraphAdapter or TigerGraphAdapter with explicit mode guarantees
// ==============================================================================

import { GraphProvider, EngineMode } from './types';
import { DemoGraphAdapter } from './demo-adapter';
import { TigerGraphAdapter } from './tigergraph-adapter';

// Singletons for reuse across API invocations
let demoProviderInstance: DemoGraphAdapter | null = null;
let tigerGraphProviderInstance: TigerGraphAdapter | null = null;

export function getGraphProvider(forcedMode?: EngineMode): GraphProvider {
  const envMode = (process.env.GHOSTSHIELD_ENGINE_MODE || 'demo').toLowerCase() as EngineMode;
  const targetMode = forcedMode || envMode;

  if (targetMode === 'tigergraph') {
    if (!tigerGraphProviderInstance) {
      tigerGraphProviderInstance = new TigerGraphAdapter();
    }
    return tigerGraphProviderInstance;
  }

  // Default to Demo provider
  if (!demoProviderInstance) {
    demoProviderInstance = new DemoGraphAdapter();
  }
  return demoProviderInstance;
}

export function resetDemoProvider(): void {
  if (demoProviderInstance) {
    demoProviderInstance.reset();
  } else {
    demoProviderInstance = new DemoGraphAdapter();
  }
}
