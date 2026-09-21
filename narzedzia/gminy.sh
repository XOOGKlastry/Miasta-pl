#!/usr/bin/env bash
# Buduje gminy.topojson z Państwowego Rejestru Granic (GUGiK), pełna szczegółowość
# z uproszczeniem tylko do 30 m (poniżej piksela przy zbliżeniu na gminę).
set -euo pipefail
URL="https://opendata.geoportal.gov.pl/prg/granice/00_jednostki_administracyjne.zip"
mkdir -p /tmp/prg && cd /tmp/prg
echo "Pobieram PRG…"
curl -fsSL --retry 3 -o prg.zip "$URL"
ls -la prg.zip
unzip -o -q prg.zip
SHP=$(find . -iname "*gmin*.shp" | head -1)
echo "Plik gmin: $SHP"
ogrinfo -so "$SHP" "$(basename "$SHP" .shp)" | head -40
ogr2ogr -f GeoJSON -t_srs EPSG:4326 -lco COORDINATE_PRECISION=6 \
  -sql "SELECT JPT_KOD_JE AS k, JPT_NAZWA_ AS n FROM \"$(basename "$SHP" .shp)\"" \
  gminy_raw.geojson "$SHP"
cd "$GITHUB_WORKSPACE"
npx -y mapshaper@0.6 /tmp/prg/gminy_raw.geojson name=gminy -simplify interval=30 keep-shapes \
  -o format=topojson quantization=1500000 gminy.topojson
python3 - <<'PY'
import json
t=json.load(open("gminy.topojson"))
g=t["objects"]["gminy"]["geometries"]
print("gmin:",len(g),"rozmiar:",round(len(open("gminy.topojson").read())/1e6,2),"MB")
print([x["properties"] for x in g[:5]])
PY
