"""
Generate illustrated placeholder photography for showcase listings.

Why generated rather than sourced: a rental marketplace needs images of
buildings and rooms. Picsum's catalogue is random Unsplash photography --
sampled thirty of them and got wolves, mountains and a typewriter. The
sources that do have building photography (Wikimedia Commons) are mostly
CC BY-SA, which would put an attribution obligation on a production site
for pictures of buildings that are not the advertised property anyway.

So these are openly illustrations, in the product's own palette. They
fill the grid without pretending to be a photograph of a specific
address, which is the same thing the "Showcase listing" badge says.

Deterministic: the same slug always produces the same images, so re-runs
do not reshuffle the site.
"""
import hashlib
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

W, H = 1600, 1200

IVORY = (247, 244, 240)
SAGE = (241, 236, 230)
SAND = (214, 204, 192)
CHARCOAL = (28, 25, 23)
SLATE = (87, 83, 78)
BRAND = (218, 26, 50)
DEEP = (160, 12, 48)


def rng(seed: str, salt: str = "") -> float:
    h = hashlib.sha256((seed + salt).encode()).digest()
    return int.from_bytes(h[:4], "big") / 0xFFFFFFFF


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sky(img, seed):
    """Vertical wash, warmer or cooler per listing so a grid of these
    does not read as one repeated asset."""
    d = ImageDraw.Draw(img)
    warmth = rng(seed, "sky")
    top = mix(mix(SAGE, (255, 237, 213), warmth), IVORY, 0.25)
    bottom = mix(IVORY, (255, 255, 255), 0.6)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=mix(top, bottom, (y / H) ** 0.8))


def sun(img, seed):
    r = 120 + int(rng(seed, "sunr") * 80)
    cx = int(W * (0.12 + rng(seed, "sunx") * 0.7))
    cy = int(H * (0.12 + rng(seed, "suny") * 0.18))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    for i in range(14, 0, -1):
        rr = r * (1 + i * 0.22)
        g.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(255, 214, 190, 7))
    g.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 241, 224, 220))
    img.alpha_composite(glow)


def windows(d, x0, y0, x1, y1, cols, rows, seed, lit_colour):
    pad = (x1 - x0) * 0.09
    cw = (x1 - x0 - pad * (cols + 1)) / cols
    ch = (y1 - y0 - pad * (rows + 1)) / rows
    for r in range(rows):
        for c in range(cols):
            wx = x0 + pad + c * (cw + pad)
            wy = y0 + pad + r * (ch + pad)
            lit = rng(seed, f"w{r}-{c}") > 0.62
            d.rounded_rectangle(
                [wx, wy, wx + cw, wy + ch],
                radius=max(4, cw * 0.12),
                fill=lit_colour if lit else mix(SLATE, CHARCOAL, 0.35),
            )


def draw_house(d, seed, base):
    """Pitched roof, verandah posts -- the single-storey compound house."""
    ground = H * 0.78
    w = W * (0.46 + rng(seed, "hw") * 0.1)
    x0 = (W - w) / 2
    x1 = x0 + w
    body_top = ground - H * 0.26
    d.polygon([(x0 - w * 0.08, body_top), (W / 2, body_top - H * 0.15), (x1 + w * 0.08, body_top)],
              fill=mix(base, CHARCOAL, 0.3))
    d.rectangle([x0, body_top, x1, ground], fill=base)
    windows(d, x0 + w * 0.06, body_top + H * 0.05, x1 - w * 0.06, ground - H * 0.09, 3, 1, seed,
            (255, 232, 196))
    door_w = w * 0.13
    d.rounded_rectangle([W / 2 - door_w / 2, ground - H * 0.1, W / 2 + door_w / 2, ground],
                        radius=door_w * 0.3, fill=mix(base, CHARCOAL, 0.45))


def draw_block(d, seed, base):
    """Several storeys of windows -- apartment, studio, room."""
    ground = H * 0.78
    w = W * (0.3 + rng(seed, "bw") * 0.08)
    x0 = (W - w) / 2 - W * 0.06
    x1 = x0 + w
    top = ground - H * (0.4 + rng(seed, "bh") * 0.12)
    d.rectangle([x0, top, x1, ground], fill=base)
    d.rectangle([x0, top, x1, top + H * 0.02], fill=mix(base, CHARCOAL, 0.35))
    rows = 4 + int(rng(seed, "rows") * 2)
    windows(d, x0, top + H * 0.04, x1, ground - H * 0.03, 3, rows, seed, (255, 228, 186))
    # A lower neighbouring wing, so the silhouette is not a lone box.
    w2 = w * 0.62
    x2 = x1 + W * 0.02
    top2 = ground - H * 0.26
    d.rectangle([x2, top2, x2 + w2, ground], fill=mix(base, IVORY, 0.18))
    windows(d, x2, top2 + H * 0.03, x2 + w2, ground - H * 0.03, 2, 3, seed + "b", (255, 228, 186))


def draw_shopfront(d, seed, base):
    """Awning and a wide display frontage -- shop, warehouse."""
    ground = H * 0.8
    w = W * 0.56
    x0 = (W - w) / 2
    x1 = x0 + w
    top = ground - H * 0.34
    d.rectangle([x0, top, x1, ground], fill=base)
    awning_y = top + H * 0.1
    stripes = 9
    sw = w / stripes
    for i in range(stripes):
        c = BRAND if i % 2 == 0 else IVORY
        d.polygon([(x0 + i * sw, awning_y), (x0 + (i + 1) * sw, awning_y),
                   (x0 + (i + 1) * sw - sw * 0.1, awning_y + H * 0.07),
                   (x0 + i * sw - sw * 0.1, awning_y + H * 0.07)], fill=c)
    d.rounded_rectangle([x0 + w * 0.06, awning_y + H * 0.11, x1 - w * 0.06, ground - H * 0.02],
                        radius=12, fill=mix(SLATE, CHARCOAL, 0.25))
    d.rounded_rectangle([x0 + w * 0.08, awning_y + H * 0.13, x1 - w * 0.08, ground - H * 0.05],
                        radius=10, fill=(255, 236, 206))


def draw_tower(d, seed, base):
    """Taller, narrower, glazed -- office."""
    ground = H * 0.78
    w = W * 0.26
    x0 = (W - w) / 2
    x1 = x0 + w
    top = ground - H * 0.58
    d.rectangle([x0, top, x1, ground], fill=base)
    windows(d, x0, top + H * 0.03, x1, ground - H * 0.03, 4, 9, seed, (214, 236, 255))


def palm(d, x, ground, scale, seed, i):
    """A few fronds on a leaning trunk. Crude on purpose: these are
    illustrations, and detail here would fight the flat building."""
    h = 190 * scale
    lean = (rng(seed, f"lean{i}") - 0.5) * 36 * scale
    trunk = mix(SLATE, CHARCOAL, 0.45)
    d.line([(x, ground), (x + lean, ground - h)], fill=trunk, width=max(4, int(11 * scale)))
    tip = (x + lean, ground - h)
    for k in range(6):
        ang = math.pi + (k / 5) * math.pi
        fx = tip[0] + math.cos(ang) * 82 * scale
        fy = tip[1] + math.sin(ang) * 46 * scale - 12 * scale
        d.line([tip, (fx, fy)], fill=mix((74, 96, 60), CHARCOAL, 0.15), width=max(3, int(8 * scale)))


SHAPES = {
    "house": draw_house,
    "apartment": draw_block,
    "studio": draw_block,
    "room": draw_block,
    "shop": draw_shopfront,
    "office": draw_tower,
}


def render(slug: str, category: str, variant: int) -> Image.Image:
    seed = f"{slug}:{variant}"
    img = Image.new("RGBA", (W, H), IVORY)
    sky(img, seed)
    sun(img, seed)
    d = ImageDraw.Draw(img, "RGBA")

    # Distant skyline, so the subject is not floating on a blank wash.
    hz = H * 0.78
    x = -40
    while x < W + 40:
        bw = 60 + rng(seed, f"far{x}") * 150
        bh = 60 + rng(seed, f"farh{x}") * 190
        d.rectangle([x, hz - bh, x + bw, hz], fill=mix(SAND, IVORY, 0.55))
        x += bw + 14

    hue = rng(seed, "hue")
    # The first pass tinted everything a few percent off sand, so a grid
    # of them read as one grey asset repeated. These are washed Liberian
    # facade colours -- ochre, rose, mint, clay -- kept muted enough to
    # sit under the product's own red.
    facades = [(226, 199, 160), (223, 186, 178), (196, 210, 192), (214, 178, 160), (205, 199, 186)]
    base = mix(facades[int(hue * len(facades)) % len(facades)], IVORY, 0.12)
    SHAPES.get(category, draw_block)(d, seed, base)

    d.rectangle([0, hz, W, H], fill=mix(SAND, CHARCOAL, 0.12))
    d.rectangle([0, hz, W, hz + 6], fill=mix(SAND, CHARCOAL, 0.3))

    for i in range(2 + int(rng(seed, "palms") * 2)):
        px = W * (0.05 + rng(seed, f"px{i}") * 0.9)
        # Keep them off the middle, where the building is.
        if 0.32 < px / W < 0.68:
            px = W * (0.08 if i % 2 == 0 else 0.9)
        palm(d, px, hz + H * 0.02, 0.8 + rng(seed, f"ps{i}") * 0.5, seed, i)

    # Radial falloff. The first attempt stacked nested rectangles, which
    # left a visible square frame inside every image -- obvious once they
    # were seen side by side.
    mask = Image.radial_gradient("L").resize((W, H))
    shade = Image.new("RGBA", (W, H), (58, 44, 34, 255))
    shade.putalpha(mask.point(lambda v: int(v * 0.17)))
    img.alpha_composite(shade)
    return img.convert("RGB")


if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    pairs = [tuple(a.split(":", 1)) for a in sys.argv[2:]]
    for slug, category in pairs:
        for v in range(3):
            render(slug, category, v).save(out / f"{slug}-{v}.jpg", "JPEG", quality=82, optimize=True)
    print(f"generated {len(pairs) * 3} images in {out}")
