import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { CategoryDTO, EventDTO, Gender, TournamentDTO, WeaponDTO } from '@pouleflow/shared-types';
import { api, ApiError } from '../lib/api';

const genderLabels: Record<Gender, string> = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  MIXED: 'Mixto',
};

const weaponLabels: Record<string, string> = {
  EPEE: 'Espada',
  FOIL: 'Florete',
  SABER: 'Sable',
};

interface FormState {
  weaponId: number | '';
  categoryId: number | '';
  gender: Gender | '';
}

const emptyForm: FormState = { weaponId: '', categoryId: '', gender: '' };

export default function EventsPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const tId = Number(tournamentId);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);

  const tournamentQuery = useQuery({
    queryKey: ['tournaments', tId],
    queryFn: () => api.get<TournamentDTO>(`/tournaments/${tId}`),
  });

  const eventsQuery = useQuery({
    queryKey: ['events', tId],
    queryFn: () => api.get<EventDTO[]>(`/events?tournamentId=${tId}`),
  });

  const weaponsQuery = useQuery({
    queryKey: ['weapons'],
    queryFn: () => api.get<WeaponDTO[]>('/weapons'),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryDTO[]>('/categories'),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { tournamentId: number; weaponId: number; categoryId: number; gender: Gender }) =>
      api.post<EventDTO>('/events', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', tId] });
      setForm(emptyForm);
      setErrors([]);
    },
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al crear el evento']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/events/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', tId] }),
    onError: (error) => {
      setErrors(error instanceof ApiError ? error.messages : ['Error al eliminar el evento']);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.weaponId === '' || form.categoryId === '' || form.gender === '') return;
    createMutation.mutate({
      tournamentId: tId,
      weaponId: form.weaponId,
      categoryId: form.categoryId,
      gender: form.gender,
    });
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <Link to="/admin/tournaments" className="text-xs font-medium text-graphite-700 hover:text-piste">
          ← Volver a Torneos
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold uppercase tracking-wide">
          Eventos — {tournamentQuery.data?.name ?? '...'}
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
          <label className="mb-1 block text-xs font-medium text-graphite-700">Arma</label>
          <select
            value={form.weaponId}
            onChange={(e) => setForm({ ...form, weaponId: e.target.value ? Number(e.target.value) : '' })}
            required
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
          >
            <option value="">Selecciona...</option>
            {weaponsQuery.data?.map((w) => (
              <option key={w.id} value={w.id}>
                {weaponLabels[w.name] ?? w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-graphite-700">Categoría</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : '' })}
            required
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
          >
            <option value="">Selecciona...</option>
            {categoriesQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-graphite-700">Género</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
            required
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:border-piste focus:outline-none focus:ring-1 focus:ring-piste"
          >
            <option value="">Selecciona...</option>
            <option value="MALE">Masculino</option>
            <option value="FEMALE">Femenino</option>
            <option value="MIXED">Mixto</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-graphite-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-graphite-700 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Guardando...' : 'Crear evento'}
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
              <th className="px-4 py-3 font-medium">Evento</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {eventsQuery.isLoading && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-graphite-700/60">
                  Cargando...
                </td>
              </tr>
            )}
            {eventsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-graphite-700/60">
                  Aún no hay eventos en este torneo.
                </td>
              </tr>
            )}
            {eventsQuery.data?.map((ev) => (
              <tr key={ev.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 font-medium">
                  {weaponLabels[ev.weapon?.name ?? ''] ?? ev.weapon?.name} {genderLabels[ev.gender]}{' '}
                  {ev.category?.name}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    to={`/admin/tournaments/${tId}/events/${ev.id}/registrations`}
                    className="mr-3 text-xs font-medium text-graphite-700 hover:text-graphite-900"
                  >
                    Inscripciones
                  </Link>
                  <button
                    onClick={() => deleteMutation.mutate(ev.id)}
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
