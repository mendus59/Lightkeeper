#!/usr/bin/env python3
"""Downloads the inputs for scripts/import-wikidata.py into WORKDIR: the list of US lighthouses with coordinates
from the Wikidata Query Service, their properties and states (rows.json, states.json), and each English
Wikipedia article page (html/). Re-running skips pages already downloaded. Wikimedia rate-limits its APIs
heavily, so pages are fetched one at a time with backoff; a full run takes about an hour.

Usage: python3 scripts/fetch-wikidata.py WORKDIR
"""
import hashlib, json, os, sys, time, urllib.parse, urllib.request
WORK = sys.argv[1]
os.makedirs(os.path.join(WORK, "html"), exist_ok=True)
UA = "LightkeeperDataImport/0.1 (https://github.com/mendus59/Lightkeeper)"
def sparql(q):
    for i in range(6):
        try:
            data = urllib.parse.urlencode({"query": q}).encode()
            req = urllib.request.Request("https://query.wikidata.org/sparql", data=data, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            return json.load(urllib.request.urlopen(req, timeout=90))["results"]["bindings"]
        except Exception as e:
            print("retry", i, e, file=sys.stderr, flush=True); time.sleep(10 * (i + 1))
    raise SystemExit("failed")
TPL = """SELECT ?item ?itemLabel ?coord ?article ?place ?placeLabel ?inception ?service ?retire ?height ?heightUnit ?owner ?ownerLabel ?operatorLabel ?heritageLabel WHERE {
  VALUES ?item { %s }
  OPTIONAL { ?item wdt:P625 ?coord . }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
  OPTIONAL { ?item wdt:P131 ?place . }
  OPTIONAL { ?item wdt:P571 ?inception . }
  OPTIONAL { ?item wdt:P729 ?service . }
  OPTIONAL { ?item wdt:P730 ?retire . }
  OPTIONAL { ?item p:P2048/psv:P2048 [ wikibase:quantityAmount ?height ; wikibase:quantityUnit ?heightUnit ] . }
  OPTIONAL { ?item wdt:P127 ?owner . }
  OPTIONAL { ?item wdt:P137 ?operator . }
  OPTIONAL { ?item wdt:P1435 ?heritage . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}"""
LIST = """SELECT ?item ?itemLabel ?coord ?article WHERE {
  ?item wdt:P31/wdt:P279* wd:Q39715 ; wdt:P17 wd:Q30 ; wdt:P625 ?coord .
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}"""
ids = sorted({b["item"]["value"].rsplit("/", 1)[1] for b in sparql(LIST)})
rows = []
for i in range(0, len(ids), 100):
    rows += sparql(TPL % " ".join("wd:" + x for x in ids[i:i+100]))
    print(i, len(rows), flush=True); time.sleep(2)
json.dump(rows, open(os.path.join(WORK, "rows.json"), "w"))
# resolve admin places to states / territories by walking P131 upward
places = sorted({b["place"]["value"].rsplit("/", 1)[1] for b in rows if "place" in b})
STATE_Q = """SELECT ?place ?state ?stateLabel ?code WHERE {
  VALUES ?place { %s }
  ?place wdt:P131* ?state .
  ?state wdt:P31 ?t . VALUES ?t { wd:Q35657 wd:Q1352230 wd:Q783733 wd:Q16110 }
  OPTIONAL { ?state wdt:P5086 ?code . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}"""
st = []
for i in range(0, len(places), 100):
    st += sparql(STATE_Q % " ".join("wd:" + x for x in places[i:i+100]))
    print("st", i, len(st), flush=True); time.sleep(2)
json.dump(st, open(os.path.join(WORK, "states.json"), "w"))
print("done")


rows = json.load(open(os.path.join(WORK, "rows.json")))
urls = sorted({b["article"]["value"] for b in rows if "article" in b})
fails = []
for n, u in enumerate(urls):
    fn = os.path.join(WORK, "html", hashlib.sha1(u.encode()).hexdigest() + ".html")
    if os.path.exists(fn): continue
    for i in range(6):
        try:
            body = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=60).read()
            open(fn, "wb").write(body); break
        except Exception as e:
            print("retry", i, e, u, flush=True); time.sleep(15 * (i + 1))
    else:
        fails.append(u)
    if n % 50 == 0: print(n, len(urls), flush=True)
    time.sleep(0.7)
print("done fails", fails, flush=True)
