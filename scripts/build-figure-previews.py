"""Build small canvas previews; preserve original figures for reading and zooming.

Run manually after adding a figure: python scripts/build-figure-previews.py
Requires Pillow and PyMuPDF for the one SVG source. Generated files are committed,
so deployment and normal development do not require Python.
"""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
figures = root / "frontend/public/figures"
previews = figures / "previews"
previews.mkdir(exist_ok=True)
frameworks = json.loads((root / "frontend/content/frameworks.json").read_text("utf-8"))
original_bytes = preview_bytes = 0
for paper_id, entry in frameworks.items():
    source = figures / entry["figure"]["file"]
    original_bytes += source.stat().st_size
    if source.suffix == ".svg":
        import fitz
        with fitz.open(source) as doc:
            pix = doc[0].get_pixmap(alpha=False)
            image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    else:
        with Image.open(source) as raw:
            rgba = raw.convert("RGBA")
            image = Image.new("RGB", raw.size, "white")
            image.paste(rgba, mask=rgba.getchannel("A"))
    image.thumbnail((640, 400), Image.Resampling.LANCZOS)
    target = previews / f"{paper_id}.webp"
    image.save(target, "WEBP", quality=84, method=6)
    preview_bytes += target.stat().st_size
print(f"{len(frameworks)} previews: {preview_bytes:,} bytes; originals: {original_bytes:,} bytes")
