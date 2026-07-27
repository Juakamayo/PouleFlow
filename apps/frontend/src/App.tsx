import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function AdminPanel() {
  return <div className="p-6">Panel de administración — PouleFlow</div>;
}

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
        <Route path="/admin/*" element={<AdminPanel />} />
        <Route path="/mesa/:pistaId" element={<MesaDeControl />} />
        <Route path="/display/:pistaId" element={<PantallaEstadio />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
