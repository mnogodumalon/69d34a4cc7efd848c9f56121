import type { UmlaufRueckmeldung, UmlaufmappePersonen } from './app';

export type EnrichedUmlaufRueckmeldung = UmlaufRueckmeldung & {
  umlaufmappe_refName: string;
  person_refName: string;
};

export type EnrichedUmlaufmappePersonen = UmlaufmappePersonen & {
  umlaufmappe_refName: string;
  person_refName: string;
};
