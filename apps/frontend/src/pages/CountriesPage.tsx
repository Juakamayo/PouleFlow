import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CountryDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

export default function CountriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [iocCode, setIocCode] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: () => api.get<CountryDTO[]>('/countries'),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; iocCode: string }) =>
      api.post<CountryDTO>('/countries', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      setName('');
      setIocCode('');
      setErrors([]);
    },
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al crear el país']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/countries/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['countries'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ name: name.trim(), iocCode: iocCode.trim().toUpperCase() });
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          Países
        </h2>
        <div className="mt-2 flex gap-1">
          <div className="h-0.5 w-10 bg-piste" />
          <div className="h-0.5 w-3 bg-stone-300" />
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex items-end gap-3 rounded border border-stone-300 bg-white p-4"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-graphite-700">
            Nombre del país
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Chile"
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-graphite-700">
            Código IOC
          </label>
          <input
            value={iocCode}
            onChange={(e) => setIocCode(e.target.value)}
            required
            maxLength={3}
            placeholder="CHI"
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-mono uppercase focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
          />
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-graphite-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-graphite-700 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Guardando...' : 'Agregar país'}
        </button>
      </form>

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
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {countriesQuery.isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-graphite-700/60">
                  Cargando...
                </td>
              </tr>
            )}
            {countriesQuery.data?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-graphite-700/60">
                  Aún no hay países cargados.
                </td>
              </tr>
            )}
            {countriesQuery.data?.map((country) => (
              <tr key={country.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">{country.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{country.iocCode}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(country.id)}
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
