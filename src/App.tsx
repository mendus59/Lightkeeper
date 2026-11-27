import { useEffect, useMemo, useState } from "react";
import raw from "../data/lighthouses.json";
import type { Dataset } from "./types";
import LighthouseMap from "./LighthouseMap";
import Register from "./Register";
import Sheet from "./Sheet";

const data = raw as Dataset;
type Filter = "all" | "stay";
type View = "map" | "list" | "detail";

// Phones get one pane at a time (map, list or detail) with a tab bar; wider screens show all three.
const PHONE = "(max-width: 860px)";

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

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

  const phone = useMedia(PHONE);
  // A shared link (#<id>) opens straight on that lighthouse's details.
  const [view, setViewState] = useState<View>(() => (idFromHash() ? "detail" : "map"));
  const setView = (v: View) => {
    setViewState(v);
    if (phone) window.scrollTo({ top: 0 });
  };

  // Each lighthouse is linkable as #<id>.
  useEffect(() => {
    const onHash = () => {
      const id = idFromHash();
      if (id) {
        setSelected(id);
        setViewState("detail");
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const select = (id: string) => {
    setSelected(id);
    history.replaceState(null, "", `#${id}`);
  };
  // On a phone, a list tap opens the details; a pin tap stays on the map and shows a preview card.
  const selectFromList = (id: string) => {
    select(id);
    if (phone) setView("detail");
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

      <div className="layout" data-view={view}>
        <div className="mapcol">
          <LighthouseMap
            lights={visible}
            selected={selected}
            onSelect={select}
            active={!phone || view === "map"}
            onOpen={() => setView("detail")}
          />
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
          <Register lights={visible} selected={selected} onSelect={selectFromList} />
          <Sheet lighthouse={current} sources={data.sources} />
        </div>
      </div>

      <nav className="tabs" aria-label="View">
        {(
          [
            ["map", "Map"],
            ["list", `List (${visible.length})`],
            ["detail", "Details"],
          ] as [View, string][]
        ).map(([v, label]) => (
          <button key={v} aria-current={view === v ? "page" : undefined} disabled={v === "detail" && !current} onClick={() => setView(v)}>
            {label}
          </button>
        ))}
      </nav>

      <footer>
        Facts are drawn from the sources listed on each lighthouse, accessed {data.generated}. Booking details change; confirm
        with the operator before you travel. History marked as quoted is excerpted from Wikipedia under CC BY-SA 4.0;
        facts marked with a Wikidata source come from Wikidata (CC0).
      </footer>
    </div>
  );
}
