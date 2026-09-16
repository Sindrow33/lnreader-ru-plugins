#!/usr/bin/env python3
"""Generate plugin icons for every RU light-novel plugin in one unified style.

Style: 192px canvas (xxxhdpi), rounded square inset 5px, radius 44,
accent-coloured 5px border, near-black tinted fill, big bold accent monogram.
All mipmap densities are derived from the 432px master by downscaling.

LNReader serves icons as plain files under public/static, referenced by each
plugin's `icon` field — there are no mipmap densities, just one PNG per plugin.

Usage: python3 scripts/make-icons.py [plugin ...]
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

STATIC = Path(__file__).resolve().parents[1] / "public" / "static"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# LNReader ships a single 96px icon per plugin.
ICON_SIZE = 96

MASTER = 768  # render big, downscale for clean edges
SCALE = MASTER / 192

# icon path under public/static -> (monogram, accent rgb, dark fill rgb)
ICONS = {
    "src/ru/authortoday/icon.png": ("AT", (120, 190, 255), (16, 26, 40)),
    "src/ru/bookriver/icon.png": ("BR", (90, 200, 220), (14, 30, 34)),
    "src/ru/ficbook/icon.png": ("FB", (255, 150, 90), (36, 24, 16)),
    "src/ru/jaomix/icon.png": ("JX", (200, 160, 255), (26, 20, 38)),
    "src/ru/neobook/icon.png": ("NB", (130, 220, 160), (16, 32, 24)),
    "src/ru/noveltl/icon.png": ("TL", (255, 180, 100), (36, 26, 16)),
    "src/ru/ranobehub/icon.png": ("RH", (110, 170, 255), (18, 24, 42)),
    "src/ru/ranobelib/icon.png": ("RL", (110, 90, 245), (22, 22, 34)),
    "src/ru/ranoberf/icon.png": ("RF", (255, 120, 140), (36, 18, 24)),
    "src/ru/renovels/icon.png": ("RN", (100, 215, 195), (14, 32, 30)),
    "src/ru/topliba/icon.png": ("TB", (255, 210, 100), (36, 30, 14)),
    "src/ru/zelluloza/icon.png": ("ZL", (180, 220, 110), (26, 32, 16)),
    "multisrc/ranobes/ranobes/icon.png": ("RB", (140, 200, 255), (16, 26, 40)),
    "multisrc/mtlnovel/mtlnovel/icon.png": ("MT", (150, 210, 180), (18, 30, 26)),
    "multisrc/novelcool/novelcool/icon.png": ("NC", (120, 190, 240), (16, 26, 38)),
    "multisrc/rulate/rulate-api/icon.png": ("RU", (255, 140, 110), (36, 22, 18)),
    "multisrc/rulate/erolate-api/icon.png": ("ER", (240, 100, 150), (34, 16, 26)),
    "multisrc/rulate/bllate-api/icon.png": ("BL", (200, 130, 255), (28, 18, 38)),
    "multisrc/ifreedom/ifreedom/icon.png": ("СМ", (130, 215, 130), (16, 32, 20)),
    "multisrc/ifreedom/bookhamster/icon.png": ("BH", (255, 190, 120), (36, 26, 18)),
}


def fit_font(text: str, max_w: int, max_h: int) -> ImageFont.FreeTypeFont:
    size = max_h
    while size > 8:
        font = ImageFont.truetype(FONT, size)
        box = font.getbbox(text)
        if box[2] - box[0] <= max_w and box[3] - box[1] <= max_h:
            return font
        size -= 2
    return ImageFont.truetype(FONT, 8)


def render(monogram: str, accent, fill) -> Image.Image:
    img = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    inset = round(5 * SCALE)
    radius = round(44 * SCALE)
    border = round(5 * SCALE)
    box = (inset, inset, MASTER - inset - 1, MASTER - inset - 1)

    draw.rounded_rectangle(box, radius=radius, fill=(*accent, 255))
    draw.rounded_rectangle(
        (box[0] + border, box[1] + border, box[2] - border, box[3] - border),
        radius=radius - border,
        fill=(*fill, 255),
    )

    inner = MASTER - 2 * (inset + border)
    font = fit_font(monogram, int(inner * 0.80), int(inner * 0.52))
    left, top, right, bottom = font.getbbox(monogram)
    draw.text(
        (MASTER / 2 - (left + right) / 2, MASTER / 2 - (top + bottom) / 2),
        monogram,
        font=font,
        fill=(*accent, 255),
    )
    return img


def main(only=None):
    for icon_path, (monogram, accent, fill) in ICONS.items():
        if only and icon_path not in only:
            continue
        out = STATIC / icon_path
        out.parent.mkdir(parents=True, exist_ok=True)
        render(monogram, accent, fill).resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS).save(out)
        print(f"{icon_path}: {monogram}")


if __name__ == "__main__":
    import sys

    main(set(sys.argv[1:]) or None)
