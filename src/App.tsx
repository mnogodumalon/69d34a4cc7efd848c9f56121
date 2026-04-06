import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import PersonenstammPage from '@/pages/PersonenstammPage';
import UmlaufmappePage from '@/pages/UmlaufmappePage';
import UmlaufRueckmeldungPage from '@/pages/UmlaufRueckmeldungPage';
import UmlaufmappePersonenPage from '@/pages/UmlaufmappePersonenPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
              <Route path="personenstamm" element={<PersonenstammPage />} />
              <Route path="umlaufmappe" element={<UmlaufmappePage />} />
              <Route path="umlauf-rueckmeldung" element={<UmlaufRueckmeldungPage />} />
              <Route path="umlaufmappe-personen" element={<UmlaufmappePersonenPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
