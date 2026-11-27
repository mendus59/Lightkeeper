export interface Source {
  id: string;
  title: string;
  url: string;
  accessed: string; // YYYY-MM-DD
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
  firstLit?: string | null;
  towerBuilt?: string | null;
  heightFt?: number | null;
  status?: string | null;
  owner?: string | null;
  history: string[];
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
