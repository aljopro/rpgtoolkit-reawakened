#!/usr/bin/env python3
"""Build one example file for every version of every game-asset format.

These are fixtures for an importer that upgrades older files on the fly.
Each binary file is produced by running the reader's own layout function in
write mode (rpgtk_formats.Encoder), so its bytes follow exactly the layout the
spec documents for that version; it is then read back and must end exactly at
its last byte. Text (Toolkit 1/2) files are produced and checked the same way
with the line-based layouts.

    python3 build_version_examples.py      # writes ../examples/versions/
"""
import os, re, sys, shutil, math
import rpgtk_formats as F
import render as R

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'examples', 'versions')
ROWS = []          # (format, version, file, listing, ok, note)

# ------------------------------------------------------------------ value providers
def provider(values=None, rules=(), queues=None, more=None):
    """values: exact field name -> value. rules: (regex, value or callable(field, match)).
    queues: field-prefix -> list of values handed out in order. Defaults: 0 / '' / 0.0."""
    values = dict(values or {}); queues = {k: list(v) for k, v in (queues or {}).items()}
    more = list(more or [])
    def value(f, kind):
        if kind == 'more': return more.pop(0) if more else False
        for pre, q in queues.items():
            if f.startswith(pre) and q: return q.pop(0)
        if f in values: return values[f]
        for rx, v in rules:
            m = re.search(rx, f)
            if m: return v(f, m) if callable(v) else v
        return {'int': 0, 'float': 0.0, 'str': '', 'num': 0, 'line': '', 'more': False}[kind]
    return value

def colorref(r, g, b): return r | (g << 8) | (b << 16)
RECT_BASE = [(-15, -15), (15, -15), (15, 0), (-15, 0)]
RECT_ACT = [(-24, -24), (24, -24), (24, 8), (-24, 8)]
def poly_rule(f, m):
    pts = RECT_BASE if 'base' in f else RECT_ACT
    return pts[int(m.group(1))][0 if m.group(2) == 'x' else 1]
SPRITE_POLYS = [(r'\b(?:base|activate) points UB', 3), (r'(?:base|activate)\[(\d)\]\.([xy])', poly_rule),
                (r'^vector count$', 1)]

# ------------------------------------------------------------------ helpers
def write_binary(fmt, version, name, layout, value, note='', **kw):
    d = os.path.join(OUT, fmt); os.makedirs(d, exist_ok=True)
    data = F.encode(layout, value, **kw)
    path = os.path.join(d, name); open(path, 'wb').write(data)
    r = F.Reader(data, path)
    try:
        layout(r, **kw); ok = r.at_eof(); msg = '' if ok else f'stopped at 0x{r.p:x}'
    except F.FormatError as e:
        ok, msg = False, str(e)
    lst = name + '.txt'
    open(os.path.join(d, lst), 'w').write(
        f'# {fmt} {version}: {name} ({len(data)} bytes), parse ends at EOF: {ok} {msg}\n' + F.annotate(r) + '\n')
    ROWS.append((fmt, version, f'{fmt}/{name}', f'{fmt}/{lst}', ok, note))

def write_text(fmt, version, name, layout, value, note='', **kw):
    d = os.path.join(OUT, fmt); os.makedirs(d, exist_ok=True)
    text = F.encode_text(layout, value, **kw)
    path = os.path.join(d, name); open(path, 'w', newline='').write(text)
    r = F.LineReader(text, path)
    try:
        layout(r, **kw); ok = r.at_end(); msg = '' if ok else f'{len(r.lines) - r.i} lines left'
    except F.FormatError as e:
        ok, msg = False, str(e)
    lst = name + '.txt'
    body = F.annotate_lines(r).split('\n')
    if len(body) > 600:
        body = body[:400] + [f'       ... {len(body) - 500} listing lines omitted (embedded pixels) ...'] + body[-100:]
    open(os.path.join(d, lst), 'w').write(
        f'# {fmt} {version}: {name} ({len(r.lines)} lines), parse ends at the last line: {ok} {msg}\n' + '\n'.join(body) + '\n')
    ROWS.append((fmt, version, f'{fmt}/{name}', f'{fmt}/{lst}', ok, note))

# ------------------------------------------------------------------ main file, minors 1-9
def main_files():
    base = {'majorVer': 2, 'registered': 1, 'registration code': 'NOCODE', 'projectPath': 'Game\\Example\\',
            'gameTitle': 'Example Game', 'mainScreenType': 1, 'language file': '0english.lng',
            'startupPrg': 'start.prg', 'initBoard': 'village.brd', 'initChar': 'ada.tem',
            'menuKey (ASCII)': 13, 'key (ASCII)': 32, 'runTimeKeys upper bound': 50, 'enemy list upper bound': 500,
            'enemy[0]': 'slime.ene', 'enemySkill[0]': 1, 'chances': 20, 'plugin list upper bound': 4,
            'menuPlugin': 'tk3menu.dll', 'fightPlugin': 'tk3fight.dll', 'useJoystick': 1, 'pixelMovement': 1,
            'cursor enabled (minor 5)': 1, 'mouseCursor': 'TK DEFAULT', 'transpColor': colorref(255, 0, 0),
            'pfHeuristic': 2, 'pathColor': colorref(255, 255, 255), 'movementControls': 5,
            'movementKey[E]': 0xCD, 'movementKey[S]': 0xD0, 'movementKey[W]': 0xCB, 'movementKey[N]': 0xC8}
    notes = {1: 'Toolkit 2 binary: plugins as numbered flags', 2: 'Toolkit 2 binary (same layout as minor 1)',
             3: 'adds plugin names, cursor sounds, joystick, colour depth', 4: 'adds game speed (unbiased) and pixel movement',
             5: 'adds a mouse-cursor flag', 6: 'full mouse cursor', 7: 'custom resolution',
             8: 'FPS flag; game speed stored +128', 9: 'current'}
    for m in range(1, 10):
        v = dict(base, minorVer=m)
        v['gameSpeed'] = 128 if m >= 8 else 0
        if m <= 2: v['plugin[0] enabled'] = 1
        write_binary('main', f'minor {m}', f'main_minor{m}.gam', F.parse_gam, provider(v), notes[m])

# ------------------------------------------------------------------ boards
def boards():
    W, H, L = 4, 3, 2
    common = {'majorVer': 2, 'sizeX': W, 'sizeY': H, 'sizeL': L, 'LUT upper bound': 2,
              'LUT[1]': 'village.tst1', 'LUT[2]': 'village.tst8'}
    # current (vector) layout
    v = dict(common, minorVer=4, coordType=0, **{
        'shade layer upper bound': 0, 'shade[0].layer': 2, 'light upper bound': 0, 'light[0].layer': 1,
        'light[0].type': 1, 'light[0].nodes UB': 1, 'light[0].colors UB': 1,
        'vector upper bound': 0, 'vector[0].points UB': 3, 'vector[0].closed': -1, 'vector[0].layer': 1,
        'vector[0].type': 1, 'program upper bound': 0, 'program[0].fileName': 'note.prg', 'program[0].layer': 1,
        'program[0].points UB': 3, 'program[0].closed': -1, 'sprite upper bound': 0, 'sprite[0].fileName': 'chest.itm',
        'sprite[0].x': 48, 'sprite[0].y': 63, 'sprite[0].z': 1, 'sprite[0].(reserved waypoint)': -1,
        'image upper bound': -1, 'thread upper bound': 0, 'constant upper bound': 0,
        'layerTitle[1]': 'ground', 'layerTitle[2]': 'objects', 'link E': 'forest.brd', 'bkgMusic': 'village.mid',
        'battleBackground': 'forest.bkg', 'battleSkill': 1, 'bAllowBattles': -1, 'startX': 48, 'startY': 95, 'startL': 1})
    pts = [(32, 32), (64, 32), (64, 64), (32, 64)]
    rules = [(r'shade\[0\] count', W * H), (r'^  node\[(\d)\]\.([xy])', lambda f, m: [(16, 16), (100, 80)][int(m.group(1))][m.group(2) == 'y']),
             (r'^  pt\[(\d)\]\.([xy])', lambda f, m: pts[int(m.group(1))][m.group(2) == 'y']),
             (r'^  [rgb]$', 40)]
    write_binary('board', 'minor 4', 'board_minor4.brd', F.parse_brd,
                 provider(v, rules, queues={'tile cell': [-W * H, -(W * H - 2), 2, 0], '  run of': [1, 0]}),
                 'current vector layout')
    # pre-vector layouts
    for m in (2, 3):
        v = dict(common, minorVer=m, **{'registered': 1, 'startX': 2, 'startY': 2, 'startL': 1,
                 'program upper bound': 0, 'fileName': 'note.prg', 'x': 2, 'y': 3, 'layer': 1,
                 'sprite upper bound': 0, 'enterPrg': 'enter.prg', 'battleSkill': 1, 'bkg image': 'sky.png',
                 'link E': 'forest.brd', 'bkgMusic': 'village.mid', 'layerTitle[0]': 'ground',
                 'thread upper bound': 0, 'thread[0]': 'wander.prg', 'coordType (iso byte)': 0})
        q = {'cell': [-W * H, 2, -(W * H - 1)], ' index': [1, 0], ' tiletype': [0, 1, 0],
             'fileName': ['note.prg', 'chest.itm'], 'x': [2, 3], 'y': [3, 2]}
        write_binary('board', f'minor {m}', f'board_minor{m}.brd', F.parse_brd, provider(v, [], q),
                     'pre-vector: per-cell tile types and tints, tile coordinates' + ('; adds threads and coordType' if m == 3 else ''))

# ------------------------------------------------------------------ characters, minors 3-8
def characters():
    base = {'majorVer': 2, 'name': 'Ada', 'experienceVar': 'Ada[exp]!', 'defenseVar': 'Ada[dp]!', 'fightVar': 'Ada[fp]!',
            'healthVar': 'Ada[hp]!', 'maxHealthVar': 'Ada[maxhp]!', 'nameVar': 'Ada[name]$', 'smVar': 'Ada[smp]!',
            'smMaxVar': 'Ada[maxsmp]!', 'levelVar': 'Ada[level]!', 'health': 30, 'maxHealth': 30, 'defense': 4,
            'fight': 6, 'sm': 10, 'smMax': 10, 'level': 1, 'specialMove[1].file': 'fireball.spc',
            'specialMove[1].minLevel': 1, 'specialMoveName': 'Magic', 'accessoryName[1]': 'Ring',
            'levelType': 50, 'levelType (byte, minor 3)': 50, 'experienceIncrease': 20, 'maxLevel': 20,
            'levelHp': 10, 'levelDp': 5, 'levelFp': 5, 'levelSm': 10, 'levelUpType': 0, 'sizeType': 1,
            'walk[S]': 'hero\\hero_walk_s.anm', 'walk[N]': 'hero\\hero_walk_n.anm', 'walk[E]': 'hero\\hero_walk_e.anm',
            'walk[W]': 'hero\\hero_walk_w.anm', 'anim REST': 'hero\\hero_walk_s.anm', 'idle[S]': 'hero\\hero_idle_s.anm',
            'idleTime (s)': 3.0, 'speed (s/frame)': 0.05, 'custom anim upper bound': 0,
            'custom[0].animation': 'hero\\hero_wave.anm', 'custom[0].name': 'WAVE',
            'swipe sound (minor < 5)': 'swipe.wav', 'death sound (minor < 5)': 'die.wav'}
    rules = [(r'armorType\[[1-6]\]', 1), (r'walkTile\[(\d+)\]\[1\]', lambda f, m: f'village.tst{9 + int(m.group(1)) % 8}')] + SPRITE_POLYS
    notes = {3: 'Toolkit 2 binary; levelType is one byte', 4: 'Toolkit 2 binary: tile names, converted on import',
             5: '3.0: animations and custom stances', 6: 'adds idle animations', 7: 'adds idle time and speed',
             8: 'current: collision and activation polygons'}
    for m in range(3, 9):
        write_binary('character', f'minor {m}', f'character_minor{m}.tem', F.parse_tem,
                     provider(dict(base, minorVer=m), rules), notes[m])

# ------------------------------------------------------------------ items, minors 2-7
def items():
    base = {'majorVer': 2, 'itemName': 'Chest', 'description': 'A wooden chest.', 'boardYN': 1, 'equipYN': 0,
            'buyPrice': 10, 'sellPrice': 5, 'prgPickUp': 'open_chest.prg', 'sizeType': 1,
            'walk[S]': 'chest\\chest.anm', 'rest gfx': 'chest\\chest_rest.anm', 'speed (s/frame)': 0.1, 'idleTime (s)': 3.0,
            'custom anim upper bound': 0}
    rules = [(r'itmWalkGfx\[(\d+)\]\[1\]', lambda f, m: f'village.tst{13 + int(m.group(1)) % 2}'),
             (r'itmRestGfx\[1\]', 'village.tst13')] + SPRITE_POLYS
    notes = {2: 'Toolkit 2 binary: shorts for prices and stats, tile names', 3: 'ints; still tile names',
             4: 'animations instead of tile names', 5: 'adds idle animations, speed, idle time',
             6: 'rest animation no longer moved to idle', 7: 'current: collision and activation polygons'}
    for m in range(2, 8):
        write_binary('item', f'minor {m}', f'item_minor{m}.itm', F.parse_itm, provider(dict(base, minorVer=m), rules), notes[m])

# ------------------------------------------------------------------ single-version binary formats
def other_binary():
    write_binary('enemy', 'minor 1', 'enemy_minor1.ene', F.parse_ene, provider({
        'majorVer': 2, 'minorVer': 1, 'name': 'Slime', 'hp': 12, 'smp': 4, 'fp': 3, 'dp': 1, 'canRun': 1,
        'takeCrit': 20, 'giveCrit': 30, 'specialMove[0]': 'fireball.spc', 'exp': 5, 'gp': 3, 'animations UB': 5,
        'animation[0] REST': 'slime\\slime.anm', 'animation[1] FIGHT': 'slime\\slime.anm',
        'custom stance UB (int, as written)': 0, 'custom[0].animation': 'slime\\slime.anm', 'custom[0].name': 'JIGGLE'}),
        'only binary version; custom-stance count written as an int')
    write_binary('animation', 'minor 3', 'animation_minor3.anm', F.parse_anm, provider(
        {'majorVer': 2, 'minorVer': 3, 'width': 32, 'height': 32, 'frame UB': 50, 'frame[0].image': 'village.tst15',
         'frame[1].image': 'village.tst16', 'delay (s)': 0.15},
        [(r'transpColor', colorref(255, 255, 255))]), 'only binary version (51 frame slots)')
    write_binary('tile-bitmap', 'major 3', 'tilebitmap.tbm', F.parse_tbm, provider(
        {'majorVer': 3, 'width': 2, 'height': 1, 'cell[0][0].tile': 'village.tst8', 'cell[1][0].tile': 'village.tst9'}),
        'only version; extra row and column written')
    write_binary('tile-animation', 'minor 0', 'water.tan', F.parse_tan, provider(
        {'majorVer': 2, 'speed (1..200; delay = 1000/speed ms)': 5, 'frameCount (exact)': 3,
         'frame[0]': 'village.tst2', 'frame[1]': 'village.tst3', 'frame[2]': 'village.tst4'}), 'only version')
    write_binary('fight-background', 'minor 3', 'background_minor3.bkg', F.parse_bkg, provider(
        {'majorVer': 2, 'minorVer': 3, 'image': 'forest.tbm', 'music': 'battle.mid'}), 'only binary version')
    write_binary('status-effect', 'minor 2', 'status_minor2.ste', F.parse_ste, provider(
        {'majorVer': 2, 'minorVer': 2, 'name': 'Burn', 'rounds': 3, 'hp': 1, 'hpAmount': 2}), 'only binary version')
    write_binary('special-move', 'minor 2', 'special_minor2.spc', F.parse_spc, provider(
        {'majorVer': 2, 'minorVer': 2, 'name': 'Fireball', 'fp': 12, 'smp': 5, 'prg': 'fireball.prg', 'battle': 1,
         'statusEffect': 'burn.ste', 'description': 'Hurls a ball of fire.'}), 'only binary version')

# ------------------------------------------------------------------ tilesets: every detail level
def tile_bytes(detail, k):
    """Two simple test patterns: k = 0 gradient, k = 1 ring with transparent corners."""
    side = 32 if detail in (1, 3, 5, 150) else 16
    bpp = 3 if detail in (1, 2, 150) else 1
    out = bytearray()
    for x in range(side):
        for y in range(side):
            cx, cy = x - side / 2 + .5, y - side / 2 + .5
            transparent = k == 1 and math.hypot(cx, cy) > side / 2 - 1
            if bpp == 3:
                out += bytes((0, 1, 2)) if transparent else bytes((x * 255 // side, y * 255 // side, 160 if k else 60))
            else:
                out.append(255 if transparent else (32 + (x + y) % 72 if k == 0 else 40 + (x * 4 // side)))
    return bytes(out)

def tilesets():
    for det in (1, 2, 3, 4, 5, 6):
        q = {'tile ': [tile_bytes(det, 0), tile_bytes(det, 1)]}
        write_binary('tileset', f'detail {det}', f'tileset_detail{det}.tst', F.parse_tst,
                     provider({'version (20 .tst, 30 .iso)': 20, 'tileCount': 2, 'detail': det}, [], q),
                     {1: '32x32 true colour (current)', 2: '16x16 true colour', 3: '32x32 palette', 4: '16x16 palette',
                      5: '32x32 "16-colour" palette', 6: '16x16 "16-colour" palette'}[det])
        R.tileset_sheet(os.path.join(OUT, 'tileset', f'tileset_detail{det}.tst'),
                        os.path.join(OUT, 'tileset', f'tileset_detail{det}.png'), cols=2, scale=3)
    write_binary('tileset', 'iso (version 30, detail 150)', 'tileset_iso.iso', F.parse_tst,
                 provider({'version (20 .tst, 30 .iso)': 30, 'tileCount': 2, 'detail': 150}, [],
                          {'tile ': [tile_bytes(150, 0), tile_bytes(150, 1)]}), 'isometric')
    R.render_iso(os.path.join(OUT, 'tileset', 'tileset_iso.iso'), 2, os.path.join(OUT, 'tileset', 'tileset_iso.png'))

# ------------------------------------------------------------------ single tiles (.gph)
def single_tiles():
    def px(k, n=32):
        x, y = divmod(k, n)
        return -1 if (x + y) % 7 == 0 else colorref(x * 255 // n, 120, y * 255 // n)
    vals = [px(k) for k in range(1024)]
    runs, cur, cnt = [], vals[0], 1
    for v in vals[1:]:
        if v == cur: cnt += 1
        else: runs.append((cnt, cur)); cur, cnt = v, 1
    runs.append((cnt, cur))
    rq = [x for pair in runs for x in pair]
    write_text('single-tile', 'version 2, compressed', 'tile_v2_compressed.gph', F.text_gph,
               provider({'header': 'RPGTLKIT TILE', 'major': 2, 'minor': 0, 'detail': 1, 'compression': 1},
                        [], {'run ': rq}), 'what the 3.x editor writes')
    write_text('single-tile', 'version 2, uncompressed', 'tile_v2_uncompressed.gph', F.text_gph,
               provider({'header': 'RPGTLKIT TILE', 'major': 2, 'minor': 0, 'detail': 1, 'compression': 0},
                        [(r'pixel (\d+)', lambda f, m: vals[int(m.group(1))])]), 'one value per pixel')
    write_text('single-tile', 'version 2, 16x16 (detail 2)', 'tile_v2_detail2.gph', F.text_gph,
               provider({'header': 'RPGTLKIT TILE', 'major': 2, 'minor': 0, 'detail': 2, 'compression': 0},
                        [(r'pixel (\d+)', lambda f, m: px(int(m.group(1)), 16))]), '16x16, drawn doubled')
    write_text('single-tile', 'version 1 (Toolkit 1)', 'tile_v1.gph', F.text_gph_v1,
               provider({}, [(r'row (\d+)', lambda f, m: ''.join(chr(33 + (int(m.group(1)) + c) % 16) for c in range(16)))]),
               '16 rows of 16 characters, palette indices')

# ------------------------------------------------------------------ Toolkit 1/2 text formats
def text_formats():
    tile_lines = [(r'pixel \((\d+),(\d+)\)', lambda f, m: -1 if (int(m.group(1)) + int(m.group(2))) % 9 == 0
                   else colorref(200, int(m.group(1)) * 8, int(m.group(2)) * 8))]
    main = {'header': 'RPGTLKIT MAIN', 'major': 2, 'minor': 0, 'startupPrg': 'start.prg', 'runKey (ASCII)': 0,
            'menuKey (ASCII)': 13, 'key (ASCII)': 32, 'initBoard': 'village.brd', 'initChar': 'ada.tem',
            'fightGameYn': 0, 'enemy[0]': 'slime.ene', 'skill[0]': 1, 'fightType': 0, 'chances': 20, 'fprgYn': 0,
            'gameTitle': 'Example Game', 'mainScreenType': 0, 'projectPath': 'Game\\Example\\', 'extendToFullScreen': 0,
            'mainResolution': 0, 'plugin count': 1, 'use tkplug0.dll': 1, 'mainUseDayNight': 0, 'mainDayNightType': 0,
            'mainDayLength': 0, 'mainDisableProtectReg': 0, 'language file': 'english.lng'}
    write_text('main', 'Toolkit 2 text', 'main_tk2_text.gam', F.text_main, provider(main, [(r'^(skill|runTimeKey)\[', 0)]),
               'header written as RPGTLKIT MAIN; the 3.1 editor expects RPGTLKIT mainForm (see legacy notes)')
    write_text('main', 'Toolkit 1', 'main_tk1.gam', F.text_main_v1, provider(
        {'(ignored)': 'x', 'startupPrg': 'start.prg', 'runKey (a character)': 'R', 'initBoard': 'village.brd',
         'fightType': 0, 'chances': 20, 'fight file name': 'fight.dat'}), 'plus a separate fight file')
    write_text('main', 'Toolkit 1 fight file', 'fight.dat', F.text_fight_v1, provider(
        {'enemy[0]': 'slime.ene', 'skill[0]': 1}, [(r'^skill\[', 0)]), '251 enemy/skill pairs')
    char = {'header': 'RPGTLKIT CHAR', 'major': 2, 'name': 'Ada', 'experienceVar': 'Ada[exp]!', 'healthVar': 'Ada[hp]!',
            'nameVar': 'Ada[name]$', 'health': 30, 'maxHealth': 30, 'level': 1, 'specialMoveName': 'Magic', 'smYN': 0,
            'levelType': 50, 'experienceIncrease': 20, 'maxLevel': 20, 'levelHp': 10, 'swipe sound': 'swipe.wav',
            'levelUpType': 0}
    nums = [(r'(minExp|minLevel|experience|defense|fight|sm|smMax|armourSlot|levelDp|levelFp|levelSm)\b', 0)]
    for mv, size, note in [(0, 0, 'sizeType 0: pixels embedded (about 44,000 lines)'),
                           (1, 1, 'sizeType 1, minor 1: one-column battle frames'),
                           (2, 1, 'sizeType 1, minor 2: 2x2 battle frames')]:
        rules = tile_lines + nums + [(r'walkTile\[(\d+)\]\[1\]', lambda f, m: f'village.tst{9 + int(m.group(1)) % 8}')]
        write_text('character', f'Toolkit 2 text, minor {mv}', f'character_text_minor{mv}.tem', F.text_char,
                   provider(dict(char, minor=mv, sizeType=size), rules), note)
    item = {'header': 'RPGTLKIT ITEM', 'major': 2, 'itemName': 'Chest', 'boardYN': 1, 'usedBy': 0, 'buyPrice': 10,
            'sellPrice': 5, 'keyItem': 0, 'description': 'A wooden chest.', 'prgPickUp': 'open_chest.prg'}
    inums = [(r'(YN|equipSlot|HP|DP|FP|SM)\b|equip(HP|DP|FP|SM)', 0)]
    q0 = {'walk tile 0 pixel (0,0)': [0xFF], 'walk tile': [], 'rest tile pixel (0,0)': ['-2']}
    empty = [(r'walk tile ([1-9]|1[0-5]) pixel \(0,0\)', '-2')]
    write_text('item', 'Toolkit 2 text, minor 0', 'item_text_minor0.itm', F.text_item,
               provider(dict(item, minor=0), empty + tile_lines + inums, {'rest tile pixel (0,0)': ['-2']}),
               'sizeType 0: embedded pixels; "-2" marks an empty tile')
    write_text('item', 'Toolkit 2 text, minor 1', 'item_text_minor1.itm', F.text_item,
               provider(dict(item, minor=1, sizeType=1), inums + [(r'walkTile\[(\d+)\]\[1\]', 'village.tst13')]),
               'sizeType 1: tile names')
    write_text('enemy', 'Toolkit 2 text', 'enemy_text.ene', F.text_enemy, provider(
        {'header': 'RPGTLKIT ENEMY', 'major': 2, 'minor': 0, 'name': 'Slime', 'hp': 12, 'smp': 4, 'fp': 3, 'dp': 1,
         'canRun': 1, 'takeCrit': 20, 'giveCrit': 30, 'width': 1, 'height': 1, 'tile[1][1]': 'village.tst22',
         'ai': 0, 'useCode': 0, 'exp': 5, 'gp': 3}), 'fixed 19x7 tile grid; only width x height used')
    write_text('fight-background', 'Toolkit 2 text', 'background_text.bkg', F.text_bkg, provider(
        {'header': 'RPGTLKIT BKG', 'major': 2, 'minor': 0, 'music': 'battle.mid'},
        [(r'^tile\[(\d+)\]\[(\d+)\]', lambda f, m: 'village.tst1' if int(m.group(2)) > 6 else 'village.tst5'),
         (r'^tint', 0)]), '19x11 tile grid with per-tile tints')
    write_text('status-effect', 'Toolkit 2 text', 'status_text.ste', F.text_ste, provider(
        {'header': 'RPGTLKIT STATUSE', 'major': 2, 'minor': 0, 'name': 'Burn', 'rounds': 3, 'speed': 0, 'slow': 0,
         'disable': 0, 'hp': 1, 'hpAmount': 2, 'smp': 0, 'smpAmount': 0, 'code': 0}), 'same fields as binary')
    write_text('special-move', 'Toolkit 2 text', 'special_text.spc', F.text_spc, provider(
        {'header': 'RPGTLKIT SPLMOVE', 'major': 2, 'minor': 0, 'name': 'Fireball', 'fp': 12, 'smp': 5,
         'prg': 'fireball.prg', 'targetSmp': 0, 'battle': 1, 'menu': 0, 'statusEffect': 'burn.ste'}), 'same fields as binary')
    write_text('animation', 'Toolkit 2 text', 'animation_text.anm', F.text_anm, provider(
        {'header': 'RPGTLKIT ANIM', 'major': 2, 'minor': 0, 'width': 32, 'height': 32, 'frame UB': 50,
         'frame[0].image': 'village.tst15', 'frame[1].image': 'village.tst16', 'delay (s)': '0.15'},
        [(r'transpColor', colorref(255, 255, 255))]), 'one value per line; 51 frames')

# ------------------------------------------------------------------ RPGCode programs
def programs():
    d = os.path.join(OUT, 'program'); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'start.prg'), 'w', newline='').write('// Source form (current)\r\nmwin("Hello")\r\nwait()\r\n')
    ROWS.append(('program', 'source text', 'program/start.prg', 'program/start.prg', True, 'current: plain text'))
    units = [(4,), (16,), (128,), (16,), (128,)]   # "Hello" ; mwin(1 param) ; end ; wait(0) ; end
    write_binary('program', 'compiled', 'start_compiled.prg', F.parse_prg_compiled, provider(
        {'marker (00 = compiled)': bytes(1), 'function[0] name (empty ends the table)': 'mwin', 'function[1] name (empty ends the table)': 'wait',
         'instruction[0] text': 'Hello', 'instruction[1] function id': 0, 'instruction[1] parameter count': 1,
         'instruction[3] function id': 1},
        [], {f'instruction[{i}] type flags': [u[0]] for i, u in enumerate(units)}, more=[True] * 5 + [False]),
        'layout example only: no shipped tool wrote this form')

# ------------------------------------------------------------------ README
def readme():
    rows = '\n'.join(f'| {f} | {v} | [{os.path.basename(p)}]({p}) | [listing]({l}) | {"yes" if ok else "**NO**"} | {n} |'
                     for f, v, p, l, ok, n in ROWS)
    text = f'''# Every version of every asset format

One example file per version of each game-asset format, as fixtures for an importer that **upgrades older files on the fly**. Saved games are not included (they are not game assets).

**How they were made.** Each binary file was produced by running the reader's own layout definition in write mode ([../../tools/build_version_examples.py](../../tools/build_version_examples.py)), so it follows exactly the layout that [../../formats/](../../formats/README.md) and [../../formats/legacy/](../../formats/legacy/README.md) document for that version, and was then read back. Text files were produced and read back the same way with the line-based layouts. "Parses" means the reader consumed every byte (or line) and nothing more.

**What they are not.** Only the current versions are confirmed against files from the original programs (the shipped sample games). The older-version and Toolkit 1/2 examples follow the documented layouts, which come from the original programs' reading logic; no original files of those versions were available to compare with.

| Format | Version | File | Listing | Parses | What changes in this version |
|---|---|---|---|---|---|
{rows}

## Upgrade path summary

| Format | Upgrade to current |
|---|---|
| main | read with the minor-version conditions in [main-file.md](../../formats/main-file.md#layout); re-bias game speed for minor < 8; text files: [legacy/text-formats.md](../../formats/legacy/text-formats.md#main-file-toolkit-2-text) |
| board | minors 2-3: convert tile types to vectors, tints to one shading layer, tile to pixel positions ([older-binary-versions.md](../../formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector)) |
| character | minors 5-7: fill defaults; minor < 5 and text: build tile bitmaps and animations ([conversion.md](../../formats/legacy/conversion.md#characters)) |
| item | minors 4-6: fill defaults, move rest to idle south (minors 4-5); minor < 4 and text: build tile bitmaps and animations ([conversion.md](../../formats/legacy/conversion.md#items)) |
| enemy, fight background | text: build the REST tile bitmap and animation / background tile bitmap ([conversion.md](../../formats/legacy/conversion.md#enemies)) |
| status effect, special move, animation | text: same fields, re-write as binary |
| tileset | details 2-6: decode (doubling 16x16, palette lookup) and re-write as detail 1 if a single depth is wanted |
| single tile | any `.gph`: decode pixels and add to a tileset |

Tileset renders: {' '.join(f'![detail {d}](tileset/tileset_detail{d}.png)' for d in range(1, 7))} ![iso](tileset/tileset_iso.png)
'''
    open(os.path.join(OUT, 'README.md'), 'w').write(text)

def main():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    main_files(); boards(); characters(); items(); other_binary(); tilesets(); single_tiles(); text_formats(); programs()
    readme()
    bad = [r for r in ROWS if not r[4]]
    print(f'{len(ROWS)} example files, {len(bad)} failed')
    for b in bad: print('  FAIL', b)
    return len(bad)

if __name__ == '__main__':
    sys.exit(1 if main() else 0)
