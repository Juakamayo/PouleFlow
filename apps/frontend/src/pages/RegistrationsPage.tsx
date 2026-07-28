import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { EventDTO, FencerDTO, RegistrationDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

const weaponLabels: Record<string, string> = { EPEE: 'Espada', FOIL: 'Florete', SABER: 'Sable' };
const genderLabels: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Femenino', MIXED: 'Mixto' };

export default function RegistrationsPage() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();
  const evId = Number(eventId);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const eventQuery = useQuery({
    queryKey: ['events', 'detail', evId],
    queryFn: () => api.get<EventDTO>(`/events/${evId}`),
  });

  const registrationsQuery = useQuery({
    queryKey: ['registrations', evId],
    queryFn: () => api.get<RegistrationDTO[]>(`/registrations?eventId=${evId}`),
  });

  const searchQuery = useQuery({
    queryKey: ['fencers', 'search', search],
    queryFn: () => api.get<FencerDTO[]>(`/fencers?search=${encodeURIComponent(search)}`),
    enabled: search.length >= 2,
  });

  const registerMutation = useMutation({
    mutationFn: (fencerId: number) =>
      api.post<RegistrationDTO>('/registrations', { eventId: evId, fencerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations', evId] });
      setErrors([]);
    },
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al inscribir al tirador']);
    },
  });

  const updateSeedMutation = useMutation({
    mutationFn: ({ id, seedRank }: { id: number; seedRank: number }) =>
      api.patch<RegistrationDTO>(`/registrations/${id}`, { seedRank }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations', evId] }),
  });

  const unregisterMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/registrations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations', evId] }),
  });

  const registeredFencerIds = new Set(registrationsQuery.data?.map((r) => r.fencerId));
  const searchResults = (searchQuery.data ?? []).filter((f) => !registeredFencerIds.has(f.id));

  const ev = eventQuery.data;
  const eventLabel = ev
    ? `${weaponLabels[ev.weapon?.name ?? ''] ?? ev.weapon?.name} ${genderLabels[ev.gender]} ${ev.category?.name}`
    : '...';

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <Link
          to={`/admin/tournaments/${tournamentId}/events`}
          className="text-xs font-medium text-graphite-700 hover:text-piste"
        >
          ← Volver a Eventos
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold uppercase tracking-wide">
          Inscripciones — {eventLabel}
        </h2>
        <div className="mt-2 flex gap-1">
          <div className="h-0.5 w-10 bg-piste" />
          <div className="h-0.5 w-3 bg-stone-300" />
        </div>
      </header>

      <div className="mb-8 rounded border border-stone-300 bg-white p-4">
        <label className="mb-1 block text-xs font-medium text-graphite-700">
          Buscar tirador por nombre o apellido
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Escribe al menos 2 letras..."
          className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
        />

        {search.length >= 2 && (
          <div className="mt-3 divide-y divide-stone-100 rounded border border-stone-100">
            {searchQuery.isLoading && (
              <p className="px-3 py-2 text-sm text-graphite-700/60">Buscando...</p>
            )}
            {!searchQuery.isLoading && searchResults.length === 0 && (
              <p className="px-3 py-2 text-sm text-graphite-700/60">
                Sin resultados (o ya está inscrito en este evento).
              </p>
            )}
            {searchResults.map((fencer) => (
              <div key={fencer.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {fencer.lastName}, {fencer.firstName}{' '}
                  <span className="text-graphite-700/60">
                    {fencer.club ? `— ${fencer.club.name}` : ''}
                  </span>
                </span>
                <button
                  onClick={() => registerMutation.mutate(fencer.id)}
                  disabled={registerMutation.isPending}
                  className="rounded bg-graphite-900 px-3 py-1 text-xs font-medium text-white hover:bg-graphite-700 disabled:opacity-50"
                >
                  Inscribir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mb-6 rounded border border-piste/30 bg-piste/5 px-4 py-3 text-sm text-piste-dark">
          {errors.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded border border-stone-300 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-300 bg-stone-100 text-left text-xs uppercase tracking-wide text-graphite-700">
              <th className="px-4 py-3 font-medium">Tirador</th>
              <th className="px-4 py-3 font-medium">Club</th>
              <th className="px-4 py-3 font-medium w-32">Seed inicial</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {registrationsQuery.isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-graphite-700/60">
                  Cargando...
                </td>
              </tr>
            )}
            {registrationsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-graphite-700/60">
                  Aún no hay tiradores inscritos en este evento.
                </td>
              </tr>
            )}
            {registrationsQuery.data?.map((reg) => (
              <tr key={reg.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">
                  {reg.fencer?.lastName}, {reg.fencer?.firstName}
                </td>
                <td className="px-4 py-3 text-graphite-700/80">{reg.fencer?.club?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={1}
                    defaultValue={reg.seedRank ?? ''}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value && value !== reg.seedRank) {
                        updateSeedMutation.mutate({ id: reg.id, seedRank: value });
                      }
                    }}
                    placeholder="—"
                    className="w-20 rounded border border-stone-300 px-2 py-1 text-sm font-mono focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => unregisterMutation.mutate(reg.id)}
                    className="text-xs font-medium text-piste hover:text-piste-dark"
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
