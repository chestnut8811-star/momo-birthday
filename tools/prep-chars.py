#!/usr/bin/env python3
"""Codex で作ったキャラクターの PNG（family-only/_gen/out/）を、アプリ用の WebP（app/img/chars/）にする。
透明な背景は保ったまま、中身のある範囲に切り詰めて縮小する。
使い方: python3 tools/prep-chars.py
"""
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'family-only' / '_gen' / 'out'
DST = ROOT / 'app' / 'img' / 'chars'
# 生成名 -> (アプリでの名前, 長辺の最大ピクセル)
TARGETS = {
    'queen_main': ('queen_main', 1100),
    'queen_cheer': ('queen_cheer', 1100),
    'bunny': ('bunny', 640),
    'reindeer': ('reindeer', 640),
}


def main():
    DST.mkdir(parents=True, exist_ok=True)
    missing = []
    for src_name, (dst_name, max_side) in TARGETS.items():
        src = SRC / f'{src_name}.png'
        if not src.exists():
            missing.append(src_name)
            continue
        im = Image.open(src).convert('RGBA')
        alpha = im.getchannel('A').point(lambda a: 255 if a > 12 else 0)
        box = alpha.getbbox() or (0, 0, im.width, im.height)
        pad = round(max(box[2] - box[0], box[3] - box[1]) * 0.02)
        box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
        im = im.crop(box)
        k = min(1.0, max_side / max(im.size))
        if k < 1:
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        out = DST / f'{dst_name}.webp'
        im.save(out, 'WEBP', quality=86, method=6, alpha_quality=90)
        print(f'{dst_name:12s} {im.size[0]}x{im.size[1]}  {out.stat().st_size // 1024} KB')
    if missing:
        print('まだない:', ', '.join(missing), file=sys.stderr)


if __name__ == '__main__':
    main()
