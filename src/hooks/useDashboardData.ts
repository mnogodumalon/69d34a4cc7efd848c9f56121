import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Personenstamm, Umlaufmappe, UmlaufRueckmeldung, UmlaufmappePersonen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [personenstamm, setPersonenstamm] = useState<Personenstamm[]>([]);
  const [umlaufmappe, setUmlaufmappe] = useState<Umlaufmappe[]>([]);
  const [umlaufRueckmeldung, setUmlaufRueckmeldung] = useState<UmlaufRueckmeldung[]>([]);
  const [umlaufmappePersonen, setUmlaufmappePersonen] = useState<UmlaufmappePersonen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [personenstammData, umlaufmappeData, umlaufRueckmeldungData, umlaufmappePersonenData] = await Promise.all([
        LivingAppsService.getPersonenstamm(),
        LivingAppsService.getUmlaufmappe(),
        LivingAppsService.getUmlaufRueckmeldung(),
        LivingAppsService.getUmlaufmappePersonen(),
      ]);
      setPersonenstamm(personenstammData);
      setUmlaufmappe(umlaufmappeData);
      setUmlaufRueckmeldung(umlaufRueckmeldungData);
      setUmlaufmappePersonen(umlaufmappePersonenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [personenstammData, umlaufmappeData, umlaufRueckmeldungData, umlaufmappePersonenData] = await Promise.all([
          LivingAppsService.getPersonenstamm(),
          LivingAppsService.getUmlaufmappe(),
          LivingAppsService.getUmlaufRueckmeldung(),
          LivingAppsService.getUmlaufmappePersonen(),
        ]);
        setPersonenstamm(personenstammData);
        setUmlaufmappe(umlaufmappeData);
        setUmlaufRueckmeldung(umlaufRueckmeldungData);
        setUmlaufmappePersonen(umlaufmappePersonenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const personenstammMap = useMemo(() => {
    const m = new Map<string, Personenstamm>();
    personenstamm.forEach(r => m.set(r.record_id, r));
    return m;
  }, [personenstamm]);

  const umlaufmappeMap = useMemo(() => {
    const m = new Map<string, Umlaufmappe>();
    umlaufmappe.forEach(r => m.set(r.record_id, r));
    return m;
  }, [umlaufmappe]);

  return { personenstamm, setPersonenstamm, umlaufmappe, setUmlaufmappe, umlaufRueckmeldung, setUmlaufRueckmeldung, umlaufmappePersonen, setUmlaufmappePersonen, loading, error, fetchAll, personenstammMap, umlaufmappeMap };
}