import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import CountriesPage from './pages/CountriesPage';
import ClubsPage from './pages/ClubsPage';
import FencersPage from './pages/FencersPage';
import RefereesPage from './pages/RefereesPage';
import TournamentsPage from './pages/TournamentsPage';
import EventsPage from './pages/EventsPage';
import RegistrationsPage from './pages/RegistrationsPage';
import PoolsPage from './pages/PoolsPage';
import RankingPage from './pages/RankingPage'; // <-- Importación agregada
import TableauPage from './pages/TableauPage';

function MesaDeControl() {
  return <div className="p-6">Mesa de control — PouleFlow</div>;
}

function PantallaEstadio() {
  return <div className="p-6">Pantalla de estadio — PouleFlow</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
        <Route
  path="tournaments/:tournamentId/events/:eventId/tableau"
  element={<TableauPage />}
/>
          <Route index element={<Navigate to="/admin/countries" replace />} />
          <Route path="countries" element={<CountriesPage />} />
          <Route path="clubs" element={<ClubsPage />} />
          <Route path="fencers" element={<FencersPage />} />
          <Route path="referees" element={<RefereesPage />} />
          <Route path="tournaments" element={<TournamentsPage />} />
          <Route path="tournaments/:tournamentId/events" element={<EventsPage />} />
          <Route
            path="tournaments/:tournamentId/events/:eventId/registrations"
            element={<RegistrationsPage />}
          />
          <Route
            path="tournaments/:tournamentId/events/:eventId/pools"
            element={<PoolsPage />}
          />
          {/* <-- Nueva ruta agregada --> */}
          <Route
            path="tournaments/:tournamentId/events/:eventId/ranking"
            element={<RankingPage />}
          />
        </Route>
        <Route path="/mesa/:pistaId" element={<MesaDeControl />} />
        <Route path="/display/:pistaId" element={<PantallaEstadio />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}