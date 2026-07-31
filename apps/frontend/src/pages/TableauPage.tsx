import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { EventDTO, TableauDTO, BracketMatchDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

const weaponLabels: Record<string, string> = { EPEE: 'Espada', FOIL: 'Florete', SABER: 'Sable' };
const genderLabels: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Femenino', MIXED: 'Mixto' };

const roundNameMap: Record<number, string> = {
  2: 'Final', 4: 'Semifinales', 8: 'Tabla de 8', 16: 'Tabla de 16', 32: 'Tabla de 32', 64: 'Tabla de 64',
};

const COL_WIDTH = 288;
const COL_GAP = 56;
const MATCH_H = 60;
const SLOT = 72;
const HEADER_H = 48;

const TOUCH_OPTIONS = [15, 12, 10, 7, 5];

function BracketMatchBox({
  match,
  onSave,
  saving,
}: {
  match: BracketMatchDTO;
  onSave: (id: number, scoreA: number, scoreB: number) => void;
  saving: boolean;
}) {
  const fA = match.fencerA;
  const fB = match.fencerB;
  const hasFencers = fA != null || fB != null;
  const winner = match.winnerId;

  const [sA, setSA] = useState<string>(winner || match.scoreA > 0 ? String(match.scoreA) : '');
  const [sB, setSB] = useState<string>(winner || match.scoreB > 0 ? String(match.scoreB) : '');
  const parse = (v: string) => v === '' ? '' : String(Math.max(0, Number(v) || 0));
  const maxTouches = match.targetTouches ?? 15;

  if (!hasFencers) {
    return <div className="border border-dashed border-stone-300 rounded text-xs w-full h-full flex items-center justify-center text-stone-400">—</div>;
  }

  const dirty = (sA === '' ? 0 : Number(sA)) !== match.scoreA || (sB === '' ? 0 : Number(sB)) !== match.scoreB;
  const invalid = (sA !== '' && Number(sA) > maxTouches) || (sB !== '' && Number(sB) > maxTouches);

  return (
    <div className={`bg-white border-2 rounded text-xs w-full h-full flex flex-col overflow-hidden ${winner ? 'border-green-500 bg-green-50/30' : dirty ? 'border-amber-400' : 'border-stone-400'}`}>
      <div className={`flex justify-between items-center px-1.5 flex-1 min-h-0 ${winner === fA?.id ? 'font-bold text-green-700' : ''}`}>
        <span className="truncate leading-tight text-[11px]">
          {fA ? `${fA.lastName} ${fA.firstName.charAt(0)}.` : 'BYE'}
        </span>
        <input
          type="number" min={0} max={maxTouches}
          value={sA}
          placeholder="0"
          onChange={e => setSA(parse(e.target.value))}
          className={`w-8 text-center font-mono rounded border px-0.5 py-0 text-[11px] no-spinner ${winner === fA?.id ? 'bg-green-100 border-green-500 font-bold' : 'bg-white border-stone-300'}`}
        />
      </div>
      <div className="h-px bg-stone-200" />
      <div className={`flex justify-between items-center px-1.5 flex-1 min-h-0 ${winner === fB?.id ? 'font-bold text-green-700' : ''}`}>
        <span className="truncate leading-tight text-[11px]">
          {fB ? `${fB.lastName} ${fB.firstName.charAt(0)}.` : 'BYE'}
        </span>
        <input
          type="number" min={0} max={maxTouches}
          value={sB}
          placeholder="0"
          onChange={e => setSB(parse(e.target.value))}
          className={`w-8 text-center font-mono rounded border px-0.5 py-0 text-[11px] no-spinner ${winner === fB?.id ? 'bg-green-100 border-green-500 font-bold' : 'bg-white border-stone-300'}`}
        />
      </div>
      {dirty && (
        <button
          onClick={() => onSave(match.id, sA === '' ? 0 : Number(sA), sB === '' ? 0 : Number(sB))}
          disabled={saving || invalid}
          className={`w-full text-white text-[9px] font-bold py-0 leading-tight disabled:opacity-50 ${invalid ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {invalid ? `Máx ${maxTouches}` : saving ? '...' : 'GUARDAR'}
        </button>
      )}
      {winner && (
        <div className="text-[9px] text-green-700 font-bold text-center leading-tight bg-green-100/50">
          {winner === fA?.id ? `${fA?.lastName}` : `${fB?.lastName}`}
        </div>
      )}
    </div>
  );
}

export default function TableauPage() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();
  const evId = Number(eventId);
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savingMatchId, setSavingMatchId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [defaultTouches, setDefaultTouches] = useState<number>(15);
  const [resultsData, setResultsData] = useState<any>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [groupByClub, setGroupByClub] = useState(false);
  const [groupByCountry, setGroupByCountry] = useState(false);

  const eventQuery = useQuery({
    queryKey: ['events', 'detail', evId],
    queryFn: () => api.get<EventDTO>(`/events/${evId}`),
  });

  const tableauQuery = useQuery({
    queryKey: ['tableau', evId],
    queryFn: () => api.get<TableauDTO>(`/events/${evId}/tableau`),
    retry: false,
  });

  const ev = eventQuery.data;
  const eventLabel = ev
    ? `${weaponLabels[ev.weapon?.name ?? ''] ?? ev.weapon?.name} ${genderLabels[ev.gender]} ${ev.category?.name}`
    : '...';

  const tableauData = tableauQuery.data;

  const finalMatch = tableauData?.bracketMatches?.find(m => m.round === 2);
  const isFinalComplete = !!(finalMatch?.winnerId && finalMatch?.scoreA !== null && finalMatch?.scoreB !== null);

  async function handleShowResults() {
    if (resultsData) { setShowResults(v => !v); return; }
    setResultsLoading(true);
    try {
      const data = await api.get(`/events/${evId}/tableau/results`);
      setResultsData(data);
      setShowResults(true);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.messages.join(', ') : err.message || 'Error al cargar resultados');
    } finally {
      setResultsLoading(false);
    }
  }

  const rounds = useMemo(() => {
    if (!tableauData) return [];
    const result: number[] = [];
    let r = tableauData.size;
    while (r >= 2) { result.push(r); r /= 2; }
    return result;
  }, [tableauData]);

  const [localConfig, setLocalConfig] = useState<Record<number, number> | null>(null);
  const roundConfigs = localConfig ?? (tableauData?.roundConfigs ?? {});
  const hasUnsavedConfig = localConfig !== null;

  const bracketHeight = tableauData ? (tableauData.size / 2) * SLOT : 0;
  const totalHeight = HEADER_H + bracketHeight;
  const totalWidth = rounds.length * COL_WIDTH + (rounds.length - 1) * COL_GAP;

  const getMatchY = useCallback((roundIdx: number, matchIdx: number): number => {
    const numInRound = rounds[roundIdx] / 2;
    const slotH = bracketHeight / numInRound;
    return HEADER_H + slotH * matchIdx + (slotH - MATCH_H) / 2;
  }, [rounds, bracketHeight]);

  const getMatchCenterY = useCallback((roundIdx: number, matchIdx: number): number => {
    return getMatchY(roundIdx, matchIdx) + MATCH_H / 2;
  }, [getMatchY]);

  const getColumnX = useCallback((roundIdx: number): number => {
    return roundIdx * (COL_WIDTH + COL_GAP);
  }, []);

  const connectors = useMemo(() => {
    if (!tableauData) return [];
    const lines: { path: string; key: string }[] = [];
    for (let i = 0; i < rounds.length - 1; i++) {
      const curRound = rounds[i];
      const nextRound = rounds[i + 1];
      const matches = tableauData.bracketMatches?.filter(m => m.round === curRound) || [];
      matches.forEach((match, mIdx) => {
        const targetIdx = Math.floor(mIdx / 2);
        if (targetIdx >= (nextRound / 2)) return;
        const sx = getColumnX(i) + COL_WIDTH;
        const sy = getMatchCenterY(i, mIdx);
        const tx = getColumnX(i + 1);
        const ty = getMatchCenterY(i + 1, targetIdx);
        const mx = sx + COL_GAP / 2;
        lines.push({
          key: `${match.id}-${mIdx}`,
          path: `M ${sx} ${sy} L ${mx} ${sy} L ${mx} ${ty} L ${tx} ${ty}`,
        });
      });
    }
    return lines;
  }, [tableauData, rounds, bracketHeight, getColumnX, getMatchCenterY]);

  function handleTouchChange(round: number, val: number) {
    setLocalConfig(prev => ({ ...(prev ?? roundConfigs), [round]: val }));
  }

  function handleSaveConfig() {
    if (!localConfig) return;
    api.patch(`/events/${evId}/tableau/config`, { roundConfigs: localConfig })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['tableau', evId] });
        setLocalConfig(null);
        setSuccessMsg('Configuración guardada');
        setTimeout(() => setSuccessMsg(null), 2500);
      })
      .catch((err: Error) => {
        setErrorMsg(err instanceof ApiError ? err.messages.join(', ') : err.message || 'Error al guardar');
      });
  }

  async function handleGenerate() {
    setGenerating(true);
    setErrorMsg(null);
    try {
      // Usar la config actual (local o de BD) como overrides al regenerar
      const currentConfig = localConfig ?? tableauData?.roundConfigs ?? {};
      await api.post(`/events/${evId}/tableau/generate`, {
        defaultTouches,
        roundTouchesOverrides: Object.keys(currentConfig).length > 0 ? currentConfig : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['tableau', evId] });
      setLocalConfig(null);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.messages.join(', ') : err.message || 'Error al generar');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveMatch(matchId: number, scoreA: number, scoreB: number) {
    setSavingMatchId(matchId);
    setErrorMsg(null);
    try {
      await api.patch(`/events/${evId}/tableau/matches/${matchId}`, { scoreA, scoreB });
      queryClient.invalidateQueries({ queryKey: ['tableau', evId] });
      setSuccessMsg('Resultado guardado');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.messages.join(', ') : err.message || 'Error al guardar');
    } finally {
      setSavingMatchId(null);
    }
  }

  async function handleAdvance() {
    if (!window.confirm('¿Avanzar ganadores a la siguiente ronda?')) return;
    setAdvancing(true);
    setErrorMsg(null);
    try {
      await api.post(`/events/${evId}/tableau/advance`);
      queryClient.invalidateQueries({ queryKey: ['tableau', evId] });
      setSuccessMsg('Ronda avanzada');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.messages.join(', ') : err.message || 'Error al avanzar');
    } finally {
      setAdvancing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar el cuadro de eliminación directa? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    setErrorMsg(null);
    try {
      await api.delete(`/events/${evId}/tableau`);
      queryClient.invalidateQueries({ queryKey: ['tableau', evId] });
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.messages.join(', ') : err.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  if (!tableauData) {
    return (
      <div className="flex flex-col h-screen bg-stone-100 overflow-hidden">
        <HeaderBar tournamentId={tournamentId} eventId={eventId} eventLabel={eventLabel} />
        {errorMsg && <ErrorBanner msg={errorMsg} onClose={() => setErrorMsg(null)} />}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#fefdf0] text-stone-500 gap-4">
          <p className="text-sm font-medium">No hay cuadro generado.</p>
          <p className="text-xs text-stone-400">Primero completa las poules y genera la clasificación.</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded bg-graphite-900 px-5 py-2 text-sm font-bold text-white hover:bg-graphite-700 disabled:opacity-50"
          >
            {generating ? 'Generando...' : 'Generar Cuadro Ahora'}
          </button>
          <Link to={`/admin/tournaments/${tournamentId}/events/${eventId}/pools`}
            className="text-xs text-blue-600 underline hover:text-blue-800">
            Volver a Poules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-stone-100 overflow-hidden">
      <HeaderBar tournamentId={tournamentId} eventId={eventId} eventLabel={eventLabel} />

      <Toolbar
        defaultTouches={defaultTouches}
        onDefaultTouchesChange={setDefaultTouches}
        onGenerate={handleGenerate}
        generating={generating}
        hasUnsavedConfig={hasUnsavedConfig}
        onSaveConfig={handleSaveConfig}
        onAdvance={handleAdvance}
        advancing={advancing}
        onDelete={handleDelete}
        deleting={deleting}
      />

      {errorMsg && <ErrorBanner msg={errorMsg} onClose={() => setErrorMsg(null)} />}
      {successMsg && <SuccessBanner msg={successMsg} />}

      <div className="flex-1 bg-[#fefdf0] overflow-auto p-8">
        <div className="relative" style={{ width: totalWidth + COL_WIDTH, height: totalHeight }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
            {connectors.map(c => (
              <path key={c.key} d={c.path} fill="none" stroke="#a8a29e" strokeWidth={1.5} />
            ))}
          </svg>

          {rounds.map((roundNum, colIdx) => {
            const matches = tableauData.bracketMatches?.filter(m => m.round === roundNum) || [];
            const colX = getColumnX(colIdx);

            return (
              <div key={roundNum} className="absolute top-0 z-10" style={{ left: colX, width: COL_WIDTH }}>
                <div className="text-center mb-4 pb-2 border-b border-stone-300">
                  <h3 className="font-display font-bold uppercase text-stone-800 text-xs tracking-tight">
                    {roundNameMap[roundNum] || `T${roundNum}`}
                  </h3>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <TouchSelector
                      value={roundConfigs[roundNum] ?? defaultTouches}
                      onChange={v => handleTouchChange(roundNum, v)}
                      className={`${localConfig && localConfig[roundNum] !== undefined
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-stone-300 bg-white text-stone-600'
                      }`}
                    />
                  </div>
                </div>

                {matches.map((match, mIdx) => (
                  <div
                    key={match.id}
                    className="absolute"
                    style={{ top: getMatchY(colIdx, mIdx), width: COL_WIDTH, height: MATCH_H }}
                  >
                    <BracketMatchBox
                      match={match}
                      onSave={handleSaveMatch}
                      saving={savingMatchId === match.id}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {isFinalComplete && (
          <div className="mt-8 flex justify-center print:hidden">
            <button onClick={handleShowResults} disabled={resultsLoading}
              className="rounded bg-yellow-600 hover:bg-yellow-500 px-6 py-3 text-lg font-bold text-white shadow-lg disabled:opacity-50">
              {resultsLoading ? 'Cargando...' : (showResults ? 'Ocultar Resultados Finales' : 'Ver Resultados Finales')}
            </button>
          </div>
        )}

        {showResults && resultsData && (
          <FinalResultsView
            data={resultsData}
            groupByClub={groupByClub}
            groupByCountry={groupByCountry}
            onGroupByClubChange={setGroupByClub}
            onGroupByCountryChange={setGroupByCountry}
          />
        )}
      </div>
    </div>
  );
}

function HeaderBar({ tournamentId, eventId, eventLabel }: { tournamentId?: string; eventId?: string; eventLabel: string }) {
  return (
    <header className="bg-stone-800 text-white px-4 py-2 flex justify-between items-center print:hidden flex-shrink-0 z-20">
      <div className="flex items-center gap-4">
        <Link to={`/admin/tournaments/${tournamentId}/events`} className="text-xs text-stone-300 hover:text-white">
          ← Volver a Eventos
        </Link>
        <h1 className="font-display text-lg font-bold uppercase tracking-wider">{eventLabel}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Link to={`/admin/tournaments/${tournamentId}/events/${eventId}/ranking`}
          className="rounded bg-stone-700 px-3 py-1 text-xs font-semibold hover:bg-stone-600">
          Ver Clasificación
        </Link>
        <Link to={`/admin/tournaments/${tournamentId}/events/${eventId}/pools`}
          className="rounded bg-stone-700 px-3 py-1 text-xs font-semibold hover:bg-stone-600">
          Ir a Poules
        </Link>
      </div>
    </header>
  );
}

function Toolbar({
  defaultTouches, onDefaultTouchesChange, onGenerate, generating,
  hasUnsavedConfig, onSaveConfig, onAdvance, advancing, onDelete, deleting,
}: {
  defaultTouches: number;
  onDefaultTouchesChange: (v: number) => void;
  onGenerate: () => void;
  generating: boolean;
  hasUnsavedConfig: boolean;
  onSaveConfig: () => void;
  onAdvance: () => void;
  advancing: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="bg-stone-200 border-b-2 border-stone-400 px-4 py-2 flex items-center justify-between gap-2 print:hidden flex-shrink-0 z-20 flex-wrap">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-bold text-stone-800">Eliminación Directa</span>
        <span className="text-stone-400">|</span>
        <span className="font-medium text-stone-600">Toques por defecto:</span>
        <TouchSelector
          value={defaultTouches}
          onChange={onDefaultTouchesChange}
          className="border-stone-400 bg-white text-stone-700 text-[13px]"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {hasUnsavedConfig && (
          <button onClick={onSaveConfig}
            className="rounded bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-sm font-bold text-white shadow-sm">
            Guardar Toques
          </button>
        )}
        <button onClick={onAdvance} disabled={advancing}
          className="rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
          {advancing ? 'Avanzando...' : '▶ Avanzar Ronda'}
        </button>
        <button onClick={onGenerate} disabled={generating}
          className="rounded bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
          {generating ? 'Generando...' : '⟳ Regenerar'}
        </button>
        <button onClick={onDelete} disabled={deleting}
          className="rounded bg-red-600 hover:bg-red-500 px-3 py-1.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
          {deleting ? 'Eliminando...' : '✕ Eliminar Cuadro'}
        </button>
      </div>
    </div>
  );
}

function ErrorBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="bg-red-100 border-b border-red-300 px-4 py-2 text-xs text-red-800 flex justify-between items-center flex-shrink-0 z-20">
      <span>{msg}</span>
      <button onClick={onClose} className="font-bold ml-4 hover:text-red-600">✕</button>
    </div>
  );
}

function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div className="bg-green-100 border-b border-green-300 px-4 py-2 text-xs text-green-800 flex-shrink-0 z-20">
      {msg}
    </div>
  );
}

function FinalResultsView({
  data, groupByClub, groupByCountry, onGroupByClubChange, onGroupByCountryChange,
}: {
  data: any; groupByClub: boolean; groupByCountry: boolean;
  onGroupByClubChange: (v: boolean) => void; onGroupByCountryChange: (v: boolean) => void;
}) {
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    if (printMode) {
      setTimeout(() => { window.print(); }, 300);
    }
  }, [printMode]);

  const sorted = [...(data.results ?? [])].sort((a: any, b: any) => a.placement - b.placement);

  let grouped: Record<string, any[]> = { 'Todos': sorted };
  if (groupByClub) {
    grouped = {};
    for (const r of sorted) {
      const key = r.fencer.club?.name ?? 'Sin Club';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }
  } else if (groupByCountry) {
    grouped = {};
    for (const r of sorted) {
      const key = r.fencer.country?.name ?? 'Sin País';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }
  }

  return (
    <div className={printMode ? 'print-only' : 'mt-6 bg-white rounded-lg border border-stone-300 p-6 shadow-inner'}>
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="font-display text-xl font-bold text-stone-800">Resultados Finales</h2>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={groupByClub} onChange={e => { onGroupByClubChange(e.target.checked); if (e.target.checked) onGroupByCountryChange(false); }} />
            <span>Agrupar por Club</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={groupByCountry} onChange={e => { onGroupByCountryChange(e.target.checked); if (e.target.checked) onGroupByClubChange(false); }} />
            <span>Agrupar por País</span>
          </label>
          <button onClick={() => setPrintMode(true)}
            className="rounded bg-stone-700 hover:bg-stone-600 px-3 py-1.5 text-sm font-bold text-white">
            Imprimir
          </button>
        </div>
      </div>

      {data.champion && (
        <div className="text-center mb-6 py-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <span className="text-sm font-bold text-yellow-700 uppercase tracking-wider">Campeón</span>
          <p className="text-2xl font-display font-bold text-yellow-900 mt-1">
            {data.champion.firstName} {data.champion.lastName}
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([groupName, items]) => (
        <div key={groupName} className="mb-6">
          {Object.keys(grouped).length > 1 && (
            <h3 className="text-md font-bold text-stone-700 mb-2 border-b border-stone-200 pb-1">{groupName}</h3>
          )}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-300">
                <th className="text-left px-2 py-1 font-bold">#</th>
                <th className="text-left px-2 py-1 font-bold">Esgrimista</th>
                <th className="text-center px-2 py-1 font-bold" title="Puesto en poules">Sem</th>
                <th className="text-center px-2 py-1 font-bold" title="Victorias">V</th>
                <th className="text-center px-2 py-1 font-bold" title="Partidos">M</th>
                <th className="text-center px-2 py-1 font-bold" title="Touchés a favor">TD</th>
                <th className="text-center px-2 py-1 font-bold" title="Touchés en contra">TR</th>
                <th className="text-center px-2 py-1 font-bold" title="Diferencia">Ind</th>
                <th className="text-center px-2 py-1 font-bold" title="Coeficiente">%</th>
              </tr>
            </thead>
            <tbody>
              {(items as any[]).map((r, i) => {
                const ps = r.poolStats;
                const medalClass = r.placement === 1 ? 'bg-yellow-50 font-bold' : r.placement === 2 ? 'bg-stone-100 font-bold' : r.placement === 3 ? 'bg-amber-50' : '';
                return (
                  <tr key={r.fencer.id} className={`border-b border-stone-100 hover:bg-stone-50 ${medalClass}`}>
                    <td className="px-2 py-1 text-center w-6">{r.placement}</td>
                    <td className="px-2 py-1">
                      <span className="font-medium">{r.fencer.firstName} {r.fencer.lastName}</span>
                      {r.fencer.club && <span className="text-stone-400 ml-1">({r.fencer.club.shortCode || r.fencer.club.name})</span>}
                    </td>
                    <td className="px-2 py-1 text-center">{ps?.seed ?? '-'}</td>
                    <td className="px-2 py-1 text-center">{ps?.victories ?? '-'}</td>
                    <td className="px-2 py-1 text-center">{ps?.matches ?? '-'}</td>
                    <td className="px-2 py-1 text-center">{ps?.touchesScored ?? '-'}</td>
                    <td className="px-2 py-1 text-center">{ps?.touchesReceived ?? '-'}</td>
                    <td className="px-2 py-1 text-center">{ps?.indicator != null ? (ps.indicator > 0 ? `+${ps.indicator}` : ps.indicator) : '-'}</td>
                    <td className="px-2 py-1 text-center">{ps?.ratio != null ? `${(ps.ratio * 100).toFixed(1)}%` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div className="mt-4 text-[10px] text-stone-400 text-center print-hidden">
        PouleFlow — Resultados generados el {new Date().toLocaleDateString('es-AR')}
      </div>
    </div>
  );
}

function sortByPlacement(items: any[]): any[] {
  return [...items].sort((a, b) => a.placement - b.placement);
}

function TouchSelector({ value, onChange, className }: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const isPreset = TOUCH_OPTIONS.includes(value);
  const [showInput, setShowInput] = useState(!isPreset);
  const [inputVal, setInputVal] = useState<string>(isPreset ? '' : String(value));

  useEffect(() => {
    if (!TOUCH_OPTIONS.includes(value)) {
      setShowInput(true);
      setInputVal(String(value));
    }
  }, [value]);

  function handleSelect(sel: string) {
    if (sel === '__custom__') {
      setShowInput(true);
      setInputVal('');
    } else {
      setShowInput(false);
      onChange(Number(sel));
    }
  }

  function handleInput(v: string) {
    setInputVal(v);
    const n = Number(v);
    if (v !== '' && n >= 1 && n <= 99) {
      onChange(n);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={showInput ? '__custom__' : value}
        onChange={e => handleSelect(e.target.value)}
        className={`text-[11px] rounded border px-1.5 py-0.5 font-medium cursor-pointer ${className ?? 'border-stone-300 bg-white text-stone-600'}`}
      >
        {TOUCH_OPTIONS.map(t => <option key={t} value={t}>{t} toques</option>)}
        <option value="__custom__">Personalizado</option>
      </select>
      {showInput && (
        <input
          type="number" min={1} max={99}
          value={inputVal}
          placeholder="Nº"
          onChange={e => handleInput(e.target.value)}
          className="w-12 text-center rounded border border-stone-300 bg-white px-1 py-0.5 text-[11px] font-medium text-stone-700 no-spinner"
        />
      )}
    </div>
  );
}