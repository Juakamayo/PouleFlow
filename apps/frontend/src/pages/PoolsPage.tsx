import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { EventDTO, PoolDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

const weaponLabels: Record<string, string> = { EPEE: 'Espada', FOIL: 'Florete', SABER: 'Sable' };
const genderLabels: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Femenino', MIXED: 'Mixto' };

// Matriz FIE inyectada localmente para renderizado visual inmediato
const FIE_BOUT_ORDERS: Record<number, [number, number][]> = {
  4: [[1,4], [2,3], [1,3], [2,4], [3,4], [1,2]],
  5: [[1,2], [3,4], [5,1], [2,3], [5,4], [1,3], [2,5], [4,1], [3,5], [4,2]],
  6: [[1,2], [4,5], [2,3], [5,6], [3,1], [6,4], [2,5], [1,4], [5,3], [1,6], [4,2], [3,6], [5,1], [3,4], [6,2]],
  7: [[1,4], [2,5], [3,6], [7,1], [5,4], [2,3], [6,7], [5,1], [4,3], [6,2], [5,7], [3,1], [4,6], [7,2], [3,5], [1,6], [2,4], [7,3], [6,5], [1,2], [4,7]],
  8: [[2,3], [1,5], [7,4], [6,8], [1,2], [3,4], [5,6], [8,7], [4,1], [5,2], [8,3], [6,7], [4,2], [8,1], [7,5], [3,6], [2,8], [5,4], [6,1], [3,7], [4,8], [2,6], [3,5], [1,7], [4,6], [8,5], [7,2], [1,3]],
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

  const eventQuery = useQuery({
    queryKey: ['events', 'detail', evId],
    queryFn: () => api.get<EventDTO>(`/events/${evId}`),
  });

  const poolsQuery = useQuery({
    queryKey: ['pools', evId],
    queryFn: () => api.get<PoolDTO[]>(`/events/${evId}/pools`),
  });

  const generateMutation = useMutation({
    mutationFn: (force: boolean) => {
      const params = new URLSearchParams();
      if (force) params.set('force', 'true');
      if (manualPoolCount) params.set('poolCount', manualPoolCount);
      return api.post<GenerateResult>(`/events/${evId}/pools/generate?${params.toString()}`, {});
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pools', evId] });
      setLastResult(result);
      setErrors([]);
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
    },
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al eliminar poules']);
    },
  });

  function handleGenerate() {
    setErrors([]);
    generateMutation.mutate(false);
  }

  function handleRegenerate() {
    if (window.confirm('¿Regenerar poules? Esto borra las poules actuales y cualquier resultado ya cargado en ellas.')) {
      generateMutation.mutate(true);
    }
  }

  const ev = eventQuery.data;
  const eventLabel = ev
    ? `${weaponLabels[ev.weapon?.name ?? ''] ?? ev.weapon?.name} ${genderLabels[ev.gender]} ${ev.category?.name}`
    : '...';

  const hasPools = (poolsQuery.data?.length ?? 0) > 0;

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
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

      <div className="mb-8 flex items-end gap-3 rounded border border-stone-300 bg-white p-4">
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-graphite-700">
            N° de poules <span className="text-graphite-700/50">(opcional)</span>
          </label>
          <input
            type="number"
            min={1}
            value={manualPoolCount}
            onChange={(e) => setManualPoolCount(e.target.value)}
            placeholder="Automático"
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-mono focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
          />
        </div>
        {!hasPools ? (
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="rounded bg-graphite-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-graphite-700 disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generando...' : 'Generar poules'}
          </button>
        ) : (
          <>
            <button
              onClick={handleRegenerate}
              disabled={generateMutation.isPending}
              className="rounded border border-piste px-4 py-2 text-sm font-medium text-piste transition-colors hover:bg-piste hover:text-white disabled:opacity-50"
            >
              {generateMutation.isPending ? 'Regenerando...' : 'Regenerar poules'}
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded border border-stone-300 px-4 py-2 text-sm font-medium text-graphite-700 transition-colors hover:bg-stone-100"
            >
              Eliminar poules
            </button>
          </>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mb-6 rounded border border-piste/30 bg-piste/5 px-4 py-3 text-sm text-piste-dark">
          {errors.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}

      {lastResult && lastResult.unresolvedClubConflicts > 0 && (
        <div className="mb-6 rounded border border-yellow-400/40 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Se generaron las poules, pero quedaron <strong>{lastResult.unresolvedClubConflicts}</strong>{' '}
          par(es) de tiradores del mismo club en la misma poule. Revisa manualmente si es necesario.
        </div>
      )}

      {!poolsQuery.isLoading && !hasPools && (
        <div className="rounded border border-stone-300 bg-white px-4 py-6 text-center text-sm text-graphite-700/60">
          Aún no hay poules generadas para este evento.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {poolsQuery.data?.map((pool) => {
          const poolSize = pool.assignments.length;
          const boutOrder = FIE_BOUT_ORDERS[poolSize] || [];

          return (
            <div key={pool.id} className="overflow-hidden rounded border border-stone-300 bg-white flex flex-col">
              <div className="border-b border-stone-300 bg-stone-100 px-4 py-2">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
                  Poule {pool.poolNumber}
                </h3>
              </div>
              
              {/* Tabla de Asignaciones (Tiradores inscritos) */}
              <table className="w-full text-sm">
                <tbody>
                  {pool.assignments.map((a, idx) => (
                    <tr key={a.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs text-graphite-700/60">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium">
                        {a.fencer?.lastName}, {a.fencer?.firstName}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-graphite-700/60">
                        {a.fencer?.club?.shortCode ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Listado Visual de Asaltos FIE */}
              {boutOrder.length > 0 && (
                <div className="mt-auto border-t border-stone-300 bg-stone-50">
                  <div className="px-4 py-2 border-b border-stone-200">
                    <h4 className="font-display text-xs font-semibold text-graphite-600 uppercase tracking-wider">
                      Llamado a Pista ({boutOrder.length} asaltos)
                    </h4>
                  </div>
                  <ul className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    {boutOrder.map((pair, idx) => {
                      // Restamos 1 porque la FIE es base-1 y el array es base-0
                      const fA = pool.assignments[pair[0] - 1]?.fencer;
                      const fB = pool.assignments[pair[1] - 1]?.fencer;
                      
                      return (
                        <li key={idx} className="flex items-center justify-between text-sm border border-stone-200 rounded p-2 bg-white shadow-sm">
                          <div className="w-6 text-center font-mono text-xs text-stone-400 font-bold">{idx + 1}</div>
                          <div className="flex flex-1 items-center justify-end gap-2 text-right">
                            <span className="font-medium text-graphite-800">{fA?.lastName}</span>
                          </div>
                          <div className="px-3 font-mono font-bold text-piste/70 text-xs">VS</div>
                          <div className="flex flex-1 items-center justify-start gap-2">
                            <span className="font-medium text-graphite-800">{fB?.lastName}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}