import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClubDTO, CountryDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

export default function ClubsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState<number | ''>('');
  const [errors, setErrors] = useState<string[]>([]);

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: () => api.get<ClubDTO[]>('/clubs'),
  });

  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: () => api.get<CountryDTO[]>('/countries'),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; countryId: number }) => api.post<ClubDTO>('/clubs', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setName('');
      setCountryId('');
      setErrors([]);
    },
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al crear el club']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/clubs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clubs'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (countryId === '') return;
    createMutation.mutate({ name: name.trim(), countryId });
  }

  const hasCountries = (countriesQuery.data?.length ?? 0) > 0;

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          Clubes
        </h2>
        <div className="mt-2 flex gap-1">
          <div className="h-0.5 w-10 bg-piste" />
          <div className="h-0.5 w-3 bg-stone-300" />
        </div>
      </header>

      {!countriesQuery.isLoading && !hasCountries ? (
        <div className="mb-8 rounded border border-stone-300 bg-white px-4 py-3 text-sm text-graphite-700">
          Primero necesitas crear al menos un país en la sección{' '}
          <span className="font-medium">Países</span> antes de poder registrar un club.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mb-8 flex items-end gap-3 rounded border border-stone-300 bg-white p-4"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-graphite-700">
              Nombre del club
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Club Esgrima Santiago"
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
            />
          </div>
          <div className="w-48">
            <label className="mb-1 block text-xs font-medium text-graphite-700">
              País
            </label>
            <select
              value={countryId}
              onChange={(e) => setCountryId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
            >
              <option value="">Selecciona...</option>
              {countriesQuery.data?.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded bg-graphite-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-graphite-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Guardando...' : 'Agregar club'}
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

      <div className="overflow-hidden rounded border border-stone-300 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-300 bg-stone-100 text-left text-xs uppercase tracking-wide text-graphite-700">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">País</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {clubsQuery.isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-graphite-700/60">
                  Cargando...
                </td>
              </tr>
            )}
            {clubsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-graphite-700/60">
                  Aún no hay clubes cargados.
                </td>
              </tr>
            )}
            {clubsQuery.data?.map((club) => (
              <tr key={club.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">{club.name}</td>
                <td className="px-4 py-3 text-graphite-700/80">{club.country?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(club.id)}
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
