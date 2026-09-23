#!/usr/bin/env python3
"""
Nova AI — генератор статичных ассетов.

Рендерит то, что нельзя положить в репозиторий «руками»:
  • assets/img/sphere-static.png      — статичный кадр сферы (фолбэк для ТВ,
                                         prefers-reduced-motion и браузеров без WebGL);
  • assets/video/sphere-{dark,light}.mp4 + постеры — видеолуп сферы для смартфонов
                                         (по ТЗ: ≤ 1.5 МБ);
  • assets/img/og-image.png           — превью для соцсетей 1200×630;
  • assets/img/icon-*.png             — иконки для манифеста и iOS.

Сфера считается той же математикой, что и WebGL-версия в assets/js/modules/sphere.js
(сфера Фибоначчи, градиент #7C5CFF → #3DD6FF → #FF5CAA, «дыхание» частиц).

Запуск:  python3 scripts/render-assets.py
Нужно:   numpy, pillow, fonttools, brotli, ffmpeg в PATH.
"""
import io
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
VID = ROOT / "assets" / "video"
FONTS = ROOT / "assets" / "fonts"

BG_DARK = (7, 7, 12)
BG_LIGHT = (243, 242, 247)
C1, C2, C3 = np.array([124, 92, 255]), np.array([61, 214, 255]), np.array([255, 92, 170])


# ---------------------------------------------------------------- sphere math
def fib_sphere(n, radius=1.6):
    i = np.arange(n)
    y = 1 - (i / (n - 1)) * 2
    r = np.sqrt(1 - y * y)
    th = math.pi * (3 - math.sqrt(5)) * i
    x, z = np.cos(th) * r, np.sin(th) * r
    t = np.clip((x + 1) * 0.3 + (1 - y) * 0.35, 0, 1)[:, None]
    col = np.where(t < 0.5, C1 + (C2 - C1) * (t * 2), C2 + (C3 - C2) * ((t - 0.5) * 2))
    return np.stack([x, y, z], 1) * radius, col / 255.0


def project(pts, spin, tilt=0.25, size=512, cam_z=6.4, fov=35):
    cy, sy = math.cos(spin), math.sin(spin)
    x = pts[:, 0] * cy + pts[:, 2] * sy
    z = -pts[:, 0] * sy + pts[:, 2] * cy
    y = pts[:, 1]
    ct, st = math.cos(tilt), math.sin(tilt)
    y, z = y * ct - z * st, y * st + z * ct
    depth = cam_z - z
    f = (size / 2) / math.tan(math.radians(fov) / 2)
    return size / 2 + x * f / depth, size / 2 - y * f / depth, depth, f


def render(n, spin, phase, size, mode, point=0.055):
    """mode: 'add' — аддитивное свечение (тёмная тема), 'over' — альфа (светлая/PNG)."""
    base, col = fib_sphere(n)
    bx, by, bz = base[:, 0], base[:, 1], base[:, 2]
    think = 0.5 + 0.5 * math.sin(phase)
    noise = np.sin(phase * 1.7 + by * 3.1 + bx * 2.3) * np.cos(phase * 1.3 + bz * 2.7)
    s = 1 + 0.05 * noise * (0.4 + think) + 0.025 * math.sin(phase)
    px, py, depth, f = project(base * s[:, None], spin, size=size)
    # как в three.js PointsMaterial(sizeAttenuation): диаметр = size * (H/2) / depth
    radius = np.maximum(point * (1 + 0.12 * think) * (size / 2) / depth * 0.5, 0.7)

    acc = np.zeros((size, size, 3))
    cov = np.zeros((size, size))
    k = int(math.ceil(radius.max() * 2.2)) + 1
    offs = np.arange(-k, k + 1)
    for dy in offs:
        for dx in offs:
            xi = np.round(px).astype(int) + dx
            yi = np.round(py).astype(int) + dy
            d2 = (xi - px) ** 2 + (yi - py) ** 2
            w = np.exp(-d2 / (2 * (radius * 0.75) ** 2))
            ok = (xi >= 0) & (xi < size) & (yi >= 0) & (yi < size) & (w > 0.01)
            np.add.at(acc, (yi[ok], xi[ok]), col[ok] * w[ok, None])
            np.add.at(cov, (yi[ok], xi[ok]), w[ok])

    if mode == "add":
        return np.clip(acc * 0.95, 0, 1)
    alpha = 1 - np.exp(-cov * 0.85)
    color = acc / np.maximum(cov[..., None], 1e-6)
    return color, alpha


def to_img(arr):
    return Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))


def composite(color, alpha, bg):
    bgv = np.array(bg) / 255.0
    return color * alpha[..., None] + bgv * (1 - alpha[..., None])


# ---------------------------------------------------------------- outputs
def sphere_png():
    color, alpha = render(6400, 0.6, 1.2, 900, "over", point=0.05)
    rgba = np.dstack([np.clip(color * 1.08, 0, 1), alpha])
    Image.fromarray((rgba * 255).astype(np.uint8), "RGBA").save(IMG / "sphere-static.png", optimize=True)
    print("✓ sphere-static.png")


def sphere_video(theme, size=540, fps=24, seconds=8):
    """Бесшовная петля: вращение на 360° и пульсация кратны длине ролика."""
    frames = fps * seconds
    tmp = Path(tempfile.mkdtemp())
    for i in range(frames):
        t = i / frames
        spin, phase = t * math.tau, t * math.tau * 3
        if theme == "dark":
            glow = render(1800, spin, phase, size, "add", point=0.07)
            img = composite(glow, np.clip(glow.max(-1) * 1.4, 0, 1), BG_DARK) + glow * 0.35
        else:
            color, alpha = render(1800, spin, phase, size, "over", point=0.07)
            img = composite(color, alpha * 0.9, BG_LIGHT)
        to_img(img).save(tmp / f"f{i:04d}.png")
        if i == 0:
            to_img(img).convert("RGB").save(VID / f"sphere-{theme}-poster.jpg", quality=82)
    out = VID / f"sphere-{theme}.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", str(tmp / "f%04d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow",
        "-movflags", "+faststart", "-an", str(out),
    ], check=True)
    # WebM (VP9) — для браузеров без H.264 (Chromium-сборки, часть Linux/Android)
    webm = VID / f"sphere-{theme}.webm"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", str(tmp / "f%04d.png"),
        "-c:v", "libvpx-vp9", "-b:v", "1050k", "-maxrate", "1200k", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an", str(webm),
    ], check=True)
    shutil.rmtree(tmp)
    for f in (out, webm):
        print(f"✓ {f.name}  {f.stat().st_size / 1024:.0f} КБ")


def load_font(name, px, wght):
    """woff2 → TrueType в памяти (Pillow не читает woff2 напрямую)."""
    font = TTFont(FONTS / name)
    font.flavor = None
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    f = ImageFont.truetype(buf, px)
    try:
        f.set_variation_by_axes([wght])
    except Exception:
        pass
    return f


class FontStack:
    """Субсеты Google Fonts разбиты по unicode-range: кириллица, латиница, цифры
    живут в разных файлах — подбираем файл для каждого символа."""

    def __init__(self, family, px, wght):
        self.fonts = []
        for sub in ("cyrillic", "latin", "latin-ext", "cyrillic-ext"):
            path = FONTS / f"{family}-{sub}.woff2"
            cmap = TTFont(path).getBestCmap()
            self.fonts.append((cmap, load_font(path.name, px, wght)))

    def pick(self, ch):
        for cmap, f in self.fonts:
            if ord(ch) in cmap:
                return f
        return self.fonts[0][1]

    def draw(self, d, xy, text, fill):
        x, y = xy
        for ch in text:
            f = self.pick(ch)
            d.text((x, y), ch, font=f, fill=fill)
            x += f.getlength(ch)


def og_image():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG_DARK)
    glow = Image.new("RGB", (W, H), BG_DARK)
    d = ImageDraw.Draw(glow)
    d.ellipse((640, 40, 1180, 580), fill=(58, 40, 130))
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(120)), 0.9)
    color, alpha = render(4200, 0.5, 1.0, 560, "over", point=0.05)
    sph = Image.fromarray((np.dstack([color, alpha]) * 255).astype(np.uint8), "RGBA")
    img.paste(sph, (640, 35), sph)
    d = ImageDraw.Draw(img)
    head = FontStack("unbounded", 64, 800)
    body = FontStack("onest", 28, 400)
    d.ellipse((72, 72, 104, 104), fill=(124, 92, 255))
    FontStack("unbounded", 34, 700).draw(d, (120, 70), "Nova", (242, 242, 247))
    head.draw(d, (72, 210), "Ваша команда.", (242, 242, 247))
    head.draw(d, (72, 290), "В 10 раз", (242, 242, 247))
    head.draw(d, (72, 370), "быстрее.", (61, 214, 255))
    body.draw(d, (72, 490), "AI-ассистент для команд · 14 дней бесплатно", (138, 138, 158))
    img.save(IMG / "og-image.png", optimize=True)
    print("✓ og-image.png")


def icons():
    for s in (180, 192, 512):
        im = Image.new("RGBA", (s * 4, s * 4), BG_DARK + (255,))
        grad = np.zeros((s * 4, s * 4, 3))
        xs = np.linspace(0, 1, s * 4)[None, :, None]
        ys = np.linspace(0, 1, s * 4)[:, None, None]
        t = np.clip((xs + ys) / 2, 0, 1)
        grad = np.where(t < 0.5, C1 + (C2 - C1) * (t * 2), C2 + (C3 - C2) * ((t - 0.5) * 2)) / 255
        mask = Image.new("L", im.size, 0)
        ImageDraw.Draw(mask).ellipse((s * 0.9, s * 0.9, s * 3.1, s * 3.1), fill=255)
        im.paste(to_img(grad), (0, 0), mask)
        name = "apple-touch-icon.png" if s == 180 else f"icon-{s}.png"
        im.resize((s, s), Image.LANCZOS).convert("RGB").save(IMG / name, optimize=True)
    print("✓ icons")


if __name__ == "__main__":
    IMG.mkdir(parents=True, exist_ok=True)
    VID.mkdir(parents=True, exist_ok=True)
    icons()
    sphere_png()
    og_image()
    sphere_video("dark")
    sphere_video("light")
