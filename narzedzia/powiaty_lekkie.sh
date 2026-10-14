#!/bin/sh
# Lżejsze granice powiatów dla gry (powiaty-lekkie.json): 25% punktów, kwantyzacja 1e5.
# Pełne powiaty.topojson zostaje dla narzędzi i testów. Sąsiedztwo powiatów się nie zmienia (sprawdzone).
# Wymaga: npm i -g mapshaper
mapshaper powiaty.topojson -simplify 25% keep-shapes planar -o powiaty-lekkie.json format=topojson quantization=100000 force
mapshaper woj.geojson -simplify 30% keep-shapes planar -o woj-lekkie.json format=geojson precision=0.0001 force
