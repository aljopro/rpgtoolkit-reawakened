#!/usr/bin/env python3
"""Render tilesets, isometric tiles and boards from RPG Toolkit 3 files.

    python3 render.py tileset Tiles/village.tst out.png
    python3 render.py iso     Tiles/grass.iso 1 out.png
    python3 render.py board   <project folder> Boards/village.brd out.png

Only 24-bit tiles (detail 1 and isometric detail 150) are decoded here.
Requires Pillow.
"""
import sys, os, re
from PIL import Image, ImageDraw
import rpgtk_formats as F

TRANSPARENT = (0, 1, 2)

def load_tileset(path):
    d = open(path, 'rb').read()
    ver, n, det = (int.from_bytes(d[i:i + 2], 'little') for i in (0, 2, 4))
    return d, n, det

_PALETTE = None
def dos_palette():
    global _PALETTE
    if _PALETTE is None:
        import json
        here = os.path.dirname(os.path.abspath(__file__))
        _PALETTE = [tuple(c) for c in json.load(open(os.path.join(here, '..', 'formats', 'dos-palette.json')))['colors']]
    return _PALETTE

def tile_pixels(path, num):
    """1024 (r, g, b) values of tile `num` (1-based) in file order (column-major, 32x32).
    16x16 tiles are doubled; palette tiles go through the DOS palette; transparent = (0, 1, 2)."""
    d, n, det = load_tileset(path)
    size = {1: (32, 3), 2: (16, 3), 3: (32, 1), 4: (16, 1), 5: (32, 1), 6: (16, 1), 150: (32, 3)}[det]
    side, bpp = size
    off = 6 + (num - 1) * side * side * bpp
    src = []
    for i in range(side * side):
        if bpp == 3:
            src.append(tuple(d[off + 3 * i: off + 3 * i + 3]))
        else:
            v = d[off + i]; src.append(TRANSPARENT if v == 255 else dos_palette()[v])
    if side == 32: return src
    out = []
    for x in range(32):
        for y in range(32): out.append(src[(x // 2) * 16 + y // 2])
    return out

_cache = {}
def tile_image(path, num):
    key = (path, num)
    if key not in _cache:
        img = Image.new('RGBA', (32, 32)); px = img.load()
        for i, rgb in enumerate(tile_pixels(path, num)):
            x, y = divmod(i, 32)                          # x outer, y inner
            px[x, y] = (0, 0, 0, 0) if rgb == TRANSPARENT else rgb + (255,)
        _cache[key] = img
    return _cache[key]

def in_diamond(X, Y):
    """The 64x32 isometric mask: row Y spans columns 31-2k .. 32+2k."""
    k = Y if Y <= 15 else 31 - Y
    return 31 - 2 * k <= X <= 32 + 2 * k

def iso_image(path, num):
    pixels = iter(tile_pixels(path, num))
    img = Image.new('RGBA', (64, 32)); px = img.load()
    for X in range(64):                                   # X outer, Y inner
        for Y in range(32):
            if in_diamond(X, Y):
                rgb = next(pixels)
                px[X, Y] = (0, 0, 0, 0) if rgb == TRANSPARENT else rgb + (255,)
    return img

def render_iso(path, num, out, scale=4):
    img = iso_image(path, num)
    bg = Image.new('RGBA', img.size, (255, 0, 255, 255)); bg.alpha_composite(img)
    bg.resize((img.width * scale, img.height * scale), Image.NEAREST).save(out)

def tileset_sheet(path, out, cols=16, scale=1):
    d, n, det = load_tileset(path)
    rows = (n + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * 34, rows * 34), (255, 0, 255, 255))
    for t in range(1, n + 1):
        sheet.alpha_composite(tile_image(path, t), ((t - 1) % cols * 34, (t - 1) // cols * 34))
    sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(out)

def board_model(path):
    r = F.Reader(open(path, 'rb').read()); F.parse_brd(r)
    m, lut, cells, run = {}, [], [], None
    for off, size, field, value in r.trace:
        if field.startswith('LUT['): lut.append(value)
        elif field.startswith('tile cell'):
            if value < 0: run = -value
            else: cells.append(value)
        elif field.startswith('  run of'): cells += [value] * run
        elif field in ('sizeX', 'sizeY', 'sizeL', 'coordType', 'startX', 'startY', 'startL'): m[field] = value
    m['lut'], m['cells'] = lut, cells
    return m

def resolve_tile(project, ref):
    """Tile reference -> (tileset path, number); .tan -> its first frame."""
    if ref.lower().endswith('.tan'):
        r = F.Reader(open(os.path.join(project, 'Tiles', ref), 'rb').read()); F.parse_tan(r)
        frames = [v for _, _, f, v in r.trace if f.startswith('frame[')]
        ref = frames[0] if frames else ''
    m = re.match(r'(.+\.(?:tst|iso))(\d+)$', ref, re.I)
    return (os.path.join(project, 'Tiles', m.group(1)), int(m.group(2))) if m else None

def render_board(project, brd, out):
    m = board_model(os.path.join(project, brd))
    w, h, L = m['sizeX'], m['sizeY'], m['sizeL']
    img = Image.new('RGBA', (w * 32, h * 32), (0, 0, 0, 255))
    i = 0
    for z in range(L):
        for y in range(h):
            for x in range(w):
                idx = m['cells'][i]; i += 1
                if idx:
                    t = resolve_tile(project, m['lut'][idx])
                    if t: img.alpha_composite(tile_image(*t), (x * 32, y * 32))
    sx, sy = m['startX'], m['startY']
    ImageDraw.Draw(img).ellipse((sx - 4, sy - 4, sx + 4, sy + 4), outline=(255, 0, 0, 255), width=2)
    img.save(out)
    return m

if __name__ == '__main__':
    if sys.argv[1] == 'tileset': tileset_sheet(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'iso': render_iso(sys.argv[2], int(sys.argv[3]), sys.argv[4])
    elif sys.argv[1] == 'board': render_board(sys.argv[2], sys.argv[3], sys.argv[4])
    else: print(__doc__)
