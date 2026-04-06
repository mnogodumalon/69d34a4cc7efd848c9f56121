import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import UmlaufmappePage from '@/pages/UmlaufmappePage';
import UmlaufmappePersonenPage from '@/pages/UmlaufmappePersonenPage';
import PersonenstammPage from '@/pages/PersonenstammPage';
import UmlaufRueckmeldungPage from '@/pages/UmlaufRueckmeldungPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="umlaufmappe" element={<UmlaufmappePage />} />
              <Route path="umlaufmappe-personen" element={<UmlaufmappePersonenPage />} />
              <Route path="personenstamm" element={<PersonenstammPage />} />
              <Route path="umlauf-rueckmeldung" element={<UmlaufRueckmeldungPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
