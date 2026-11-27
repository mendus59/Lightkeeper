import { useEffect, useMemo, useState } from "react";
import raw from "../data/lighthouses.json";
import type { Dataset } from "./types";
import LighthouseMap from "./LighthouseMap";
import Register from "./Register";
import Sheet from "./Sheet";

const data = raw as Dataset;
type Filter = "all" | "stay";

function idFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  return data.lighthouses.some((l) => l.id === id) ? id : null;
}

export default function App() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(
    () => idFromHash() ?? data.lighthouses.find((l) => l.stay)?.id ?? data.lighthouses[0]?.id ?? null,
  );

  // Each lighthouse is linkable as #<id>.
  useEffect(() => {
    const onHash = () => {
      const id = idFromHash();
      if (id) setSelected(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const select = (id: string) => {
    setSelected(id);
    history.replaceState(null, "", `#${id}`);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.lighthouses.filter(
      (l) =>
        (filter === "all" || l.stay) &&
        (!q || `${l.name} ${l.state} ${l.place}`.toLowerCase().includes(q)),
    );
  }, [filter, query]);

  const current = data.lighthouses.find((l) => l.id === selected) ?? null;
  const stays = data.lighthouses.filter((l) => l.stay).length;

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>
            Light<span>keeper</span>
          </h1>
          <p className="tag">
            US lighthouses: where they stand, how they came to be, where the keepers' records are, and where you can
            spend the night.
          </p>
        </div>
        <span className="count">
          {data.lighthouses.length} lighthouses · {stays} with stays
        </span>
      </header>

      <div className="layout">
        <div className="mapcol">
          <LighthouseMap lights={visible} selected={selected} onSelect={select} />
          <p className="mapnote">
            Pin positions use coordinates from each lighthouse's cited source. Map data © OpenStreetMap contributors.
          </p>
        </div>

        <div className="side">
          <div className="controls">
            <label htmlFor="q" className="sr-only">
              Search lighthouses
            </label>
            <input
              id="q"
              type="search"
              placeholder="Search by name, place or state"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              All
            </button>
            <button className="chip" aria-pressed={filter === "stay"} onClick={() => setFilter("stay")}>
              Overnight stays
            </button>
          </div>
          <Register lights={visible} selected={selected} onSelect={select} />
          <Sheet lighthouse={current} sources={data.sources} />
        </div>
      </div>

      <footer>
        Facts are drawn from the sources listed on each lighthouse, accessed {data.generated}. Booking details change; confirm
        with the operator before you travel.
      </footer>
    </div>
  );
}
