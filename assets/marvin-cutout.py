#!/usr/bin/env python3
"""Cut Marvin out of entire.io's social card into an RGBA PNG.

The card is the only place the full robot is published. It is a palette PNG,
so decode PLTE, then build an alpha matte: flood the background inwards from
the border (so dark details *inside* Marvin, like the arm lens, survive), and
ramp alpha by colour distance so his teal glow keeps a soft edge instead of a
hard halo.
"""
import struct
import sys
import zlib
from collections import deque


def load(fn):
    d = open(fn, 'rb').read()
    pos, idat, plte, trns = 8, b'', None, None
    w = h = bd = ct = None
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos + 4])[0]
        typ = d[pos + 4:pos + 8]
        data = d[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            w, h, bd, ct = struct.unpack('>IIBB', data[:10])
        elif typ == b'PLTE':
            plte = data
        elif typ == b'tRNS':
            trns = data
        elif typ == b'IDAT':
            idat += data
        pos += 12 + ln
    raw = zlib.decompress(idat)
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    bpp = ch * (bd // 8)
    stride = w * bpp
    out = bytearray()
    prev = bytearray(stride)
    i = 0
    for _ in range(h):
        f = raw[i]; i += 1
        line = bytearray(raw[i:i + stride]); i += stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1:   line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        out += line
        prev = line
    # normalise everything to a flat RGB list
    rgb = [None] * (w * h)
    if ct == 3:
        pal = [(plte[k * 3], plte[k * 3 + 1], plte[k * 3 + 2]) for k in range(len(plte) // 3)]
        for k in range(w * h):
            rgb[k] = pal[out[k]]
    elif ct == 2:
        for k in range(w * h):
            rgb[k] = (out[k * 3], out[k * 3 + 1], out[k * 3 + 2])
    elif ct == 6:
        for k in range(w * h):
            rgb[k] = (out[k * 4], out[k * 4 + 1], out[k * 4 + 2])
    else:
        raise SystemExit('unsupported colour type %s' % ct)
    return w, h, rgb


def write_rgba(fn, w, h, rgba):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        row = rgba[y * w:(y + 1) * w]
        for (r, g, b, a) in row:
            raw += bytes((r, g, b, a))
    def chunk(typ, data):
        return (struct.pack('>I', len(data)) + typ + data
                + struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
           + chunk(b'IEND', b''))
    open(fn, 'wb').write(png)


W, H, RGB = load('og-home.png')

# Marvin's bounding box on the 1200x630 card, found by eye from a 2x zoom.
X0, Y0, X1, Y1 = 806, 352, 1176, 630
cw, ch_ = X1 - X0, Y1 - Y0
crop = [RGB[(Y0 + y) * W + (X0 + x)] for y in range(ch_) for x in range(cw)]

def dist(c1, c2):
    return max(abs(c1[0] - c2[0]), abs(c1[1] - c2[1]), abs(c1[2] - c2[2]))

# A generous outline around Marvin in source coordinates, traced off a 2x zoom.
# It only has to exclude the card's headline text and the panel edge — the
# flood below removes the background *inside* it.
POLY = [(1046, 358), (1056, 370), (1030, 400),          # right side of the antenna
        (1120, 440), (1180, 484), (1180, 526),           # head, top right to right tip
        (1142, 590), (1142, 632),                        # down past the neck
        (872, 632), (838, 596), (808, 520), (834, 472),  # torso and left arm
        (898, 458), (946, 390),                          # up to the head's top-left corner
        (1010, 406), (1034, 362)]                        # left side of the antenna
POLY = [(x - X0, y - Y0) for (x, y) in POLY]


def inside(px, py):
    hit = False
    n = len(POLY)
    for i in range(n):
        x1, y1 = POLY[i]
        x2, y2 = POLY[(i + 1) % n]
        if (y1 > py) != (y2 > py):
            xx = x1 + (py - y1) * (x2 - x1) / float(y2 - y1)
            if px < xx:
                hit = not hit
    return hit


# Background colours inside the outline, sampled by hand: the dark card panel,
# and the lighter strip of landscape showing past the panel's right edge. Fixed
# references (rather than each accepted neighbour) stop the flood crawling up
# Marvin's glow gradient and eating him.
PAL = [(11, 14, 23), (10, 13, 21), (27, 40, 59), (26, 38, 55)]
NEAR = 16   # below the ~32 distance of his nearest teal glow, so the glow lives

# Seed from every background-ish pixel lying just inside the outline. Pockets of
# panel enclosed by the head, neck and torso all touch that boundary, so they get
# cleared too — while dark details fully enclosed by Marvin (the arm lens, the
# inside of the visor) are unreachable and survive.
alpha = [0] * (cw * ch_)
bg = [False] * (cw * ch_)
q = deque()


def is_bgish(c):
    return any(dist(c, p) <= NEAR for p in PAL)


for y in range(ch_):
    for x in range(cw):
        k = y * cw + x
        if not inside(x, y) or bg[k] or not is_bgish(crop[k]):
            continue
        on_edge = any(not (0 <= x + dx < cw and 0 <= y + dy < ch_) or not inside(x + dx, y + dy)
                      for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if on_edge:
            bg[k] = True
            q.append((x, y))

while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if not (0 <= nx < cw and 0 <= ny < ch_):
            continue
        k = ny * cw + nx
        if bg[k] or not is_bgish(crop[k]):
            continue
        bg[k] = True
        q.append((nx, ny))

# Alpha:
#   flooded panel                     -> gone
#   dark detail enclosed by Marvin    -> kept solid (the arm lens, inside the visor)
#   everything else                   -> ramped by how far it is from the panel
#     colour, so the glow he casts on the card's black panel fades out instead of
#     travelling with him as a dark box.
LO, HI = 12, 34


def dist_to_panel(c):
    return min(dist(c, p) for p in PAL)


for y in range(ch_):
    for x in range(cw):
        k = y * cw + x
        c = crop[k]
        if not inside(x, y) or bg[k]:
            alpha[k] = 0
        elif is_bgish(c):
            alpha[k] = 255
        else:
            d = dist_to_panel(c)
            t = (d - LO) / float(HI - LO)
            alpha[k] = max(0, min(255, int(t * 255)))

rgba = [(crop[k][0], crop[k][1], crop[k][2], alpha[k]) for k in range(cw * ch_)]

# trim fully transparent margins
def bounds():
    xs = [x for y in range(ch_) for x in range(cw) if alpha[y * cw + x] > 6]
    ys = [y for y in range(ch_) for x in range(cw) if alpha[y * cw + x] > 6]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1

tx0, ty0, tx1, ty1 = bounds()
tw, th = tx1 - tx0, ty1 - ty0
trimmed = [rgba[(ty0 + y) * cw + (tx0 + x)] for y in range(th) for x in range(tw)]
write_rgba('marvin-full.png', tw, th, trimmed)
opaque = sum(1 for p in trimmed if p[3] > 200)
print('cutout %dx%d, %d opaque px (%.0f%% of box)' % (tw, th, opaque, 100.0 * opaque / (tw * th)))
