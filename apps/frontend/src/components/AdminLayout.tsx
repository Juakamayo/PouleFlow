import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/admin/countries', label: 'Países' },
  { to: '/admin/clubs', label: 'Clubes' },
  { to: '/admin/fencers', label: 'Tiradores' },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-stone-100 font-body text-graphite-900">
      <aside className="flex w-56 shrink-0 flex-col bg-graphite-900 text-white">
        <div className="border-b border-graphite-700 px-5 py-6">
          <h1 className="font-display text-xl font-semibold uppercase tracking-wide">
            PouleFlow
          </h1>
          <p className="mt-1 text-xs text-white/50">Panel de administración</p>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-piste text-white'
                    : 'text-white/70 hover:bg-graphite-700 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
