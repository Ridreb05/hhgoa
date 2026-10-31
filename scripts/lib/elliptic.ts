// Shared Elliptic dataset helpers (loader + evaluator use the same split logic).
import * as fs from 'fs';
import * as path from 'path';

export const STEP_SECONDS = 14 * 86400;
const root = path.resolve(process.cwd(), 'data/real');
const raw = path.join(root, 'elliptic_raw');

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lines = (f: string) => fs.readFileSync(f, 'utf-8').split('\n').slice(1).filter(Boolean);

export interface Elliptic {
  classes: Map<string, string>; // txId -> '1' illicit | '2' licit | 'unknown'
  step: Map<string, number>;
  edges: [string, string][];
  illicit: string[];
  licit: string[];
}

export function loadElliptic(): Elliptic {
  const classes = new Map<string, string>(lines(path.join(raw, 'elliptic_txs_classes.csv')).map((l) => l.split(',') as [string, string]));
  const step = new Map<string, number>(lines(path.join(root, 'elliptic_timesteps.csv')).map((l) => { const [id, s] = l.split(','); return [id, Number(s)]; }));
  const edges = lines(path.join(raw, 'elliptic_txs_edgelist.csv')).map((l) => l.split(',') as [string, string]);
  if (classes.size !== 203_769 || edges.length !== 234_355) throw new Error(`unexpected dataset size: ${classes.size} nodes, ${edges.length} edges`);
  const illicit = [...classes.entries()].filter(([, c]) => c === '1').map(([id]) => id).sort();
  const licit = [...classes.entries()].filter(([, c]) => c === '2').map(([id]) => id);
  return { classes, step, edges, illicit, licit };
}

/** Deterministic seed/held-out split of the illicit labels. */
export function splitSeeds(illicit: string[], seed: number, fraction: number) {
  const rnd = mulberry32(seed);
  const order = illicit.map((id) => ({ id, k: rnd() })).sort((a, b) => a.k - b.k).map((x) => x.id);
  const seeds = new Set(order.slice(0, Math.round(illicit.length * fraction)));
  return { seeds, heldOut: illicit.filter((id) => !seeds.has(id)) };
}

export const walletRow = (d: Elliptic, id: string, isSeed: boolean) => [id, 'bitcoin', `tx ${id}`, (d.step.get(id) ?? 0) * STEP_SECONDS, 'elliptic', isSeed];
