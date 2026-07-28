/**
 * Algoritmo de generación de poules.
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
 *
 * Regla: los que tienen seedRank van primero, en orden ascendente. Los que NO
 * tienen seed se consideran el ranking más bajo del evento, y su orden relativo
 * entre ellos se sortea aleatoriamente (nunca se asume que "sin seed" = mejor
 * ranking, ni se ordena arbitrariamente por orden de inscripción).
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
 * Determina cuántas poules crear para N tiradores, apuntando a un tamaño ideal
 * de 6-7 por poule, y aceptando un rango de 4 a 8 (guía estándar de esgrima).
 * Puede ser sobreescrito manualmente pasando `manualPoolCount`.
 */
export function computePoolCount(n: number, manualPoolCount?: number): number {
  if (manualPoolCount) {
    if (manualPoolCount < 1 || manualPoolCount > n) {
      throw new Error('poolCount inválido para la cantidad de tiradores inscritos');
    }
    return manualPoolCount;
  }

  if (n <= 8) return 1;

  const minPools = Math.ceil(n / 8); // no más de 8 por poule
  const maxPools = Math.max(minPools, Math.floor(n / 4)); // no menos de 4 por poule
  const ideal = Math.round(n / 6.5); // apunta a ~6-7 por poule

  return Math.max(1, Math.min(Math.max(ideal, minPools), maxPools));
}

/** Reparte N tiradores en `numPools` poules lo más parejo posible (diferencia máx. de 1). */
export function computePoolSizes(n: number, numPools: number): number[] {
  const base = Math.floor(n / numPools);
  const remainder = n % numPools;
  return Array.from({ length: numPools }, (_, i) => (i < remainder ? base + 1 : base));
}

/**
 * Distribución serpiente (boustrophedon): 1→2→3→3→2→1→1→2→3...
 * Las poules más pequeñas simplemente dejan de recibir tiradores una vez llenas,
 * lo cual reproduce el comportamiento estándar cuando los tamaños no son iguales.
 */
export function snakeAssign<T>(seedOrder: T[], poolSizes: number[]): T[][] {
  const numPools = poolSizes.length;
  const pools: T[][] = Array.from({ length: numPools }, () => []);
  let idx = 0;
  let row = 0;

  while (idx < seedOrder.length) {
    const order =
      row % 2 === 0
        ? [...Array(numPools).keys()]
        : [...Array(numPools).keys()].reverse();

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

/**
 * Intenta separar al máximo a tiradores del mismo club (regla FIE) mediante swaps
 * entre poules que no introduzcan un conflicto nuevo. Es un algoritmo voraz (greedy):
 * no garantiza una solución óptima global, pero resuelve la gran mayoría de los casos
 * reales de un club. Si un club tiene más inscritos que poules disponibles, algunos
 * conflictos son matemáticamente inevitables y quedan reportados en el resultado.
 */
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

  const unresolvedClubConflicts = countClubConflicts(pools);
  return { pools, unresolvedClubConflicts };
}

function trySwap(pools: SeedInput[][], poolIndex: number, fencerIndexInPool: number): boolean {
  const fencer = pools[poolIndex][fencerIndexInPool];

  for (let otherPool = 0; otherPool < pools.length; otherPool++) {
    if (otherPool === poolIndex) continue;

    for (let k = 0; k < pools[otherPool].length; k++) {
      const candidate = pools[otherPool][k];

      const createsConflictInOriginal = pools[poolIndex].some(
        (f, idx) => idx !== fencerIndexInPool && f.clubId !== null && f.clubId === candidate.clubId,
      );
      const createsConflictInOther = pools[otherPool].some(
        (f, idx) => idx !== k && f.clubId !== null && f.clubId === fencer.clubId,
      );

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

/** Orquesta el pipeline completo: seeding → tamaños → serpiente → separación de club. */
export function generatePools(
  fencers: SeedInput[],
  manualPoolCount?: number,
): ConflictResolutionResult & { poolSizes: number[] } {
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
