import type { EnrichedUmlaufRueckmeldung, EnrichedUmlaufmappePersonen } from '@/types/enriched';
import type { Personenstamm, UmlaufRueckmeldung, Umlaufmappe, UmlaufmappePersonen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface UmlaufmappePersonenMaps {
  umlaufmappeMap: Map<string, Umlaufmappe>;
  personenstammMap: Map<string, Personenstamm>;
}

export function enrichUmlaufmappePersonen(
  umlaufmappePersonen: UmlaufmappePersonen[],
  maps: UmlaufmappePersonenMaps
): EnrichedUmlaufmappePersonen[] {
  return umlaufmappePersonen.map(r => ({
    ...r,
    umlaufmappe_refName: resolveDisplay(r.fields.umlaufmappe_ref, maps.umlaufmappeMap, 'titel'),
    person_refName: resolveDisplay(r.fields.person_ref, maps.personenstammMap, 'vorname', 'nachname'),
  }));
}

interface UmlaufRueckmeldungMaps {
  umlaufmappeMap: Map<string, Umlaufmappe>;
  personenstammMap: Map<string, Personenstamm>;
}

export function enrichUmlaufRueckmeldung(
  umlaufRueckmeldung: UmlaufRueckmeldung[],
  maps: UmlaufRueckmeldungMaps
): EnrichedUmlaufRueckmeldung[] {
  return umlaufRueckmeldung.map(r => ({
    ...r,
    umlaufmappe_refName: resolveDisplay(r.fields.umlaufmappe_ref, maps.umlaufmappeMap, 'titel'),
    person_refName: resolveDisplay(r.fields.person_ref, maps.personenstammMap, 'vorname', 'nachname'),
  }));
}
