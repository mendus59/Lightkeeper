// Checks data/lighthouses.json before every build: every lighthouse needs coordinates in US bounds,
// a history with sources, and every cited source id must exist with an access date.
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("../data/lighthouses.json", import.meta.url), "utf8"));
const errors = [];
const sourceIds = new Set();
const date = /^\d{4}-\d{2}-\d{2}$/;
const https = /^https:\/\//;

for (const s of data.sources) {
  if (sourceIds.has(s.id)) errors.push(`duplicate source id ${s.id}`);
  sourceIds.add(s.id);
  if (!https.test(s.url)) errors.push(`source ${s.id}: url must be https`);
  if (!date.test(s.accessed)) errors.push(`source ${s.id}: accessed must be YYYY-MM-DD`);
}

const ids = new Set();
for (const l of data.lighthouses) {
  const at = `lighthouse ${l.id}`;
  if (ids.has(l.id)) errors.push(`duplicate ${at}`);
  ids.add(l.id);
  if (!/^[a-z0-9-]+$/.test(l.id)) errors.push(`${at}: id must be lowercase letters, digits and hyphens`);
  for (const k of ["name", "state", "place"]) if (!l[k]) errors.push(`${at}: missing ${k}`);
  // Loose box covering the states, Alaska, Hawaii and the territories.
  if (!(l.lat > 13 && l.lat < 72 && l.lon > -180 && l.lon < -64) && !(l.lat > 13 && l.lat < 20 && l.lon > 144 && l.lon < 146))
    errors.push(`${at}: coordinates ${l.lat},${l.lon} look outside the US`);
  if (!l.factSources?.length) errors.push(`${at}: facts need at least one source`);
  if (l.history?.length && !l.historySources?.length) errors.push(`${at}: history needs at least one source`);
  const cited = [...(l.factSources ?? []), ...(l.historySources ?? []), ...(l.stay?.sources ?? [])];
  for (const id of cited) if (!sourceIds.has(id)) errors.push(`${at}: cites unknown source ${id}`);
  if (l.stay) {
    if (!https.test(l.stay.url)) errors.push(`${at}: stay url must be https`);
    if (!date.test(l.stay.checked)) errors.push(`${at}: stay.checked must be YYYY-MM-DD`);
    if (!l.stay.sources?.length) errors.push(`${at}: stay needs at least one source`);
  }
  for (const x of [...(l.links ?? []), ...(l.journals ?? [])]) if (!https.test(x.url)) errors.push(`${at}: link ${x.url} must be https`);
}

if (errors.length) {
  console.error(`Data check failed with ${errors.length} problem(s):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log(`Data check passed: ${data.lighthouses.length} lighthouses, ${data.sources.length} sources.`);
