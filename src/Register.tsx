import type { Lighthouse } from "./types";

interface Props {
  lights: Lighthouse[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function Register({ lights, selected, onSelect }: Props) {
  return (
    <div className="register" aria-label="Lighthouse list">
      <div className="register-head" aria-hidden="true">
        <span>Lighthouse</span>
        <span>State</span>
        <span>Lit</span>
        <span>Height</span>
      </div>
      {lights.length === 0 ? (
        <div className="empty">No lighthouses match. Clear the search or choose All.</div>
      ) : (
        lights.map((l) => (
          <button key={l.id} className="row" aria-current={l.id === selected} onClick={() => onSelect(l.id)}>
            <span className="nm">
              {l.name}
              {l.stay && <span className="bed"> · stays</span>}
            </span>
            <span className="num">{l.state}</span>
            <span className="num">{l.firstLit ?? ""}</span>
            <span className="num">{l.heightFt ? `${l.heightFt} ft` : ""}</span>
          </button>
        ))
      )}
    </div>
  );
}
