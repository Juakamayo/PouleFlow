import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import CountriesPage from './pages/CountriesPage';
import ClubsPage from './pages/ClubsPage';
import FencersPage from './pages/FencersPage';

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
          <Route index element={<Navigate to="/admin/countries" replace />} />
          <Route path="countries" element={<CountriesPage />} />
          <Route path="clubs" element={<ClubsPage />} />
          <Route path="fencers" element={<FencersPage />} />
        </Route>
        <Route path="/mesa/:pistaId" element={<MesaDeControl />} />
        <Route path="/display/:pistaId" element={<PantallaEstadio />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
