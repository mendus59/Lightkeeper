import type { Lighthouse, Source } from "./types";

interface Props {
  lighthouse: Lighthouse | null;
  sources: Source[];
}

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Sheet({ lighthouse: l, sources }: Props) {
  if (!l) {
    return (
      <article className="sheet">
        <p className="none">Pick a lighthouse on the map or in the list.</p>
      </article>
    );
  }

  // Footnotes are numbered per lighthouse, in order of first use.
  const order: string[] = [];
  for (const id of [...l.factSources, ...l.historySources, ...(l.stay?.sources ?? [])]) {
    if (!order.includes(id)) order.push(id);
  }
  const byId = new Map(sources.map((s) => [s.id, s]));
  const cite = (ids: string[] = []) =>
    ids.map((id) => {
      const s = byId.get(id);
      return s ? (
        <sup key={id}>
          <a href={`#src-${id}`} title={s.title} onClick={(e) => { e.preventDefault(); document.getElementById(`src-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
            [{order.indexOf(id) + 1}]
          </a>
        </sup>
      ) : null;
    });

  const facts: [string, string | null | undefined][] = [
    ["First lit", l.firstLit],
    ["Established", l.established],
    ["Current tower", l.towerBuilt],
    ["Deactivated", l.deactivated],
    ["Height", l.heightFt ? `${l.heightFt} ft` : null],
    ["Status", l.status],
    ["Owner / manager", l.owner],
    ["Heritage listing", l.heritage?.length ? l.heritage.join("; ") : null],
  ];
  const histSource = l.historySources.map((id) => byId.get(id)).find((s) => s?.license);

  return (
    <article className="sheet" aria-live="polite">
      <h2>{l.name}</h2>
      <p className="where">
        {l.place}
        {cite(l.factSources)}
      </p>
      <dl className="facts">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      {l.stateNote && <p className="checked">{l.stateNote}</p>}

      <h3>History</h3>
      {l.history.length ? (
        l.history.map((p, i) => (
          <p key={i}>
            {p}
            {i === l.history.length - 1 && cite(l.historySources)}
          </p>
        ))
      ) : (
        <p className="none">No history from our sources yet.</p>
      )}
      {l.historyExcerpt && l.history.length > 0 && (
        <p className="checked">
          Quoted from {histSource?.title ?? "the cited source"}
          {histSource?.license ? `, licensed ${histSource.license}` : ""}.
        </p>
      )}

      <h3>Overnight stays</h3>
      {l.stay ? (
        <div className="staybox">
          <strong>{l.stay.kind}</strong>, run by {l.stay.operator}. {l.stay.notes}
          {cite(l.stay.sources)}
          <br />
          <a href={l.stay.url} {...ext}>
            Booking and availability
          </a>
          <span className="checked">Link checked {l.stay.checked}. Confirm dates and prices with the operator.</span>
        </div>
      ) : (
        <p className="none">No overnight stays found in our sources.</p>
      )}

      <h3>Keeper journals and records</h3>
      {l.journals.length ? (
        <ul>
          {l.journals.map((j) => (
            <li key={j.url + j.title}>
              <a href={j.url} {...ext}>
                {j.title}
              </a>{" "}
              · {j.holder}
              {j.note ? `. ${j.note}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="none">No catalogued journals yet.</p>
      )}

      <h3>Elsewhere on the web</h3>
      <ul>
        {l.links.map((k) => (
          <li key={k.url}>
            <a href={k.url} {...ext}>
              {k.label}
            </a>
          </li>
        ))}
      </ul>

      <h3>Sources</h3>
      <ol className="sources">
        {order.map((id) => {
          const s = byId.get(id)!;
          return (
            <li key={id} id={`src-${id}`}>
              <a href={s.url} {...ext}>
                {s.title}
              </a>
              , accessed {s.accessed}
              {s.license ? ` (text ${s.license})` : ""}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
