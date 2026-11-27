#!/usr/bin/env python3
"""Imports every US lighthouse with coordinates from Wikidata into data/lighthouses.json.

Facts (coordinates, place, dates, height, heritage listings) come from each lighthouse's Wikidata item and
cite it. History is an excerpt of the English Wikipedia article's opening paragraphs (CC BY-SA 4.0) and cites
the article. Nothing is written by hand: if neither source says it, it is left out. Entries already in the
data (hand-checked ones with booking details) are kept as they are and not duplicated.

Usage: python3 scripts/import-wikidata.py WORKDIR
WORKDIR holds the downloaded inputs: rows.json and states.json (SPARQL results) and html/<sha1 of url>.html
(Wikipedia pages), as downloaded by scripts/fetch-wikidata.py. Re-running replaces the imported entries.
"""
import hashlib, json, math, os, re, sys, urllib.parse, unicodedata
from datetime import date
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = sys.argv[1]
TODAY = os.environ.get("ACCESSED", date.today().isoformat())
FT_PER_M = 3.28084
UNIT_M, UNIT_FT = "http://www.wikidata.org/entity/Q11573", "http://www.wikidata.org/entity/Q3710"

data = json.load(open(os.path.join(ROOT, "data/lighthouses.json")))
rows = json.load(open(os.path.join(WORK, "rows.json")))
states = json.load(open(os.path.join(WORK, "states.json")))

# Start again from the hand-checked entries; imported ones carry a "wikidata" id and are rebuilt below.
data["lighthouses"] = [l for l in data["lighthouses"] if not l.get("wikidata")]
cited = {i for l in data["lighthouses"] for i in l["factSources"] + l["historySources"] + (l.get("stay") or {}).get("sources", [])}
data["sources"] = [s for s in data["sources"] if s["id"] in cited or not s["id"].startswith(("wd-", "wp-"))]

STATE_NAMES = {}
place_state = {}
for s in states:
    code = s.get("code", {}).get("value") or ("UM" if s["stateLabel"]["value"] == "Wake Island" else None)
    if code:
        place_state[s["place"]["value"]] = code
        STATE_NAMES[code] = s["stateLabel"]["value"]
STATE_NAMES["UM"] = "US Minor Outlying Islands"

items = {}
for b in rows:
    v = lambda k: b.get(k, {}).get("value")
    it = items.setdefault(v("item"), {"qid": v("item").rsplit("/", 1)[1], "label": v("itemLabel"), "coords": set(), "places": [],
                                      "article": None, "inception": set(), "service": set(), "retire": set(), "heights": set(), "heritage": []})
    if v("coord"):
        it["coords"].add(v("coord"))
    if v("article"):
        it["article"] = v("article")
    if v("place") and (v("place"), v("placeLabel")) not in it["places"]:
        it["places"].append((v("place"), v("placeLabel")))
    for k in ("inception", "service", "retire"):
        if v(k):
            it[k].add(v(k))
    if v("height") and v("heightUnit") in (UNIT_M, UNIT_FT):
        it["heights"].add((float(v("height")), v("heightUnit")))
    if v("heritageLabel") and not re.match(r"^Q\d+$", v("heritageLabel")) and v("heritageLabel") not in it["heritage"]:
        it["heritage"].append(v("heritageLabel"))


def point(wkt):
    lon, lat = map(float, re.match(r"Point\(([-\d.eE]+) ([-\d.eE]+)\)", wkt).groups())
    return lat, lon


def year(values):
    # Wikidata gives full timestamps; keep only the year, the precision almost all of these statements have.
    ys = sorted({int(x[:5].lstrip("+")) if x[0] in "+-" else int(x[:4]) for x in values if re.match(r"^[+-]?\d{4}", x)})
    return str(ys[0]) if len(ys) == 1 else None  # several different years: ambiguous, leave out


def dist_km(a, b):
    (la1, lo1), (la2, lo2) = a, b
    p = math.pi / 180
    h = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


for it in items.values():
    pts = sorted(point(c) for c in it["coords"])
    it["latlon"] = pts[0] if pts else None
    it["state"] = next((place_state[p] for p, _ in it["places"] if p in place_state), None)

# Items with no state in Wikidata: take the state of the nearest lighthouse that has one, if within 50 km;
# remote Pacific islands are US Minor Outlying Islands. Anything else is reported and skipped.
known = [it for it in items.values() if it["state"] and it["latlon"]]
skipped = []
for it in items.values():
    if it["state"] or not it["latlon"]:
        continue
    near = min(known, key=lambda k: dist_km(k["latlon"], it["latlon"]))
    if dist_km(near["latlon"], it["latlon"]) <= 50:
        it["state"], it["state_from"] = near["state"], "nearest"
    elif it["latlon"][1] < -150 or (it["latlon"][1] > 144 and it["latlon"][0] < 20):
        it["state"] = "UM"
for it in list(items.values()):
    lat_lon = it["latlon"]
    if not it["state"] or not lat_lon:
        skipped.append(f'{it["label"]} ({it["qid"]}): no US state or territory in Wikidata')
        del items[next(k for k, v in items.items() if v is it)]

# Wikidata sometimes has a second, bare item for a lighthouse that already has a full one with an article.
by_label = {}
for it in items.values():
    by_label.setdefault(it["label"].lower(), []).append(it)
for group in by_label.values():
    with_article = [g for g in group if g["article"]]
    for g in group:
        if not g["article"] and any(dist_km(g["latlon"], w["latlon"]) < 2 for w in with_article):
            skipped.append(f'{g["label"]} ({g["qid"]}): duplicate of {with_article[0]["qid"]}')
            items.pop("http://www.wikidata.org/entity/" + g["qid"])

existing_urls = {k["url"] for l in data["lighthouses"] for k in l["links"]}
existing_ids = {l["id"] for l in data["lighthouses"]}
sources = {s["id"]: s for s in data["sources"]}


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def excerpt(url):
    fn = os.path.join(WORK, "html", hashlib.sha1(url.encode()).hexdigest() + ".html")
    if not os.path.exists(fn):
        return None, None
    soup = BeautifulSoup(open(fn, encoding="utf-8").read(), "html.parser")
    title = soup.select_one("#firstHeading").get_text(strip=True)
    body = soup.select_one("#mw-content-text .mw-parser-output")
    for el in body.select("sup.reference, sup.noprint, span.mw-editsection, style, .noprint, .mw-ref"):
        el.decompose()
    sections = body.find_all("section", recursive=False) or [body]
    paras = []
    for p in sections[0].find_all("p", recursive=False):
        t = re.sub(r"\s+", " ", p.get_text()).strip()
        t = re.sub(r"\s+([.,;:])", r"\1", t)
        if len(t) > 40:
            paras.append(t)
    out, total = [], 0
    for t in paras:
        if total and total + len(t) > 1200:
            break
        out.append(t)
        total += len(t)
    return title, out


added = []
for it in sorted(items.values(), key=lambda x: (x["state"], x["label"])):
    if it["article"] and it["article"] in existing_urls:
        continue
    lat, lon = it["latlon"]
    wd_id = "wd-" + it["qid"].lower()
    sources[wd_id] = {"id": wd_id, "title": f'Wikidata: {it["label"]} ({it["qid"]})', "url": f'https://www.wikidata.org/wiki/{it["qid"]}', "accessed": TODAY}
    history, hist_src, links = [], [], []
    if it["article"]:
        title, paras = excerpt(it["article"])
        if title:
            wp_id = "wp-" + slug(title).replace("-", "_")
            sources[wp_id] = {"id": wp_id, "title": f"Wikipedia: {title}", "url": it["article"], "accessed": TODAY, "license": "CC BY-SA 4.0"}
            history, hist_src = paras, [wp_id] if paras else []
        links.append({"label": "Wikipedia article", "url": it["article"]})
    links.append({"label": "Wikidata item", "url": f'https://www.wikidata.org/wiki/{it["qid"]}'})
    hts = {round(h * FT_PER_M) if u == UNIT_M else round(h) for h, u in it["heights"]}
    place_names = [n for p, n in it["places"] if n and not re.match(r"^Q\d+$", n) and n != STATE_NAMES.get(it["state"])]
    place = ", ".join(place_names[:1] + [STATE_NAMES.get(it["state"], it["state"])])
    base = slug(it["label"]) or it["qid"].lower()
    lid = base if base not in existing_ids else f'{base}-{it["state"].lower()}'
    if lid in existing_ids:
        lid = f'{base}-{it["qid"].lower()}'
    existing_ids.add(lid)
    entry = {
        "id": lid, "name": it["label"], "state": it["state"], "place": place, "lat": round(lat, 6), "lon": round(lon, 6),
        "wikidata": it["qid"],
        "firstLit": year(it["service"]), "established": year(it["inception"]), "deactivated": year(it["retire"]),
        "heightFt": hts.pop() if len(hts) == 1 else None,
        "heritage": it["heritage"],
        "history": history, "historyExcerpt": bool(history), "factSources": [wd_id], "historySources": hist_src,
        "links": links, "stay": None, "journals": [],
    }
    if it.get("state_from"):
        entry["stateNote"] = "State taken from the nearest catalogued lighthouse; Wikidata gives none."
    added.append(entry)

data["lighthouses"] += added
data["sources"] = sorted(sources.values(), key=lambda s: s["id"])
data["generated"] = TODAY
json.dump(data, open(os.path.join(ROOT, "data/lighthouses.json"), "w"), ensure_ascii=False, indent=1)
print(f"added {len(added)}, total {len(data['lighthouses'])}, {sum(bool(a['history']) for a in added)} with history")
print("skipped:\n  " + "\n  ".join(skipped))
