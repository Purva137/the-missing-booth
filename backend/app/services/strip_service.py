"""
StripService — builds a vertical photobooth strip with themed borders.

Strip layout (all sizes in pixels):
  ┌──────────── OUTER BORDER (24px each side) ────────────┐
  │  ┌──────────── HEADER (64px) ─────────────────────┐   │
  │  │  "The Missing Booth"  ·  <theme>               │   │
  │  ├──────────── PHOTO SLOT (each) ─────────────────┤   │
  │  │  polaroid frame (8px sides/top, 28px bottom)   │   │
  │  │  photo content: 564 × 423 px (4:3)             │   │
  │  │  [8px gap between slots]                       │   │
  │  ├──────────── FOOTER (40px) ───────────────────  │   │
  │  │  date  ❤                                       │   │
  │  └────────────────────────────────────────────────┘   │
  └───────────────────────────────────────────────────────┘

Final width: 640px  (outer 24 each + inner 592)
"""

import io
import os
import math
import random
import platform
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Optional

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps


# ── Layout constants ───────────────────────────────────────────────────────────

STRIP_W          = 640
OUTER            = 24          # outer border thickness
INNER_W          = STRIP_W - 2 * OUTER
FRAME_H_PAD      = 8           # polaroid white border — sides & top
FRAME_B_PAD      = 28          # polaroid white border — bottom (thicker)
PHOTO_W          = INNER_W - 2 * FRAME_H_PAD   # 576
PHOTO_H          = int(PHOTO_W * 3 / 4)         # 432  (4:3)
SLOT_W           = INNER_W
SLOT_H           = FRAME_H_PAD + PHOTO_H + FRAME_B_PAD   # 468
GAP              = 8
HEADER_H         = 64
FOOTER_H         = 40


# ── Theme definitions ─────────────────────────────────────────────────────────

THEMES = {
    "birthday": {
        "label":      "Birthday 🎂",
        "bg":         (255, 240, 248),        # soft pink
        "border_top": (255, 183, 197),
        "border_bot": (255, 215, 120),        # gold
        "header_bg":  (255, 105, 155),
        "footer_bg":  (255, 105, 155),
        "text_color": (255, 255, 255),
        "frame_color":(255, 255, 255),
        "decor":      "confetti",
    },
    "cafe": {
        "label":      "Cafe ☕",
        "bg":         (245, 239, 230),        # warm cream
        "border_top": (139, 104, 52),
        "border_bot": (101, 67, 33),          # dark brown
        "header_bg":  (101, 67, 33),
        "footer_bg":  (101, 67, 33),
        "text_color": (255, 245, 220),
        "frame_color":(255, 248, 235),
        "decor":      "coffee_ring",
    },
    "beach": {
        "label":      "Beach 🏖️",
        "bg":         (232, 244, 253),        # sky blue
        "border_top": (100, 181, 246),
        "border_bot": (255, 213, 79),         # sandy
        "header_bg":  (41, 182, 246),
        "footer_bg":  (255, 183, 77),
        "text_color": (255, 255, 255),
        "frame_color":(255, 255, 255),
        "decor":      "waves",
    },
    "night_out": {
        "label":      "Night Out 🌙",
        "bg":         (18, 8, 40),            # deep dark
        "border_top": (90, 50, 140),
        "border_bot": (180, 100, 220),        # purple
        "header_bg":  (40, 16, 80),
        "footer_bg":  (40, 16, 80),
        "text_color": (220, 180, 255),
        "frame_color":(30, 12, 60),
        "decor":      "sparkles",
    },
    "garden": {
        "label":      "Garden 🌸",
        "bg":         (240, 248, 236),        # soft sage
        "border_top": (134, 188, 120),
        "border_bot": (246, 180, 200),        # petal pink
        "header_bg":  (100, 160, 80),
        "footer_bg":  (100, 160, 80),
        "text_color": (255, 255, 255),
        "frame_color":(255, 255, 255),
        "decor":      "flowers",
    },
    "y2k": {
        "label":      "Y2K ✨",
        "bg":         (248, 240, 255),        # holographic lavender
        "border_top": (200, 150, 255),
        "border_bot": (150, 220, 255),        # chrome blue
        "header_bg":  (180, 120, 255),
        "footer_bg":  (150, 200, 255),
        "text_color": (255, 255, 255),
        "frame_color":(255, 255, 255),
        "decor":      "stars",
    },
}


# ── Font helpers ───────────────────────────────────────────────────────────────

def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    win_dir = os.environ.get("WINDIR", "C:\\Windows")
    candidates = {
        "Windows": [
            os.path.join(win_dir, "Fonts", "arialbd.ttf" if bold else "arial.ttf"),
            os.path.join(win_dir, "Fonts", "verdanab.ttf" if bold else "verdana.ttf"),
        ],
        "Darwin": [
            "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ],
        "Linux": [
            f"/usr/share/fonts/truetype/liberation/LiberationSans-{'Bold' if bold else 'Regular'}.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ],
    }
    for path in candidates.get(platform.system(), []):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


# ── Decoration helpers ─────────────────────────────────────────────────────────

def _draw_confetti(draw: ImageDraw.Draw, w: int, h: int):
    """Random confetti dots around the border area."""
    rng = random.Random(42)
    colors = [(255, 100, 150), (255, 215, 0), (100, 200, 255), (200, 100, 255), (100, 220, 100)]
    for _ in range(80):
        x = rng.randint(0, w)
        y = rng.randint(0, h)
        r = rng.randint(3, 8)
        # Only draw in border region
        in_border = (x < OUTER + 4 or x > w - OUTER - 4 or y < OUTER + 4 or y > h - OUTER - 4)
        if in_border:
            c = rng.choice(colors)
            draw.ellipse([x-r, y-r, x+r, y+r], fill=c)


def _draw_sparkles(draw: ImageDraw.Draw, w: int, h: int, color=(220, 180, 255)):
    """Sparkle dots scattered in border area."""
    rng = random.Random(7)
    for _ in range(60):
        x = rng.randint(2, w - 2)
        y = rng.randint(2, h - 2)
        in_border = (x < OUTER + 6 or x > w - OUTER - 6 or y < OUTER + 6 or y > h - OUTER - 6)
        if in_border:
            r = rng.randint(1, 4)
            draw.ellipse([x-r, y-r, x+r, y+r], fill=color)


def _draw_coffee_ring(draw: ImageDraw.Draw, w: int, h: int):
    """Coffee ring stamp in bottom-right corner."""
    cx, cy, r = w - OUTER - 20, h - OUTER - 20, 22
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(101, 67, 33, 80), width=3)
    draw.ellipse([cx-r+5, cy-r+5, cx+r-5, cy+r-5], outline=(101, 67, 33, 40), width=2)


def _draw_waves(draw: ImageDraw.Draw, w: int, h: int):
    """Simple wave lines along top border."""
    y_base = OUTER // 2
    step = 18
    for xi in range(0, w, step * 2):
        draw.arc([xi, y_base - 5, xi + step, y_base + 5], 0, 180, fill=(100, 181, 246), width=2)
        draw.arc([xi + step, y_base - 5, xi + step * 2, y_base + 5], 180, 360, fill=(100, 181, 246), width=2)


def _draw_flowers(draw: ImageDraw.Draw, w: int, h: int):
    """Small flower icons at corners."""
    positions = [
        (OUTER // 2, OUTER // 2),
        (w - OUTER // 2, OUTER // 2),
        (OUTER // 2, h - OUTER // 2),
        (w - OUTER // 2, h - OUTER // 2),
    ]
    petal_color = (246, 180, 200)
    center_color = (255, 240, 100)
    for cx, cy in positions:
        r_petal, r_center = 7, 4
        for angle in range(0, 360, 60):
            rad = math.radians(angle)
            px = cx + int(r_petal * math.cos(rad))
            py = cy + int(r_petal * math.sin(rad))
            draw.ellipse([px-4, py-4, px+4, py+4], fill=petal_color)
        draw.ellipse([cx-r_center, cy-r_center, cx+r_center, cy+r_center], fill=center_color)


def _draw_stars(draw: ImageDraw.Draw, w: int, h: int):
    """Star shapes along border for Y2K."""
    rng = random.Random(13)
    star_colors = [(200, 150, 255), (150, 220, 255), (255, 220, 150)]
    for _ in range(30):
        x = rng.randint(2, w - 2)
        y = rng.randint(2, h - 2)
        in_border = (x < OUTER + 8 or x > w - OUTER - 8 or y < OUTER + 8 or y > h - OUTER - 8)
        if in_border:
            r = rng.randint(3, 6)
            color = rng.choice(star_colors)
            # Simple 4-point star
            draw.polygon([
                (x, y-r), (x+2, y-2), (x+r, y), (x+2, y+2),
                (x, y+r), (x-2, y+2), (x-r, y), (x-2, y-2)
            ], fill=color)


# ── Main StripService ──────────────────────────────────────────────────────────

class StripService:
    def __init__(self, upload_dir: str):
        self.upload_dir = Path(upload_dir).resolve()

    def _get_local_path(self, photo_url: str) -> Path:
        """Convert /uploads/... URL to absolute path."""
        relative = photo_url.lstrip("/").removeprefix("uploads/")
        return self.upload_dir / relative

    def _load_photo(self, path: Path) -> Optional[Image.Image]:
        try:
            img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
            return img
        except FileNotFoundError:
            print(f"[Strip] Photo not found: {path}")
            return None
        except Exception as e:
            print(f"[Strip] Error loading {path}: {e}")
            return None

    def _crop_to_ratio(self, img: Image.Image, target_w: int, target_h: int) -> Image.Image:
        """Center-crop to exact target dimensions."""
        w, h = img.size
        target_ratio = target_w / target_h
        img_ratio = w / h
        if img_ratio > target_ratio:
            new_w = int(h * target_ratio)
            left = (w - new_w) // 2
            img = img.crop((left, 0, left + new_w, h))
        else:
            new_h = int(w / target_ratio)
            top = (h - new_h) // 2
            img = img.crop((0, top, w, top + new_h))
        return img.resize((target_w, target_h), Image.LANCZOS)

    def _make_polaroid_frame(self, photo: Image.Image, cfg: dict) -> Image.Image:
        """Wrap a photo in a polaroid-style white frame."""
        frame_color = cfg["frame_color"]
        frame = Image.new("RGB", (SLOT_W, SLOT_H), frame_color)
        # Drop shadow (subtle)
        shadow = Image.new("RGB", (SLOT_W, SLOT_H), (180, 180, 180))
        shadow = shadow.filter(ImageFilter.GaussianBlur(3))
        # Paste photo into frame
        frame.paste(photo, (FRAME_H_PAD, FRAME_H_PAD))
        return frame

    def create_strip(self, photo_urls: List[str], theme: str, custom_text: Optional[str] = None) -> bytes:
        """
        Build the vertical photobooth strip.
        photo_urls: list of /uploads/... paths
        theme: one of the THEMES keys
        custom_text: optional footer message (max 30 chars); defaults to current date
        Returns JPEG bytes.
        """
        cfg = THEMES.get(theme, THEMES["cafe"])

        # Load and prepare photos
        frames: List[Image.Image] = []
        for url in photo_urls:
            path = self._get_local_path(url)
            img = self._load_photo(path)
            if img is None:
                # Placeholder frame
                img = Image.new("RGB", (PHOTO_W, PHOTO_H), (200, 200, 200))
            else:
                img = self._crop_to_ratio(img, PHOTO_W, PHOTO_H)
            frames.append(img)

        if not frames:
            frames = [Image.new("RGB", (PHOTO_W, PHOTO_H), (200, 200, 200))]

        n = len(frames)
        total_inner_h = HEADER_H + n * SLOT_H + (n - 1) * GAP + FOOTER_H
        total_h = total_inner_h + 2 * OUTER

        # ── Base canvas ──────────────────────────────────────────────────────
        canvas = Image.new("RGB", (STRIP_W, total_h), cfg["bg"])
        draw = ImageDraw.Draw(canvas)

        # ── Outer border rectangles ──────────────────────────────────────────
        # Top border
        draw.rectangle([0, 0, STRIP_W, OUTER], fill=cfg["border_top"])
        # Bottom border
        draw.rectangle([0, total_h - OUTER, STRIP_W, total_h], fill=cfg["border_bot"])
        # Left border
        draw.rectangle([0, 0, OUTER, total_h], fill=cfg["border_top"])
        # Right border
        draw.rectangle([STRIP_W - OUTER, 0, STRIP_W, total_h], fill=cfg["border_bot"])

        # ── Themed decoration ────────────────────────────────────────────────
        decor = cfg.get("decor", "")
        if decor == "confetti":
            _draw_confetti(draw, STRIP_W, total_h)
        elif decor == "sparkles":
            _draw_sparkles(draw, STRIP_W, total_h)
        elif decor == "coffee_ring":
            _draw_coffee_ring(draw, STRIP_W, total_h)
        elif decor == "waves":
            _draw_waves(draw, STRIP_W, total_h)
        elif decor == "flowers":
            _draw_flowers(draw, STRIP_W, total_h)
        elif decor == "stars":
            _draw_stars(draw, STRIP_W, total_h)

        # ── Header ───────────────────────────────────────────────────────────
        header_y = OUTER
        draw.rectangle([OUTER, header_y, STRIP_W - OUTER, header_y + HEADER_H], fill=cfg["header_bg"])

        font_title = _load_font(18, bold=True)
        font_sub   = _load_font(12)
        title_text = "The Missing Booth"
        sub_text   = cfg["label"]

        tw = draw.textlength(title_text, font=font_title)
        draw.text(((STRIP_W - tw) / 2, header_y + 10), title_text, font=font_title, fill=cfg["text_color"])
        sw = draw.textlength(sub_text, font=font_sub)
        draw.text(((STRIP_W - sw) / 2, header_y + 36), sub_text, font=font_sub, fill=cfg["text_color"])

        # ── Photo frames ─────────────────────────────────────────────────────
        slot_y = OUTER + HEADER_H
        for frame_img in frames:
            polaroid = self._make_polaroid_frame(frame_img, cfg)
            canvas.paste(polaroid, (OUTER, slot_y))
            slot_y += SLOT_H + GAP

        # ── Footer ───────────────────────────────────────────────────────────
        footer_y = total_h - OUTER - FOOTER_H
        draw.rectangle([OUTER, footer_y, STRIP_W - OUTER, footer_y + FOOTER_H], fill=cfg["header_bg"])

        if custom_text and custom_text.strip():
            footer_str = custom_text.strip()[:30] + "  ❤"
        else:
            footer_str = datetime.now().strftime("%B %d, %Y") + "  ❤"
        font_footer = _load_font(13)
        dw = draw.textlength(footer_str, font=font_footer)
        draw.text(((STRIP_W - dw) / 2, footer_y + 13), footer_str, font=font_footer, fill=cfg["text_color"])

        # ── Save ─────────────────────────────────────────────────────────────
        buf = io.BytesIO()
        canvas.save(buf, format="JPEG", quality=93)
        return buf.getvalue()
