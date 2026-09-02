#!/usr/bin/env python3
"""Genera le icone dell'app.

    python3 scripts/make-icon.py          (serve Pillow)

Disegna tutto a 4x e rimpicciolisce con LANCZOS: i bordi curvi restano puliti
senza dover gestire l'antialiasing a mano.

Il segno: un manubrio arancione (la forza) su una pista verde-azzurra (il fiato).
Sono i due colori che l'app usa ovunque per distinguere i due binari del
programma, quindi l'icona parla la stessa lingua delle schermate.
"""
from PIL import Image, ImageDraw

S = 1024          # lato finale
SS = 4            # supersampling
W = S * SS

GROUND_TOP = (0x16, 0x1D, 0x23)
GROUND_BOT = (0x0D, 0x11, 0x15)
FORZA = (0xE8, 0x62, 0x2A)
CORSA = (0x2F, 0xA8, 0xA0)


def rr(d, cx, cy, hw, hh, r, fill):
    """Rettangolo arrotondato definito da centro e semi-dimensioni."""
    d.rounded_rectangle([cx - hw, cy - hh, cx + hw, cy + hh], radius=r, fill=fill)


ANGLE = 30        # inclinazione: usa la diagonale, quindi il segno può essere più grande
SCALE = 1.18


def build():
    img = Image.new("RGB", (W, W), GROUND_BOT)
    d = ImageDraw.Draw(img)

    # Fondo: gradiente verticale appena percettibile, così non sembra spento.
    for y in range(W):
        t = y / (W - 1)
        d.line([(0, y), (W, y)],
               fill=tuple(round(a + (b - a) * t) for a, b in zip(GROUND_TOP, GROUND_BOT)))

    k = SS
    cx = cy = W // 2

    # Il manubrio si disegna su un livello a parte così si può ruotare senza
    # portarsi dietro il gradiente del fondo.
    layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)

    def f(v):
        return int(v * SCALE * k)

    # Un solo oggetto, centrato e grande: a 60 pixel deve restare leggibile.
    # I due colori del programma stanno dentro lo stesso manubrio invece di
    # essere due elementi separati — due forme staccate leggevano come una faccia.
    rr(ld, cx, cy, f(134), f(41), f(28), CORSA)                       # barra: il fiato
    for s_ in (-1, 1):
        rr(ld, cx + s_ * f(200), cy, f(60), f(141), f(42), FORZA)     # disco: la forza
        rr(ld, cx + s_ * f(286), cy, f(34), f(91), f(26), FORZA)      # fermo

    layer = layer.rotate(ANGLE, resample=Image.BICUBIC, center=(cx, cy))
    img.paste(layer, (0, 0), layer)

    return img.resize((S, S), Image.LANCZOS)


if __name__ == "__main__":
    icon = build()
    icon.save("public/icon.png", optimize=True)
    icon.resize((180, 180), Image.LANCZOS).save("public/apple-touch-icon.png", optimize=True)
    icon.resize((64, 64), Image.LANCZOS).save("public/favicon.png", optimize=True)
    print("scritte: public/icon.png (1024), apple-touch-icon.png (180), favicon.png (64)")
