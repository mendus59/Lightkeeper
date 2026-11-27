export interface Source {
  id: string;
  title: string;
  url: string;
  accessed: string; // YYYY-MM-DD
  license?: string; // set when text is excerpted from the source, e.g. "CC BY-SA 4.0"
}

export interface Link {
  label: string;
  url: string;
}

export interface Journal {
  title: string;
  holder: string;
  url: string;
  note?: string;
}

export interface Stay {
  kind: string;
  operator: string;
  notes?: string;
  url: string;
  checked: string; // YYYY-MM-DD the booking link was last checked
  sources: string[];
}

export interface Lighthouse {
  id: string;
  name: string;
  state: string; // USPS code
  place: string;
  lat: number;
  lon: number;
  wikidata?: string; // Wikidata item id, e.g. Q1035353
  firstLit?: string | null;
  established?: string | null; // Wikidata "inception"
  deactivated?: string | null; // Wikidata "service retirement"
  towerBuilt?: string | null;
  heightFt?: number | null;
  status?: string | null;
  owner?: string | null;
  heritage?: string[]; // heritage listings, e.g. National Register of Historic Places
  stateNote?: string; // set when the state was inferred rather than stated by the source
  history: string[];
  historyExcerpt?: boolean; // history is quoted from the source (see its license), not paraphrased
  factSources: string[];
  historySources: string[];
  links: Link[];
  stay?: Stay | null;
  journals: Journal[];
}

export interface Dataset {
  generated: string;
  lighthouses: Lighthouse[];
  sources: Source[];
}
