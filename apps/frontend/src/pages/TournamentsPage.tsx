import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { TournamentDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

interface FormState {
  name: string;
  startDate: string;
  endDate: string;
  location: string;
}

const emptyForm: FormState = { name: '', startDate: '', endDate: '', location: '' };

export default function TournamentsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);

  const tournamentsQuery = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => api.get<TournamentDTO[]>('/tournaments'),
  });

  const createMutation = useMutation({
    mutationFn: (dto: FormState) => api.post<TournamentDTO>('/tournaments', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      setForm(emptyForm);
      setErrors([]);
    },
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al crear el torneo']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tournaments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al eliminar el torneo']);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          Torneos
        </h2>
        <div className="mt-2 flex gap-1">
          <div className="h-0.5 w-10 bg-piste" />
          <div className="h-0.5 w-3 bg-stone-300" />
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded border border-stone-300 bg-white p-4"
      >
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-graphite-700">
            Nombre del torneo
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Copa Nacional 2026"
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
          />
        </div>
        <div className="mb-3 grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-graphite-700">
              Fecha inicio
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-graphite-700">
              Fecha término
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-graphite-700">
              Sede <span className="text-graphite-700/50">(opcional)</span>
            </label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Santiago, Chile"
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-graphite-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-graphite-700 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Guardando...' : 'Crear torneo'}
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
              <th className="px-4 py-3 font-medium">Torneo</th>
              <th className="px-4 py-3 font-medium">Fechas</th>
              <th className="px-4 py-3 font-medium">Sede</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tournamentsQuery.isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-graphite-700/60">
                  Cargando...
                </td>
              </tr>
            )}
            {tournamentsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-graphite-700/60">
                  Aún no hay torneos creados.
                </td>
              </tr>
            )}
            {tournamentsQuery.data?.map((t) => (
              <tr key={t.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-graphite-700/80">
                  {formatDate(t.startDate)} — {formatDate(t.endDate)}
                </td>
                <td className="px-4 py-3 text-graphite-700/80">{t.location ?? '—'}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    to={`/admin/tournaments/${t.id}/events`}
                    className="mr-3 text-xs font-medium text-graphite-700 hover:text-graphite-900"
                  >
                    Ver eventos
                  </Link>
                  <button
                    onClick={() => deleteMutation.mutate(t.id)}
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
