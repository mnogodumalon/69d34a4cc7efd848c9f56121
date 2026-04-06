// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Personenstamm {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    abteilung?: string;
    telefon?: string;
  };
}

export interface Umlaufmappe {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    zweck?: string;
    erstellungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    min_zustimmungen?: number;
    min_kenntnisnahmen?: number;
    status?: LookupValue;
    anhang_1?: string;
    anhang_2?: string;
    anhang_3?: string;
    anhang_4?: string;
    anhang_5?: string;
    bemerkung?: string;
  };
}

export interface UmlaufRueckmeldung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    umlaufmappe_ref?: string; // applookup -> URL zu 'Umlaufmappe' Record
    person_ref?: string; // applookup -> URL zu 'Personenstamm' Record
    entscheidung?: LookupValue;
    kommentar?: string;
    rueckmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface UmlaufmappePersonen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    umlaufmappe_ref?: string; // applookup -> URL zu 'Umlaufmappe' Record
    person_ref?: string; // applookup -> URL zu 'Personenstamm' Record
    aufgabentyp?: LookupValue;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  PERSONENSTAMM: '69d34a2fba1095e8bb80aaad',
  UMLAUFMAPPE: '69d34a329d0bfb14d67f386b',
  UMLAUF_RUECKMELDUNG: '69d34a339891a25a6262faa6',
  UMLAUFMAPPE_PERSONEN: '69d358ffabb893c23e32b85e',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'umlaufmappe': {
    status: [{ key: "offen", label: "Offen" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "erledigt", label: "Erledigt" }],
  },
  'umlauf_rueckmeldung': {
    entscheidung: [{ key: "ja", label: "Ja (Zur Kenntnis genommen / Genehmigt)" }, { key: "nein", label: "Nein (Abgelehnt)" }],
  },
  'umlaufmappe_personen': {
    aufgabentyp: [{ key: "kenntnisnahme", label: "Kenntnisnahme" }, { key: "zustimmung", label: "Zustimmung/Ablehnung" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'personenstamm': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'abteilung': 'string/text',
    'telefon': 'string/tel',
  },
  'umlaufmappe': {
    'titel': 'string/text',
    'zweck': 'string/textarea',
    'erstellungsdatum': 'date/date',
    'faelligkeitsdatum': 'date/date',
    'min_zustimmungen': 'number',
    'min_kenntnisnahmen': 'number',
    'status': 'lookup/radio',
    'anhang_1': 'file',
    'anhang_2': 'file',
    'anhang_3': 'file',
    'anhang_4': 'file',
    'anhang_5': 'file',
    'bemerkung': 'string/textarea',
  },
  'umlauf_rueckmeldung': {
    'umlaufmappe_ref': 'applookup/select',
    'person_ref': 'applookup/select',
    'entscheidung': 'lookup/radio',
    'kommentar': 'string/textarea',
    'rueckmeldedatum': 'date/date',
  },
  'umlaufmappe_personen': {
    'umlaufmappe_ref': 'applookup/select',
    'person_ref': 'applookup/select',
    'aufgabentyp': 'lookup/radio',
    'bemerkung': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreatePersonenstamm = StripLookup<Personenstamm['fields']>;
export type CreateUmlaufmappe = StripLookup<Umlaufmappe['fields']>;
export type CreateUmlaufRueckmeldung = StripLookup<UmlaufRueckmeldung['fields']>;
export type CreateUmlaufmappePersonen = StripLookup<UmlaufmappePersonen['fields']>;