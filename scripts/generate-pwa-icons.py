#!/usr/bin/env python3
"""Generate the PWA / Play Store icon set from the Foreman wordmark glyph.

The glyph is the same blocky "F" used in components/ui/wordmark.tsx
(path: M2 2h10v3H5v7H2V2z in a 14x14 viewBox), clay on the app's cream
background. Icons are drawn at 4x and downscaled for antialiasing.

Outputs (all committed to the repo):
  public/icons/icon-192.png            standard launcher icon
  public/icons/icon-512.png            standard launcher icon / splash
  public/icons/icon-512-maskable.png   full-bleed, glyph inside the safe zone
  public/icons/apple-touch-icon.png    180x180 for iOS home screens
  app/icon.png                         favicon (Next.js picks it up by name)

Requires: pip install pillow
Run:      python3 scripts/generate-pwa-icons.py
"""

import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def oklch_to_rgb(L, C, H):
    """oklch -> sRGB 8-bit tuple (globals.css uses oklch for the palette)."""
    a = C * math.cos(math.radians(H))
    b = C * math.sin(math.radians(H))
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    lin = (
        +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    )

    def gamma(c):
        c = max(0.0, min(1.0, c))
        c = 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        return round(c * 255)

    return tuple(gamma(c) for c in lin)


CREAM = oklch_to_rgb(0.99, 0.006, 80)  # page background in globals.css
CLAY = (0xB2, 0x6A, 0x45)  # exact glyph color from wordmark.tsx

# Wordmark path M2 2h10v3H5v7H2V2z as polygon points in the 14x14 viewBox.
GLYPH = [(2, 2), (12, 2), (12, 5), (5, 5), (5, 12), (2, 12)]
GLYPH_BOX = (2, 2, 12, 12)  # the glyph's own bounding box


def render(size, glyph_scale, out_path):
    """Draw the glyph centered on cream at `glyph_scale` of the icon width.

    glyph_scale is the glyph bounding box as a fraction of the icon size.
    Maskable icons need the mark inside the central ~80% safe zone, so they
    use a smaller scale than the standard icons.
    """
    ss = 4  # supersample factor
    big = size * ss
    img = Image.new("RGB", (big, big), CREAM)
    draw = ImageDraw.Draw(img)

    gx0, gy0, gx1, gy1 = GLYPH_BOX
    gw = gx1 - gx0
    target = big * glyph_scale
    k = target / gw
    ox = (big - gw * k) / 2 - gx0 * k
    oy = (big - (gy1 - gy0) * k) / 2 - gy0 * k
    pts = [(x * k + ox, y * k + oy) for x, y in GLYPH]
    draw.polygon(pts, fill=CLAY)

    img = img.resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, "PNG")
    print(f"wrote {os.path.relpath(out_path, ROOT)} ({size}x{size})")


if __name__ == "__main__":
    icons = os.path.join(ROOT, "public", "icons")
    render(192, 0.56, os.path.join(icons, "icon-192.png"))
    render(512, 0.56, os.path.join(icons, "icon-512.png"))
    render(512, 0.44, os.path.join(icons, "icon-512-maskable.png"))
    render(180, 0.56, os.path.join(icons, "apple-touch-icon.png"))
    render(256, 0.62, os.path.join(ROOT, "app", "icon.png"))
