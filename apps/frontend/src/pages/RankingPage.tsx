import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

const weaponLabels: Record<string, string> = { EPEE: 'Espada', FOIL: 'Florete', SABER: 'Sable' };
const genderLabels: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Femenino', MIXED: 'Mixto' };

export default function RankingPage() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();
  const evId = Number(eventId);

  const eventQuery = useQuery({
    queryKey: ['events', 'detail', evId],
    queryFn: () => api.get<any>(`/events/${evId}`),
  });

  const rankingQuery = useQuery({
    queryKey: ['ranking', evId],
    queryFn: () => api.get<any[]>(`/events/${evId}/ranking`),
  });

  const ev = eventQuery.data;
  const eventLabel = ev ? `${weaponLabels[ev.weapon?.name ?? ''] ?? ev.weapon?.name} ${genderLabels[ev.gender]} ${ev.category?.name}` : '...';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="mb-6 print:hidden">
        <Link to={`/admin/tournaments/${tournamentId}/events`} className="text-xs font-medium text-graphite-700 hover:text-piste">
          ← Volver a Eventos
        </Link>
        <div className="flex justify-between items-end mt-2">
          <div>
            <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
              Clasificación General
            </h2>
            <h3 className="text-sm font-medium text-graphite-600 uppercase mt-1">
              {eventLabel}
            </h3>
            <div className="mt-2 flex gap-1">
              <div className="h-0.5 w-10 bg-piste" />
              <div className="h-0.5 w-3 bg-stone-300" />
            </div>
          </div>
          <button 
            onClick={handlePrint} 
            className="rounded bg-graphite-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-graphite-700 shadow-sm"
          >
            🖨️ Imprimir Clasificación
          </button>
        </div>
      </header>

      {/* Cabecera exclusiva para cuando se imprime en papel */}
      <div className="hidden print:block mb-6">
        <h2 className="font-display text-2xl font-bold uppercase text-center border-b-2 border-black pb-2">
          Clasificación Final de Poules
        </h2>
        <h3 className="text-center font-medium mt-2 uppercase text-lg">{eventLabel}</h3>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm print:border-none print:shadow-none">
        <div className="p-0 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-stone-100 print:bg-transparent border-b border-stone-300 print:border-black">
                <th className="w-12 px-4 py-3 text-center font-bold text-graphite-700 print:text-black">Pl</th>
                <th className="px-4 py-3 text-left font-bold text-graphite-700 print:text-black">Nombre</th>
                <th className="w-24 px-4 py-3 text-center font-bold text-graphite-700 print:text-black">Nación</th>
                <th className="w-20 px-4 py-3 text-center font-bold text-graphite-700 print:text-black">V/M</th>
                <th className="w-20 px-4 py-3 text-center font-bold text-graphite-700 print:text-black">Ind</th>
                <th className="w-20 px-4 py-3 text-center font-bold text-graphite-700 print:text-black">TD</th>
              </tr>
            </thead>
            <tbody>
              {rankingQuery.data?.map((row, index) => {
                const fencer = row.fencer;
                const ratioFormatted = row.ratio.toFixed(2);
                
                return (
                  <tr key={index} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 print:border-stone-300">
                    <td className="px-4 py-2 text-center font-bold text-graphite-900 bg-stone-50/50 print:bg-transparent">{row.seed}</td>
                    <td className="px-4 py-2">
                      <div className="font-bold uppercase text-graphite-900">{fencer?.lastName}</div>
                      <div className="text-xs text-graphite-600">{fencer?.firstName}</div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="font-bold text-graphite-900">{fencer?.country?.iocCode}</div>
                      <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{fencer?.club?.shortCode || ''}</div>
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-medium text-graphite-800">{ratioFormatted}</td>
                    <td className="px-4 py-2 text-center font-mono font-bold text-graphite-800">
                      {row.Ind > 0 ? `+${row.Ind}` : row.Ind}
                    </td>
                    <td className="px-4 py-2 text-center font-mono text-graphite-800">{row.TD}</td>
                  </tr>
                );
              })}
              
              {(!rankingQuery.data || rankingQuery.data.length === 0) && !rankingQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    No hay resultados para mostrar. Asegúrate de generar y guardar los resultados de las poules primero.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}