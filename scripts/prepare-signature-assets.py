from __future__ import annotations

from pathlib import Path

from PIL import Image

WHITE_CUTOFF = 242
SOFT_CUTOFF = 230
PADDING = 12


def alpha_from_rgb(r: int, g: int, b: int) -> int:
    min_channel = min(r, g, b)
    if min_channel >= WHITE_CUTOFF:
        return 0
    if min_channel >= SOFT_CUTOFF:
        span = WHITE_CUTOFF - SOFT_CUTOFF
        weight = (WHITE_CUTOFF - min_channel) / span
        return max(0, min(255, int(round(weight * 255))))
    return 255


def make_clean_asset(src: Path, dst: Path) -> None:
    rgba = Image.open(src).convert("RGBA")
    px = rgba.load()
    if px is None:
        raise RuntimeError(f"Cannot access pixels for {src}")
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, _a = px[x, y]
            px[x, y] = (r, g, b, alpha_from_rgb(r, g, b))

    bbox = rgba.getbbox()
    if bbox is None:
        raise RuntimeError(f"All pixels became transparent: {src}")

    trimmed = rgba.crop(bbox)
    canvas = Image.new("RGBA", (trimmed.width + (PADDING * 2), trimmed.height + (PADDING * 2)), (0, 0, 0, 0))
    canvas.paste(trimmed, (PADDING, PADDING), trimmed)
    canvas.save(dst, format="PNG")


def main() -> None:
    brand_dir = Path("public/media/brand")
    tasks = [
        (brand_dir / "company-signature.jpeg", brand_dir / "company-signature-clean.png"),
        (brand_dir / "company-stamp.jpeg", brand_dir / "company-stamp-clean.png"),
    ]

    for src, dst in tasks:
        if not src.exists():
            raise FileNotFoundError(f"Missing input asset: {src}")
        make_clean_asset(src, dst)
        print(f"generated {dst}")


if __name__ == "__main__":
    main()
