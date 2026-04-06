import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Umlaufmappe, UmlaufmappePersonen, Personenstamm, UmlaufRueckmeldung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [umlaufmappe, setUmlaufmappe] = useState<Umlaufmappe[]>([]);
  const [umlaufmappePersonen, setUmlaufmappePersonen] = useState<UmlaufmappePersonen[]>([]);
  const [personenstamm, setPersonenstamm] = useState<Personenstamm[]>([]);
  const [umlaufRueckmeldung, setUmlaufRueckmeldung] = useState<UmlaufRueckmeldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [umlaufmappeData, umlaufmappePersonenData, personenstammData, umlaufRueckmeldungData] = await Promise.all([
        LivingAppsService.getUmlaufmappe(),
        LivingAppsService.getUmlaufmappePersonen(),
        LivingAppsService.getPersonenstamm(),
        LivingAppsService.getUmlaufRueckmeldung(),
      ]);
      setUmlaufmappe(umlaufmappeData);
      setUmlaufmappePersonen(umlaufmappePersonenData);
      setPersonenstamm(personenstammData);
      setUmlaufRueckmeldung(umlaufRueckmeldungData);
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
        const [umlaufmappeData, umlaufmappePersonenData, personenstammData, umlaufRueckmeldungData] = await Promise.all([
          LivingAppsService.getUmlaufmappe(),
          LivingAppsService.getUmlaufmappePersonen(),
          LivingAppsService.getPersonenstamm(),
          LivingAppsService.getUmlaufRueckmeldung(),
        ]);
        setUmlaufmappe(umlaufmappeData);
        setUmlaufmappePersonen(umlaufmappePersonenData);
        setPersonenstamm(personenstammData);
        setUmlaufRueckmeldung(umlaufRueckmeldungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const umlaufmappeMap = useMemo(() => {
    const m = new Map<string, Umlaufmappe>();
    umlaufmappe.forEach(r => m.set(r.record_id, r));
    return m;
  }, [umlaufmappe]);

  const personenstammMap = useMemo(() => {
    const m = new Map<string, Personenstamm>();
    personenstamm.forEach(r => m.set(r.record_id, r));
    return m;
  }, [personenstamm]);

  return { umlaufmappe, setUmlaufmappe, umlaufmappePersonen, setUmlaufmappePersonen, personenstamm, setPersonenstamm, umlaufRueckmeldung, setUmlaufRueckmeldung, loading, error, fetchAll, umlaufmappeMap, personenstammMap };
}