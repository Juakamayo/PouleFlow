// apps/frontend/src/pages/TableauPage.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

const weaponLabels: Record<string, string> = { EPEE: 'Espada', FOIL: 'Florete', SABER: 'Sable' };
const genderLabels: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Femenino', MIXED: 'Mixto' };

// Mapeo de nombres de ronda numérica a etiquetas visibles
const roundNameMap: Record<number, string> = {
  2: 'Finales',
  4: 'Semifinales',
  8: 'Tabla de 8',
  16: 'Tabla de 16',
  32: 'Tabla de 32',
  64: 'Tabla de 64',
};

// Componente para dibujar un match individual en el árbol
function BracketMatchBox({ match }: { match: any }) {
  const fA = match.fencerA;
  const fB = match.fencerB;
  return (
    <div className="bg-white border border-stone-400 rounded shadow-sm relative text-xs w-64 h-16 flex flex-col justify-center">
      {/* Tirador A (Rojo) */}
      <div className={`px-2 flex justify-between items-center ${match.winnerId === fA?.id ? 'font-bold bg-green-50' : ''}`}>
        <span className="truncate pr-2">
          {fA ? `(${fA.seedRank || '?'}) ${fA.lastName} ${fA.firstName.charAt(0)}.` : '- BYE -'}
        </span>
        <span className="font-mono bg-stone-100 px-1 rounded border border-stone-300 w-8 text-center">
          {fA ? match.scoreA : ''}
        </span>
      </div>
      <div className="h-px bg-stone-200" />
      {/* Tirador B (Verde) */}
      <div className={`px-2 flex justify-between items-center ${match.winnerId === fB?.id ? 'font-bold bg-green-50' : ''}`}>
        <span className="truncate pr-2">
          {fB ? `(${fB.seedRank || '?'}) ${fB.lastName} ${fB.firstName.charAt(0)}.` : '- BYE -'}
        </span>
        <span className="font-mono bg-stone-100 px-1 rounded border border-stone-300 w-8 text-center">
          {fB ? match.scoreB : ''}
        </span>
      </div>
    </div>
  );
}

export default function TableauPage() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();
  const evId = Number(eventId);
  const queryClient = useQueryClient();

  // Estados de configuración de generación
  const [defaultTouches, setDefaultTouches] = useState<number>(15);
  // Simulación de overrides por fase numérica (ej: semis/final 15, cuartos 10)
  const [roundTouchesOverrides] = useState<Record<number, number>>({ 2: 15, 4: 15, 8: 10 }); 

  const eventQuery = useQuery({
    queryKey: ['events', 'detail', evId],
    queryFn: () => api.get<any>(`/events/${evId}`),
  });

  const tableauQuery = useQuery({
    queryKey: ['tableau', evId],
    queryFn: () => api.get<any>(`/events/${evId}/tableau`),
    retry: false,
  });

  const generateTableauMutation = useMutation({
    // Enviar configuración de toques diferenciados
    mutationFn: () => api.post(`/events/${evId}/tableau/generate`, { defaultTouches, roundTouchesOverrides }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableau', evId] });
    },
    onError: (err: any) => {
      const errorMsg = err?.response?.data?.message || err?.messages?.[0] || err?.message || 'Error al generar';
      alert(`Error: ${errorMsg}`);
    }
  });

  const ev = eventQuery.data;
  const eventLabel = ev ? `${weaponLabels[ev.weapon?.name ?? ''] ?? ev.weapon?.name} ${genderLabels[ev.gender]} ${ev.category?.name}` : '...';
  const tableauData = tableauQuery.data;

  // 1. Obtener la configuración de toques por ronda desde el backend (JSON roundConfigs)
  const roundConfigs = tableauData?.roundConfigs as Record<number, number> || {};

  // 2. Generar la lista de rondas numéricas para dibujar columnas (descendente: 32 -> 16 -> 8 -> 4 -> 2)
  const activeRoundsNum: number[] = [];
  if (tableauData) {
    let r = tableauData.size;
    while (r >= 2) {
      activeRoundsNum.push(r);
      r /= 2;
    }
  }

  return (
    <div className="flex flex-col h-screen bg-stone-100 overflow-hidden">
      {/* Barra superior */}
      <header className="bg-stone-800 text-white px-4 py-2 flex justify-between items-center print:hidden flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link to={`/admin/tournaments/${tournamentId}/events`} className="text-xs text-stone-300 hover:text-white">
            ← Volver a Eventos
          </Link>
          <h1 className="font-display text-lg font-bold uppercase tracking-wider">{eventLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/admin/tournaments/${tournamentId}/events/${eventId}/ranking`} className="rounded bg-stone-700 px-3 py-1 text-xs font-semibold hover:bg-stone-600">
            📊 Ver Clasificación
          </Link>
          <Link to={`/admin/tournaments/${tournamentId}/events/${eventId}/pools`} className="rounded bg-stone-700 px-3 py-1 text-xs font-semibold hover:bg-stone-600">
            ⚔️ Ir a Poules
          </Link>
        </div>
      </header>

      {/* Sub-barra de generación estilo Engarde/FencingTime */}
      <div className="bg-stone-200 border-b border-stone-300 px-4 py-1.5 flex items-center justify-between text-xs print:hidden flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-stone-700">Ronda #2 - Eliminación Directa</span>
          <span className="text-stone-400">|</span>
          <span className="font-medium">Toques por defecto:</span>
          <select 
            value={defaultTouches} 
            onChange={(e) => setDefaultTouches(Number(e.target.value))}
            className="rounded border border-stone-300 bg-white px-2 py-0.5"
          >
            {[15, 12, 10, 7].map(t => <option key={t} value={t}>{t} toques</option>)}
          </select>
          {/* Aquí podrías añadir un input 'personalizado' y la interfaz para configurar cuartos/semis diferentemente antes de generar */}
        </div>
        <button 
          onClick={() => generateTableauMutation.mutate()}
          disabled={generateTableauMutation.isPending}
          className="rounded bg-blue-600 px-4 py-1 font-bold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {generateTableauMutation.isPending ? 'Generando...' : '⚙️ Generar Cuadro ED con Toques'}
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL CON SCROLL HORIZONTAL (overflow-x-auto) */}
      <div className="flex-1 bg-[#fefdf0] p-6 overflow-x-auto overflow-y-auto border-r border-stone-300">
        {!tableauData ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-500 gap-3">
            <p className="text-sm font-medium">No hay cuadro generado.</p>
            <button onClick={() => generateTableauMutation.mutate()} className="rounded bg-graphite-900 px-4 py-2 text-sm font-bold text-white hover:bg-graphite-700">
              Generar Cuadro Ahora
            </button>
          </div>
        ) : (
          /* Árbol completo dibujado como Flexbox con scroll horizontal */
          <div className="flex items-start gap-12 min-w-max pb-6">
            {activeRoundsNum.map((roundNum) => {
              // Obtener los toques configurados para esta ronda num (JSON del backend)
              const touches = roundConfigs[roundNum] || defaultTouches;
              
              // Filtrar los matches específicos para esta columna/ronda
              const roundMatches = tableauData.bracketMatches?.filter((m: any) => m.round === roundNum) || [];

              return (
                <div key={roundNum} className="flex flex-col gap-8 w-64 items-center">
                  {/* CABECERA ESTILO IMAGEN 8: Nombre Ronda + Toques Modificables */}
                  <div className="text-center w-full mb-3 pb-2 border-b border-stone-300">
                    <h3 className="font-display font-bold uppercase text-stone-900 text-xs tracking-tight">
                      {roundNameMap[roundNum] || `Tabla de ${roundNum}`}
                    </h3>
                    {/* Visualización clara de los toques para esta columna */}
                    <div className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded inline-block mt-0.5">
                      {touches} toques
                    </div>
                  </div>

                  {/* Lista de matches alineados verticalmente */}
                  <div className="flex flex-col gap-6">
                    {roundMatches.map((match: any) => (
                      <BracketMatchBox key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}