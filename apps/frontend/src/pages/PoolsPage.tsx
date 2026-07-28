import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { EventDTO, PoolDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

const weaponLabels: Record<string, string> = { EPEE: 'Espada', FOIL: 'Florete', SABER: 'Sable' };
const genderLabels: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Femenino', MIXED: 'Mixto' };

const FIE_BOUT_ORDERS: Record<number, [number, number][]> = {
  2: [[1,2]],
  3: [[1,2], [2,3], [1,3]],
  4: [[1,4], [2,3], [1,3], [2,4], [3,4], [1,2]],
  5: [[1,2], [3,4], [5,1], [2,3], [5,4], [1,3], [2,5], [4,1], [3,5], [4,2]],
  6: [[1,2], [4,5], [2,3], [5,6], [3,1], [6,4], [2,5], [1,4], [5,3], [1,6], [4,2], [3,6], [5,1], [3,4], [6,2]],
  7: [[1,4], [2,5], [3,6], [7,1], [5,4], [2,3], [6,7], [5,1], [4,3], [6,2], [5,7], [3,1], [4,6], [7,2], [3,5], [1,6], [2,4], [7,3], [6,5], [1,2], [4,7]],
  8: [[2,3], [1,5], [7,4], [6,8], [1,2], [3,4], [5,6], [8,7], [4,1], [5,2], [8,3], [6,7], [4,2], [8,1], [7,5], [3,6], [2,8], [5,4], [6,1], [3,7], [4,8], [2,6], [3,5], [1,7], [4,6], [8,5], [7,2], [1,3]],
  9: [[1,9], [2,8], [3,7], [4,6], [1,5], [2,9], [3,8], [4,7], [5,6], [1,2], [3,9], [4,8], [5,7], [1,6], [2,3], [4,9], [5,8], [6,7], [1,3], [2,4], [5,9], [6,8], [7,1], [4,5], [2,7], [3,6], [1,8], [9,7], [5,2], [4,3], [6,1], [8,7], [9,4], [3,5], [2,6], [1,4]],
};

function computeIdealPoolCount(n: number): number {
  if (n <= 8) return 1;
  const minPools = Math.ceil(n / 8);
  const maxPools = Math.max(minPools, Math.floor(n / 4));
  const ideal = Math.round(n / 6.5);
  return Math.max(1, Math.min(Math.max(ideal, minPools), maxPools));
}

const parseFencingScore = (val: string) => {
  if (!val) return { val: 0, isV: false };
  const upper = val.trim().toUpperCase();
  if (upper === 'V') return { val: 5, isV: true };
  if (upper.startsWith('V')) return { val: parseInt(upper.replace('V', '')) || 0, isV: true };
  if (upper.startsWith('D')) return { val: parseInt(upper.replace('D', '')) || 0, isV: false };
  return { val: parseInt(upper) || 0, isV: false };
};

interface GenerateResult {
  pools: PoolDTO[];
  poolSizes: number[];
  unresolvedClubConflicts: number;
}

export default function PoolsPage() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();
  const evId = Number(eventId);
  const queryClient = useQueryClient();
  
  const [manualPoolCount, setManualPoolCount] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<GenerateResult | null>(null);
  
  const [matrix, setMatrix] = useState<Record<string, string>>({});
  const [printPoolId, setPrintPoolId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number | 'ALL'>('ALL');

  const eventQuery = useQuery({
    queryKey: ['events', 'detail', evId],
    queryFn: () => api.get<EventDTO>(`/events/${evId}`),
  });

  const registrationsQuery = useQuery({
    queryKey: ['registrations', 'event', evId],
    queryFn: () => api.get<any>(`/registration?eventId=${evId}`).catch(() => api.get<any>(`/registrations?eventId=${evId}`)),
  });

  const poolsQuery = useQuery({
    queryKey: ['pools', evId],
    queryFn: () => api.get<PoolDTO[]>(`/events/${evId}/pools`),
  });

  const fencerCount = (() => {
    const evData = eventQuery.data as any;
    if (evData && evData._count?.registrations) return evData._count.registrations;
    if (!registrationsQuery.data) return 0;
    if (Array.isArray(registrationsQuery.data)) return registrationsQuery.data.length;
    if (Array.isArray(registrationsQuery.data.data)) return registrationsQuery.data.data.length;
    return 0;
  })();

  const generateMutation = useMutation({
    mutationFn: ({ force, finalPoolCount }: { force: boolean; finalPoolCount?: string }) => {
      const params = new URLSearchParams();
      if (force) params.set('force', 'true');
      if (finalPoolCount) params.set('poolCount', finalPoolCount);
      return api.post<GenerateResult>(`/events/${evId}/pools/generate?${params.toString()}`, {});
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pools', evId] });
      setLastResult(result);
      setErrors([]);
      setMatrix({}); 
      setActiveTab('ALL');
    },
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al generar poules']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/events/${evId}/pools`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools', evId] });
      setLastResult(null);
      setMatrix({});
      setActiveTab('ALL');
    },
  });

  const saveScoresMutation = useMutation({
    mutationFn: ({ poolId, bouts }: { poolId: number, bouts: any[] }) => {
      return api.post(`/events/${evId}/pools/${poolId}/scores`, { bouts });
    },
    onSuccess: () => {
      alert('¡Resultados guardados exitosamente en la base de datos!');
      queryClient.invalidateQueries({ queryKey: ['pools', evId] });
    },
    onError: (error) => {
      alert('Error al guardar los resultados.');
      console.error(error);
    }
  });

  function handleGenerateClick(isRegenerate = false) {
    setErrors([]);
    if (manualPoolCount) {
      if (isRegenerate && !window.confirm(`¿Regenerar poules forzando ${manualPoolCount} poule(s)? Esto borra los resultados actuales.`)) return;
      generateMutation.mutate({ force: isRegenerate, finalPoolCount: manualPoolCount });
    } else {
      if (fencerCount === 0) {
        alert("No se pudo detectar la cantidad de tiradores o no hay inscritos.");
        return;
      }
      const idealPools = computeIdealPoolCount(fencerCount);
      const warningMsg = isRegenerate
        ? `ATENCIÓN: Se borrarán las poules actuales.\n\nPor la cantidad de tiradores inscritos (${fencerCount}), se generarán ${idealPools} poule(s) automáticamente.\n\n¿Está de acuerdo con esto?`
        : `Por la cantidad de tiradores inscritos (${fencerCount}), se generarán ${idealPools} poule(s) automáticamente.\n\n¿Está de acuerdo con esto?`;

      if (window.confirm(warningMsg)) {
        generateMutation.mutate({ force: isRegenerate, finalPoolCount: idealPools.toString() });
      }
    }
  }

  // --- LÓGICA DE AUTO-FOCUS ---
  const advanceFocus = (poolId: number, row: number, col: number, N: number) => {
    let nextRow = row;
    let nextCol = col + 1;

    while (nextRow < N) {
      if (nextCol >= N) {
        nextRow++;
        nextCol = 0;
      } else if (nextRow === nextCol) {
        nextCol++;
      } else {
        const nextInput = document.getElementById(`cell_${poolId}_${nextRow}_${nextCol}`);
        if (nextInput) {
          (nextInput as HTMLInputElement).focus();
          (nextInput as HTMLInputElement).select(); // Selecciona el texto al entrar
        }
        break;
      }
    }
  };

  // --- NUEVA VALIDACIÓN Y MANEJO DE PUNTAJE ---
  const handleScoreChange = (poolId: number, row: number, col: number, val: string, N: number) => {
    const newVal = val.toUpperCase().trim();

    // 1. Validar formato FIE (Permite vacío, V, D, números 0-5 y combinaciones como V5, D2)
    if (newVal !== '' && !/^[VD]?[0-5]?$/.test(newVal)) {
      return; 
    }

    // 2. Validación de 5 vs 5 (Evitar que ambos ganen)
    const isWinningScore = newVal === '5' || newVal === 'V' || newVal.startsWith('V');
    if (isWinningScore) {
      const oppScore = matrix[`${poolId}_${col}_${row}`];
      if (oppScore) {
        const parsedOpp = parseFencingScore(oppScore);
        if (parsedOpp.isV || parsedOpp.val === 5) {
          alert('¡Imposible! Ambos tiradores no pueden anotar 5 puntos o registrar una Victoria en el mismo asalto.');
          return; 
        }
      }
    }

    // 3. Guardar estado
    setMatrix(prev => ({ ...prev, [`${poolId}_${row}_${col}`]: newVal }));

    // 4. Auto-Advance inteligente (Avanza solo si se escribió un número definitivo o la letra V)
    if (/^[0-5]$/.test(newVal) || newVal === 'V' || /^[VD][0-5]$/.test(newVal)) {
      advanceFocus(poolId, row, col, N);
    }
  };

  const handlePrint = (poolId: number) => {
    setPrintPoolId(poolId);
    setTimeout(() => {
      window.print();
      setPrintPoolId(null);
    }, 150);
  };

  const handleSaveScores = (pool: PoolDTO) => {
    const N = pool.assignments.length;
    const boutOrder = FIE_BOUT_ORDERS[N] || [];
    const boutsToSave: any[] = [];

    boutOrder.forEach((pair, idx) => {
      const aIdx = pair[0] - 1;
      const bIdx = pair[1] - 1;
      
      const fA = pool.assignments[aIdx];
      const fB = pool.assignments[bIdx];
      
      const scoreARaw = matrix[`${pool.id}_${aIdx}_${bIdx}`];
      const scoreBRaw = matrix[`${pool.id}_${bIdx}_${aIdx}`];

      if (scoreARaw !== undefined && scoreBRaw !== undefined && scoreARaw !== '' && scoreBRaw !== '') {
         const parsedA = parseFencingScore(scoreARaw);
         const parsedB = parseFencingScore(scoreBRaw);
         
         boutsToSave.push({
           fencerAId: fA.fencer?.id,
           fencerBId: fB.fencer?.id,
           scoreA: parsedA.val,
           scoreB: parsedB.val,
           boutOrder: idx + 1
         });
      }
    });

    if (boutsToSave.length === 0) {
       alert('No hay asaltos con resultados completos (ida y vuelta) para guardar.');
       return;
    }

    saveScoresMutation.mutate({ poolId: pool.id, bouts: boutsToSave });
  };

  const ev = eventQuery.data;
  const eventLabel = ev ? `${weaponLabels[ev.weapon?.name ?? ''] ?? ev.weapon?.name} ${genderLabels[ev.gender]} ${ev.category?.name}` : '...';
  const hasPools = (poolsQuery.data?.length ?? 0) > 0;
  
  const visiblePools = poolsQuery.data?.filter(p => activeTab === 'ALL' || p.id === activeTab) || [];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="mb-6 print:hidden">
        <Link to={`/admin/tournaments/${tournamentId}/events`} className="text-xs font-medium text-graphite-700 hover:text-piste">
          ← Volver a Eventos
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold uppercase tracking-wide">
          Poules — {eventLabel}
        </h2>
        <div className="mt-2 flex gap-1">
          <div className="h-0.5 w-10 bg-piste" />
          <div className="h-0.5 w-3 bg-stone-300" />
        </div>
      </header>

      <div className="mb-8 flex items-end gap-3 rounded border border-stone-300 bg-white p-4 print:hidden">
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-graphite-700">
            N° de poules <span className="text-graphite-700/50">(opc)</span>
          </label>
          <input
            type="number"
            min={1}
            value={manualPoolCount}
            onChange={(e) => setManualPoolCount(e.target.value)}
            placeholder="Auto"
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-mono focus:border-piste focus:outline-none"
          />
        </div>
        {!hasPools ? (
          <button onClick={() => handleGenerateClick(false)} disabled={generateMutation.isPending} className="rounded bg-graphite-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-graphite-700 disabled:opacity-50">
            {generateMutation.isPending ? 'Generando...' : 'Generar poules'}
          </button>
        ) : (
          <>
            <button onClick={() => handleGenerateClick(true)} disabled={generateMutation.isPending} className="rounded border border-piste px-4 py-2 text-sm font-medium text-piste transition-colors hover:bg-piste hover:text-white disabled:opacity-50">
              {generateMutation.isPending ? 'Regenerando...' : 'Regenerar poules'}
            </button>
            <button onClick={() => { if (window.confirm('¿Eliminar todas las poules?')) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="rounded border border-stone-300 px-4 py-2 text-sm font-medium text-graphite-700 hover:bg-stone-100">
              Eliminar poules
            </button>
          </>
        )}
      </div>

      {hasPools && (
        <div className="mb-6 flex space-x-1 border-b border-stone-300 print:hidden overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-graphite-600 hover:text-graphite-900 hover:bg-stone-50'
            }`}
          >
            Vista general
          </button>
          {poolsQuery.data?.map((pool) => (
            <button
              key={pool.id}
              onClick={() => setActiveTab(pool.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === pool.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-graphite-600 hover:text-graphite-900 hover:bg-stone-50'
              }`}
            >
              Poule #{pool.poolNumber}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {visiblePools.map((pool) => {
          const N = pool.assignments.length;
          const boutOrder = FIE_BOUT_ORDERS[N] || [];
          
          const rowsStats = pool.assignments.map((_, i) => {
            let V = 0, TD = 0, TR = 0, matches = 0;
            for (let j = 0; j < N; j++) {
              if (i === j) continue;
              const myScore = matrix[`${pool.id}_${i}_${j}`];
              const oppScore = matrix[`${pool.id}_${j}_${i}`];
              if (myScore !== undefined && oppScore !== undefined && myScore !== '' && oppScore !== '') {
                matches++;
                const my = parseFencingScore(myScore);
                const opp = parseFencingScore(oppScore);
                TD += my.val;
                TR += opp.val;
                if (my.isV || (!opp.isV && my.val > opp.val)) V++;
              }
            }
            const Ind = TD - TR;
            const ratio = matches > 0 ? V / matches : 0;
            return { i, V, TD, TR, Ind, ratio };
          });

          const sorted = [...rowsStats].sort((a, b) => {
            if (b.ratio !== a.ratio) return b.ratio - a.ratio;
            if (b.Ind !== a.Ind) return b.Ind - a.Ind;
            return b.TD - a.TD;
          });
          
          const placements: Record<number, number> = {};
          sorted.forEach((stat, rank) => { placements[stat.i] = rank + 1; });

          const isPrintingThis = printPoolId === pool.id;
          const hideForPrintClass = printPoolId && !isPrintingThis ? 'hidden' : '';

          return (
            <div key={pool.id} className={`overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm ${hideForPrintClass} print:border-none print:shadow-none print:m-0`}>
              
              <div className="flex items-center justify-between bg-blue-600 px-4 py-2 text-white print:bg-white print:text-black print:border-b-2 print:border-black">
                <div className="flex items-center gap-4">
                  <h3 className="font-display text-lg font-bold">Poule #{pool.poolNumber}</h3>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>Pista:</span>
                    <input type="text" className="w-16 rounded border-none bg-white/20 px-2 py-0.5 text-white placeholder-white/50 focus:bg-white focus:text-black print:border print:border-black print:bg-white print:text-black" placeholder="___" />
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>Hora:</span>
                    <input type="text" className="w-20 rounded border-none bg-white/20 px-2 py-0.5 text-white placeholder-white/50 focus:bg-white focus:text-black print:border print:border-black print:bg-white print:text-black" placeholder="___" />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 print:hidden">
                  <button 
                    onClick={() => handleSaveScores(pool)} 
                    disabled={saveScoresMutation.isPending}
                    className="rounded bg-green-500 hover:bg-green-400 px-4 py-1 text-sm font-bold text-white transition-colors shadow-sm disabled:opacity-50"
                  >
                    {saveScoresMutation.isPending ? 'Guardando...' : '💾 Guardar Resultados'}
                  </button>
                  <button 
                    onClick={() => handlePrint(pool.id)} 
                    className="rounded bg-white/20 px-3 py-1 text-sm font-medium hover:bg-white/30 transition-colors"
                  >
                    Imprimir
                  </button>
                </div>
              </div>
              
              <div className="p-4 overflow-x-auto">
                <table className="border-collapse text-sm mb-8 print:w-full">
                  <thead>
                    <tr>
                      <th className="w-8 border border-stone-300 bg-stone-100 px-2 py-1 text-center font-bold print:bg-stone-100">N°</th>
                      <th className="w-64 border border-stone-300 bg-stone-100 px-2 py-1 text-left font-bold print:bg-stone-100">Nombre</th>
                      {pool.assignments.map((_, i) => (
                        <th key={i} className="w-10 border border-stone-300 bg-stone-100 text-center font-bold print:bg-stone-100">{i + 1}</th>
                      ))}
                      <th className="w-10 border border-stone-300 bg-stone-100 text-center font-bold text-graphite-700 print:bg-stone-100">V</th>
                      <th className="w-10 border border-stone-300 bg-stone-100 text-center font-bold text-graphite-700 print:bg-stone-100">TD</th>
                      <th className="w-10 border border-stone-300 bg-stone-100 text-center font-bold text-graphite-700 print:bg-stone-100">TR</th>
                      <th className="w-12 border border-stone-300 bg-stone-100 text-center font-bold text-graphite-700 print:bg-stone-100">Ind</th>
                      <th className="w-10 border border-stone-300 bg-stone-100 text-center font-bold text-graphite-700 print:bg-stone-100">Pl</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pool.assignments.map((a, i) => {
                      const stats = rowsStats[i];
                      return (
                        <tr key={a.id}>
                          <td className="border border-stone-300 text-center font-bold bg-stone-50 print:bg-stone-50">{i + 1}</td>
                          <td className="border border-stone-300 px-2 py-1">
                            <div className="font-semibold uppercase text-graphite-900">{a.fencer?.lastName}</div>
                            <div className="flex justify-between text-xs text-graphite-500">
                              <span>{a.fencer?.firstName}</span>
                              <span className="font-bold">{a.fencer?.country?.iocCode}</span>
                            </div>
                          </td>
                          {pool.assignments.map((_, j) => {
                            if (i === j) return <td key={j} className="border border-stone-300 bg-graphite-900 print:bg-black p-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></td>;
                            
                            const myScoreRaw = matrix[`${pool.id}_${i}_${j}`];
                            const oppScoreRaw = matrix[`${pool.id}_${j}_${i}`];
                            let textColorClass = "text-graphite-900";
                            
                            if (myScoreRaw && oppScoreRaw) {
                              const myNum = parseFencingScore(myScoreRaw);
                              const oppNum = parseFencingScore(oppScoreRaw);
                              if (myNum.isV || (!oppNum.isV && myNum.val > oppNum.val)) {
                                textColorClass = "text-blue-600 font-bold print:text-black";
                              } else if (oppNum.isV || (!myNum.isV && oppNum.val > myNum.val)) {
                                textColorClass = "text-red-600 font-bold print:text-black";
                              }
                            }

                            return (
                              <td key={j} className="border border-stone-300 p-0 text-center relative">
                                <input
                                  id={`cell_${pool.id}_${i}_${j}`}
                                  type="text"
                                  className={`w-full h-full min-h-[40px] text-center text-sm font-mono border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none uppercase bg-transparent ${textColorClass}`}
                                  maxLength={3}
                                  value={myScoreRaw || ''}
                                  onChange={(e) => handleScoreChange(pool.id, i, j, e.target.value, N)}
                                  onFocus={(e) => e.target.select()}
                                />
                              </td>
                            );
                          })}
                          <td className="border border-stone-300 text-center font-bold bg-blue-50/30 print:bg-transparent">{stats.V}</td>
                          <td className="border border-stone-300 text-center font-mono bg-stone-50/50 print:bg-transparent">{stats.TD}</td>
                          <td className="border border-stone-300 text-center font-mono bg-stone-50/50 print:bg-transparent">{stats.TR}</td>
                          <td className="border border-stone-300 text-center font-mono font-bold bg-blue-50/30 print:bg-transparent">
                            {stats.Ind > 0 ? `+${stats.Ind}` : stats.Ind}
                          </td>
                          <td className="border border-stone-300 text-center font-bold bg-stone-100 print:bg-stone-100">{placements[i]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {boutOrder.length > 0 && (
                  <div className="mt-4 print:mt-8">
                    <h4 className="text-sm font-medium text-graphite-800 mb-2">
                      Estándar orden de match ({boutOrder.length} matches):
                    </h4>
                    <table className="w-full text-sm border-collapse border border-stone-300 print:text-xs">
                      <thead>
                        <tr className="bg-stone-50">
                          <th className="border border-stone-300 px-2 py-1 text-center w-8">#</th>
                          <th className="border border-stone-300 px-2 py-1 text-center w-16">Match</th>
                          <th className="border border-stone-300 px-2 py-1 text-left">Tiradores</th>
                          <th className="border border-stone-300 px-2 py-1 text-center w-24">Resultado</th>
                          <th className="border border-stone-300 px-2 py-1 text-left w-48">ADVERTENCIAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boutOrder.map((pair, idx) => {
                          const aIdx = pair[0] - 1;
                          const bIdx = pair[1] - 1;
                          const fA = pool.assignments[aIdx]?.fencer;
                          const fB = pool.assignments[bIdx]?.fencer;
                          
                          const scoreA = matrix[`${pool.id}_${aIdx}_${bIdx}`];
                          const scoreB = matrix[`${pool.id}_${bIdx}_${aIdx}`];
                          
                          let resultDisplay = '';
                          if (scoreA !== undefined && scoreB !== undefined && scoreA !== '' && scoreB !== '') {
                             const parsedA = parseFencingScore(scoreA);
                             const parsedB = parseFencingScore(scoreB);
                             
                             const aWins = parsedA.isV || (!parsedB.isV && parsedA.val > parsedB.val);
                             const bWins = parsedB.isV || (!parsedA.isV && parsedB.val > parsedA.val);
                             
                             const strA = aWins ? `V${parsedA.val}` : `D${parsedA.val}`;
                             const strB = bWins ? `V${parsedB.val}` : `D${parsedB.val}`;
                             resultDisplay = `${strA} - ${strB}`;
                          }

                          return (
                            <tr key={idx} className="bg-white">
                              <td className="border border-stone-300 px-2 py-1 text-center text-stone-500">{idx + 1}</td>
                              <td className="border border-stone-300 px-2 py-1 text-center font-bold text-graphite-700">
                                {pair[0]} vs. {pair[1]}
                              </td>
                              <td className="border border-stone-300 px-2 py-1">
                                <span className="uppercase">{fA?.lastName}</span> {fA?.firstName} <span className="text-stone-400 mx-2 text-xs">vs.</span> <span className="uppercase">{fB?.lastName}</span> {fB?.firstName}
                              </td>
                              <td className="border border-stone-300 px-2 py-1 text-center font-mono font-bold text-graphite-800">
                                {resultDisplay}
                              </td>
                              <td className="border border-stone-300 px-2 py-1"></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}