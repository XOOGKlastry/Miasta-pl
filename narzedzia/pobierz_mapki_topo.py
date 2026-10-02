"""Dekoder TopoJSON (z kwantyzacją) do kształtów shapely."""
from shapely.geometry import shape


def topo_na_geojson(t):
    """dekoder TopoJSON (z kwantyzacją) do listy cech GeoJSON"""
    obj = sorted(t["objects"].values(), key=lambda o: -len(o["geometries"]))[0]
    tr = t.get("transform")
    arcs = []
    for a in t["arcs"]:
        x = y = 0
        pts = []
        for p in a:
            if tr:
                x += p[0]; y += p[1]
                pts.append([x * tr["scale"][0] + tr["translate"][0], y * tr["scale"][1] + tr["translate"][1]])
            else:
                pts.append(p)
        arcs.append(pts)

    def luk(i):
        return arcs[i] if i >= 0 else arcs[~i][::-1]

    def pierscien(ids):
        pts = []
        for i in ids:
            a = luk(i)
            pts.extend(a if not pts else a[1:])
        return pts
    out = []
    for g in obj["geometries"]:
        if g["type"] == "Polygon":
            geom = {"type": "Polygon", "coordinates": [pierscien(r) for r in g["arcs"]]}
        elif g["type"] == "MultiPolygon":
            geom = {"type": "MultiPolygon", "coordinates": [[pierscien(r) for r in p] for p in g["arcs"]]}
        else:
            continue
        out.append({"k": str(g["properties"]["k"]), "n": g["properties"].get("n", ""), "geom": shape(geom).buffer(0)})
    return out
