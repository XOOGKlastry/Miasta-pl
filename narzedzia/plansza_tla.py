"""Tła planszy z zaakceptowanych malowanych ilustracji (narzedzia/plansza-zrodla).

Ilustracje mają narysowane numery pól, gwiazdki, kłódki, pionek przy polu 3 i przycisk GRAJ.
Gra pokazuje prawdziwy postęp własnymi elementami, więc te narysowane stany są tu zamalowywane
(inpainting OpenCV) i każde województwo trafia do osobnego pliku grafiki/plansza/<id>.webp,
już przycięte: bez paska z nazwą u góry (10% wysokości), jak w paczce.
Wynik: grafiki/plansza/plansza.json z pozycjami pól w procentach nowego kadru.
"""
import json, pathlib
import cv2, numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "narzedzia" / "plansza-zrodla"
OUT = ROOT / "grafiki" / "plansza"


WZORCE = []
RECZNE = {"mazowieckie": {1: (162, 32)}, "lubelskie": {0: (-90, 55)}}


def wzorce(dane):
    """Wzorce narysowanego pola: pola 4 i 5 Zachodniopomorskiego (krążek z numerem i kłódką)."""
    r = dane["regions"][0]
    a = dane["assets"][r["asset"]]
    img = cv2.imread(str(SRC / pathlib.Path(a["file"]).name), cv2.IMREAD_GRAYSCALE)
    c = r["crop"]
    kadr = img[:, c["left"]:c["left"] + c["width"]]
    H, W = kadr.shape[:2]
    rr = int(W * .05)
    for i in (0, 1, 2, 3, 4, 5):
        lv = r["levels"][i]
        x, y = int(lv["x"] / 100 * W), int(lv["y"] / 100 * H)
        WZORCE.append(kadr[y - rr:y + rr, x - rr:x + rr].copy())


def main():
    dane = json.loads((SRC / "plansze.json").read_text(encoding="utf-8"))
    wzorce(dane)
    OUT.mkdir(parents=True, exist_ok=True)
    wynik = {"regions": []}
    for r in dane["regions"]:
        a = dane["assets"][r["asset"]]
        img = cv2.imread(str(SRC / pathlib.Path(a["file"]).name), cv2.IMREAD_COLOR)
        c = r["crop"]
        kadr = img[:, c["left"]:c["left"] + c["width"]].copy()
        H, W = kadr.shape[:2]
        szary = cv2.medianBlur(cv2.cvtColor(kadr, cv2.COLOR_BGR2GRAY), 5)
        hsv = cv2.cvtColor(kadr, cv2.COLOR_BGR2HSV)
        # pozycje pól z paczki bywają przesunięte o kilkanaście pikseli: dopasowujemy je wzorcem narysowanego pola
        # (krążek z numerem wycięty z dobrze opisanego Zachodniopomorskiego), w kilku skalach, tylko w pobliżu
        szary = cv2.cvtColor(kadr, cv2.COLOR_BGR2GRAY)
        poprawione = []
        for lv in r["levels"]:
            x, y = lv["x"] / 100 * W, lv["y"] / 100 * H
            okno = int(W * .2)
            x0, y0 = max(0, int(x - okno)), max(0, int(y - okno))
            roi = szary[y0:min(H, int(y + okno)), x0:min(W, int(x + okno))]
            najl = None
            for wz in WZORCE:
                for sk in (.85, .95, 1.05, 1.15, 1.25):
                    t = cv2.resize(wz, None, fx=sk, fy=sk)
                    if t.shape[0] >= roi.shape[0] or t.shape[1] >= roi.shape[1]:
                        continue
                    res = cv2.matchTemplate(roi, t, cv2.TM_CCOEFF_NORMED)
                    _, mx, _, ml = cv2.minMaxLoc(res)
                    if najl is None or mx > najl[0]:
                        najl = (mx, x0 + ml[0] + t.shape[1] / 2, y0 + ml[1] + t.shape[0] / 2)
            if najl and najl[0] > .38:
                x, y = float(najl[1]), float(najl[2])
            poprawione.append((x, y))
        # dwa pola, których nie złapał wzorzec: przesunięcie zmierzone ręcznie na ilustracji (piksele kadru)
        for i, (dx, dy) in RECZNE.get(r["id"], {}).items():
            poprawione[i] = (poprawione[i][0] + dx, poprawione[i][1] + dy)
        def blob(cx, cy, rx, ry, maska_kolor):
            x0, y0, x1, y1 = max(0, int(cx - rx)), max(0, int(cy - ry)), min(W, int(cx + rx)), min(H, int(cy + ry))
            m = maska_kolor[y0:y1, x0:x1]
            n, lab, st, _ = cv2.connectedComponentsWithStats(m)
            if n <= 1:
                return None
            i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
            if st[i, cv2.CC_STAT_AREA] < 60:
                return None
            return (x0 + st[i, 0], y0 + st[i, 1], st[i, 2], st[i, 3])
        zolty = cv2.inRange(hsv, (15, 120, 170), (35, 255, 255))
        czerw = cv2.inRange(hsv, (0, 120, 110), (8, 255, 255)) | cv2.inRange(hsv, (172, 120, 110), (180, 255, 255))
        # każdy narysowany element zastępujemy fragmentem ilustracji z sąsiedztwa (łata z miękką krawędzią),
        # wybraną tak, żeby kolory na obrzeżu pasowały; to wygląda naturalniej niż samo rozmywanie
        R = int(W * 0.078)
        # narysowane pola (numery, gwiazdki, kłódki) zostają: gra kładzie na nich własne pola z prawdziwym postępem;
        # usuwamy tylko pionek przy polu 3 i przycisk GRAJ, których nie da się przykryć
        obiekty = []
        pola = np.zeros((H, W), np.uint8)
        for x, y in poprawione:
            cv2.ellipse(pola, (int(x), int(y + R * .3)), (int(R * 1.2), int(R * 1.5)), 0, 0, 360, 255, -1)
        x3, y3 = int(poprawione[2][0]), int(poprawione[2][1])
        # pionek: czerwony dół kulki z lewej strony pola 3 (z białą górą i cieniem)
        b = blob(x3 - R * 2, y3, R * 1.6, R * 1.4, czerw & ~pola)
        if b:
            bx, by, bw, bh = b
            obiekty.append(("elipsa", bx + bw // 2, by, int(bw * .75) + 6, int(bh * 1.6) + 8))
        else:
            obiekty.append(("elipsa", x3 - int(R * 2.0), y3 + int(R * .1), int(R * 1.25), int(R * 1.3)))
        # przycisk GRAJ: żółty prostokąt z prawej strony pola 3
        px, py = r["play"]["x"] / 100 * W, r["play"]["y"] / 100 * H
        obiekty.append(("elipsa", int(px) - int(W * .01), int(py), int(W * .155), int(H * .046)))
        b = blob(px, py, W * .2, H * .06, zolty & ~pola)
        if b:
            bx, by, bw, bh = b
            if abs(bx + bw / 2 - px) < W * .15 and bw < W * .32 and bh < H * .07:   # tylko kształt przycisku, nie pole zboża
                obiekty.append(("elipsa", bx + bw // 2, by + bh // 2, bw // 2 + 14, bh // 2 + 12))
        zajete = pola.copy()
        for _, x, y, rx, ry in obiekty:
            cv2.ellipse(zajete, (x, y), (rx, ry), 0, 0, 360, 255, -1)
        czysty = kadr.copy()
        for _, x, y, rx, ry in obiekty:
            m = np.zeros((H, W), np.uint8)
            cv2.ellipse(m, (x, y), (rx, ry), 0, 0, 360, 255, -1)
            pierscien = cv2.dilate(m, np.ones((15, 15), np.uint8)) & ~m
            ys, xs = np.nonzero(pierscien)
            best = None
            for dx, dy in [(a / 2, b / 2) for a in range(-8, 9) for b in range(-7, 8) if abs(a) > 2 or abs(b) > 2]:
                ox, oy = int(dx * rx), int(dy * ry)
                y0, y1, x0, x1 = y - ry - 10 + oy, y + ry + 10 + oy, x - rx - 10 + ox, x + rx + 10 + ox
                # okno źródła może wystawać poza kadr przy krawędzi (przycisk GRAJ bywa przy prawym brzegu);
                # liczy się tylko to, żeby obrzeże i środek łaty leżały w obrazie
                if not (0 <= ys.min() + oy and ys.max() + oy < H and 0 <= xs.min() + ox and xs.max() + ox < W):
                    continue
                if zajete[max(0, y0):max(0, y1), max(0, x0):max(0, x1)].any() or y0 < H * .18:
                    continue
                roznica = np.mean(np.abs(czysty[ys + oy, xs + ox].astype(int) - czysty[ys, xs].astype(int)))
                if best is None or roznica < best[0]:
                    best = (roznica, ox, oy)
            if best is None:
                print("  brak łaty dla", r["id"], x, y, rx, ry)
                czysty = cv2.inpaint(czysty, cv2.dilate(m, np.ones((5, 5), np.uint8)), 9, cv2.INPAINT_TELEA)
                continue
            _, ox, oy = best
            przes = np.float32([[1, 0, ox], [0, 1, oy]])
            zrodlo = cv2.warpAffine(czysty, przes, (W, H), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_REFLECT)
            # zrodlo(x,y) = czysty(x - ox, y - oy); potrzebujemy czysty(x + ox, y + oy)
            zrodlo = cv2.warpAffine(czysty, np.float32([[1, 0, -ox], [0, 1, -oy]]), (W, H), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_REFLECT)
            alfa = cv2.GaussianBlur(cv2.dilate(m, np.ones((9, 9), np.uint8)).astype(np.float32) / 255, (0, 0), 5)[..., None]
            czysty = (czysty * (1 - alfa) + zrodlo * alfa).astype(np.uint8)
        gora = int(H * 0.10)
        czysty = czysty[gora:]
        cv2.imwrite(str(OUT / (r["id"] + ".webp")), czysty, [cv2.IMWRITE_WEBP_QUALITY, 82])
        Hc = H - gora
        wynik["regions"].append({"id": r["id"], "name": r["name"], "w": W, "h": Hc,
            "levels": [{"x": round(x / W * 100, 3), "y": round((y - gora) / Hc * 100, 3)} for x, y in poprawione]})
        print(r["id"], W, Hc)
    (OUT / "plansza.json").write_text(json.dumps(wynik, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
