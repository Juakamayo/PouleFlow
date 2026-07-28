import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClubDTO, CountryDTO, FencerDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

interface FencerFormState {
  firstName: string;
  lastName: string;
  countryId: number | '';
  clubId: number | '';
  nationalRank: string;
  internationalRank: string;
  points: string;
}

const emptyForm: FencerFormState = {
  firstName: '',
  lastName: '',
  countryId: '',
  clubId: '',
  nationalRank: '',
  internationalRank: '',
  points: '',
};

export default function FencersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FencerFormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const fencersQuery = useQuery({
    queryKey: ['fencers', search],
    queryFn: () =>
      api.get<FencerDTO[]>(`/fencers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });

  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: () => api.get<CountryDTO[]>('/countries'),
  });

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: () => api.get<ClubDTO[]>('/clubs'),
  });

  const createMutation = useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post<FencerDTO>('/fencers', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fencers'] });
      setForm(emptyForm);
      setErrors([]);
    },
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al crear el tirador']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/fencers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fencers'] }),
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al eliminar el tirador']);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.countryId === '') return;

    createMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      countryId: form.countryId,
      ...(form.clubId !== '' ? { clubId: form.clubId } : {}),
      ...(form.nationalRank !== '' ? { nationalRank: Number(form.nationalRank) } : {}),
      ...(form.internationalRank !== '' ? { internationalRank: Number(form.internationalRank) } : {}),
      ...(form.points !== '' ? { points: Number(form.points) } : {}),
    });
  }

  const hasCountries = (countriesQuery.data?.length ?? 0) > 0;

  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          Tiradores
        </h2>
        <div className="mt-2 flex gap-1">
          <div className="h-0.5 w-10 bg-piste" />
          <div className="h-0.5 w-3 bg-stone-300" />
        </div>
      </header>

      {!countriesQuery.isLoading && !hasCountries ? (
        <div className="mb-8 rounded border border-stone-300 bg-white px-4 py-3 text-sm text-graphite-700">
          Primero necesitas crear al menos un país antes de poder registrar un tirador.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded border border-stone-300 bg-white p-4"
        >
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-graphite-700">
                Nombre
              </label>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                placeholder="Juan"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-graphite-700">
                Apellido
              </label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                placeholder="Pérez"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
              />
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-graphite-700">
                País
              </label>
              <select
                value={form.countryId}
                onChange={(e) =>
                  setForm({ ...form, countryId: e.target.value ? Number(e.target.value) : '' })
                }
                required
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
              >
                <option value="">Selecciona...</option>
                {countriesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-graphite-700">
                Club <span className="text-graphite-700/50">(opcional)</span>
              </label>
              <select
                value={form.clubId}
                onChange={(e) =>
                  setForm({ ...form, clubId: e.target.value ? Number(e.target.value) : '' })
                }
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
              >
                <option value="">Sin club</option>
                {clubsQuery.data?.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name} ({club.shortCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-graphite-700">
                Ranking nacional
              </label>
              <input
                type="number"
                min={1}
                value={form.nationalRank}
                onChange={(e) => setForm({ ...form, nationalRank: e.target.value })}
                placeholder="—"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-mono focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-graphite-700">
                Ranking internacional
              </label>
              <input
                type="number"
                min={1}
                value={form.internationalRank}
                onChange={(e) => setForm({ ...form, internationalRank: e.target.value })}
                placeholder="—"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-mono focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-graphite-700">
                Puntos
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                placeholder="0"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-mono focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded bg-graphite-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-graphite-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Guardando...' : 'Agregar tirador'}
          </button>
        </form>
      )}

      {errors.length > 0 && (
        <div className="mb-6 rounded border border-piste/30 bg-piste/5 px-4 py-3 text-sm text-piste-dark">
          {errors.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}

      <div className="mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o apellido..."
          className="w-full max-w-sm rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
        />
      </div>

      <div className="overflow-hidden rounded border border-stone-300 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-300 bg-stone-100 text-left text-xs uppercase tracking-wide text-graphite-700">
              <th className="px-4 py-3 font-medium">Tirador</th>
              <th className="px-4 py-3 font-medium">Club</th>
              <th className="px-4 py-3 font-medium">País</th>
              <th className="px-4 py-3 font-medium text-right">Rank. Nac.</th>
              <th className="px-4 py-3 font-medium text-right">Rank. Int.</th>
              <th className="px-4 py-3 font-medium text-right">Puntos</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {fencersQuery.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-graphite-700/60">
                  Cargando...
                </td>
              </tr>
            )}
            {fencersQuery.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-graphite-700/60">
                  {search ? 'Sin resultados para esa búsqueda.' : 'Aún no hay tiradores cargados.'}
                </td>
              </tr>
            )}
            {fencersQuery.data?.map((fencer) => (
              <tr key={fencer.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">
                  {fencer.lastName}, {fencer.firstName}
                </td>
                <td className="px-4 py-3 text-graphite-700/80">
                  {fencer.club ? `${fencer.club.name} (${fencer.club.shortCode})` : '—'}
                </td>
                <td className="px-4 py-3 text-graphite-700/80">{fencer.country?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {fencer.nationalRank ?? '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {fencer.internationalRank ?? '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{fencer.points}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(fencer.id)}
                    className="text-xs font-medium text-piste hover:text-piste-dark"
                  >
                    Eliminar
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
