import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CountryDTO, RefereeDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

export default function RefereesPage() {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryId, setCountryId] = useState<number | ''>('');
  const [errors, setErrors] = useState<string[]>([]);

  const refereesQuery = useQuery({
    queryKey: ['referees'],
    queryFn: () => api.get<RefereeDTO[]>('/referees'),
  });

  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: () => api.get<CountryDTO[]>('/countries'),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { firstName: string; lastName: string; countryId: number }) =>
      api.post<RefereeDTO>('/referees', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referees'] });
      setFirstName('');
      setLastName('');
      setCountryId('');
      setErrors([]);
    },
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al crear el árbitro']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/referees/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['referees'] }),
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al eliminar el árbitro']);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (countryId === '') return;
    createMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim(), countryId });
  }

  const hasCountries = (countriesQuery.data?.length ?? 0) > 0;

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          Árbitros
        </h2>
        <div className="mt-2 flex gap-1">
          <div className="h-0.5 w-10 bg-piste" />
          <div className="h-0.5 w-3 bg-stone-300" />
        </div>
      </header>

      {!countriesQuery.isLoading && !hasCountries ? (
        <div className="mb-8 rounded border border-stone-300 bg-white px-4 py-3 text-sm text-graphite-700">
          Primero necesitas crear al menos un país antes de poder registrar un árbitro.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mb-8 flex items-end gap-3 rounded border border-stone-300 bg-white p-4"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-graphite-700">
              Nombre
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="María"
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-graphite-700">
              Apellido
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              placeholder="González"
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
              {countriesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded bg-graphite-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-graphite-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Guardando...' : 'Agregar árbitro'}
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
              <th className="px-4 py-3 font-medium">Árbitro</th>
              <th className="px-4 py-3 font-medium">País</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {refereesQuery.isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-graphite-700/60">
                  Cargando...
                </td>
              </tr>
            )}
            {refereesQuery.data?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-graphite-700/60">
                  Aún no hay árbitros cargados.
                </td>
              </tr>
            )}
            {refereesQuery.data?.map((referee) => (
              <tr key={referee.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">
                  {referee.lastName}, {referee.firstName}
                </td>
                <td className="px-4 py-3 text-graphite-700/80">{referee.country?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(referee.id)}
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
