/**
 * Algoritmo de generación de poules y asaltos FIE.
 *
 * Mantenido como funciones puras (sin dependencias de Prisma/NestJS) para que sea
 * fácil de testear de forma aislada.
 */

export interface SeedInput {
  fencerId: number;
  seedRank: number | null;
  clubId: number | null;
  countryId: number;
}

/**
 * Ordena a los tiradores para la distribución serpiente.
 */
export function buildSeedOrder(fencers: SeedInput[]): SeedInput[] {
  const seeded = fencers
    .filter((f) => f.seedRank !== null)
    .sort((a, b) => (a.seedRank as number) - (b.seedRank as number));

  const unseeded = fencers.filter((f) => f.seedRank === null);
  shuffleInPlace(unseeded);

  return [...seeded, ...unseeded];
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Determina cuántas poules crear apuntando a un tamaño ideal de 6-7.
 */
export function computePoolCount(n: number, manualPoolCount?: number): number {
  if (manualPoolCount) {
    if (manualPoolCount < 1 || manualPoolCount > n) {
      throw new Error('poolCount inválido para la cantidad de tiradores inscritos');
    }
    return manualPoolCount;
  }
  if (n <= 8) return 1;
  const minPools = Math.ceil(n / 8); 
  const maxPools = Math.max(minPools, Math.floor(n / 4)); 
  const ideal = Math.round(n / 6.5); 
  return Math.max(1, Math.min(Math.max(ideal, minPools), maxPools));
}

export function computePoolSizes(n: number, numPools: number): number[] {
  const base = Math.floor(n / numPools);
  const remainder = n % numPools;
  return Array.from({ length: numPools }, (_, i) => (i < remainder ? base + 1 : base));
}

export function snakeAssign<T>(seedOrder: T[], poolSizes: number[]): T[][] {
  const numPools = poolSizes.length;
  const pools: T[][] = Array.from({ length: numPools }, () => []);
  let idx = 0;
  let row = 0;

  while (idx < seedOrder.length) {
    const order = row % 2 === 0 ? [...Array(numPools).keys()] : [...Array(numPools).keys()].reverse();
    for (const poolIdx of order) {
      if (idx >= seedOrder.length) break;
      if (pools[poolIdx].length < poolSizes[poolIdx]) {
        pools[poolIdx].push(seedOrder[idx]);
        idx++;
      }
    }
    row++;
  }
  return pools;
}

export interface ConflictResolutionResult {
  pools: SeedInput[][];
  unresolvedClubConflicts: number;
}

export function resolveClubConflicts(pools: SeedInput[][]): ConflictResolutionResult {
  const maxIterations = 500;
  let iterations = 0;
  let improved = true;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    for (let p = 0; p < pools.length; p++) {
      const pool = pools[p];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          if (pool[i].clubId !== null && pool[i].clubId === pool[j].clubId) {
            if (trySwap(pools, p, j)) {
              improved = true;
            }
          }
        }
      }
    }
  }
  return { pools, unresolvedClubConflicts: countClubConflicts(pools) };
}

function trySwap(pools: SeedInput[][], poolIndex: number, fencerIndexInPool: number): boolean {
  const fencer = pools[poolIndex][fencerIndexInPool];
  for (let otherPool = 0; otherPool < pools.length; otherPool++) {
    if (otherPool === poolIndex) continue;
    for (let k = 0; k < pools[otherPool].length; k++) {
      const candidate = pools[otherPool][k];
      const createsConflictInOriginal = pools[poolIndex].some((f, idx) => idx !== fencerIndexInPool && f.clubId !== null && f.clubId === candidate.clubId);
      const createsConflictInOther = pools[otherPool].some((f, idx) => idx !== k && f.clubId !== null && f.clubId === fencer.clubId);
      if (!createsConflictInOriginal && !createsConflictInOther) {
        pools[poolIndex][fencerIndexInPool] = candidate;
        pools[otherPool][k] = fencer;
        return true;
      }
    }
  }
  return false;
}

function countClubConflicts(pools: SeedInput[][]): number {
  let conflicts = 0;
  for (const pool of pools) {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        if (pool[i].clubId !== null && pool[i].clubId === pool[j].clubId) conflicts++;
      }
    }
  }
  return conflicts;
}

export function generatePools(fencers: SeedInput[], manualPoolCount?: number): ConflictResolutionResult & { poolSizes: number[] } {
  if (fencers.length < 2) {
    throw new Error('Se necesitan al menos 2 tiradores inscritos para generar poules');
  }
  const seedOrder = buildSeedOrder(fencers);
  const numPools = computePoolCount(fencers.length, manualPoolCount);
  const poolSizes = computePoolSizes(fencers.length, numPools);
  const initialPools = snakeAssign(seedOrder, poolSizes);
  const result = resolveClubConflicts(initialPools);
  return { ...result, poolSizes };
}

/**
 * ============================================================================
 * MATRICES FIE: ORDEN DE ASALTOS (FIE Reglamento Técnico Art. o.17)
 * ============================================================================
 */
export const FIE_BOUT_ORDERS: Record<number, [number, number][]> = {
  4: [[1,4], [2,3], [1,3], [2,4], [3,4], [1,2]],
  5: [[1,2], [3,4], [5,1], [2,3], [5,4], [1,3], [2,5], [4,1], [3,5], [4,2]],
  6: [[1,2], [4,5], [2,3], [5,6], [3,1], [6,4], [2,5], [1,4], [5,3], [1,6], [4,2], [3,6], [5,1], [3,4], [6,2]],
  7: [[1,4], [2,5], [3,6], [7,1], [5,4], [2,3], [6,7], [5,1], [4,3], [6,2], [5,7], [3,1], [4,6], [7,2], [3,5], [1,6], [2,4], [7,3], [6,5], [1,2], [4,7]],
  8: [[2,3], [1,5], [7,4], [6,8], [1,2], [3,4], [5,6], [8,7], [4,1], [5,2], [8,3], [6,7], [4,2], [8,1], [7,5], [3,6], [2,8], [5,4], [6,1], [3,7], [4,8], [2,6], [3,5], [1,7], [4,6], [8,5], [7,2], [1,3]]
};

export function getFIEBoutOrder(poolSize: number): [number, number][] {
  if (poolSize < 4 || poolSize > 8) {
    throw new Error(`Tamaño de poule (${poolSize}) no tiene tabla FIE estándar definida (4-8).`);
  }
  return FIE_BOUT_ORDERS[poolSize];
}