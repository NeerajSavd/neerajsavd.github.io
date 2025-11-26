#!/usr/bin/env python3
"""
resize_photos.py

Walks the `Photography` folder recursively, resizes images to fit within
2048x2048 (if larger), and renames them sequentially starting from
`image_001` (preserving the original extension). The new images are
saved to a separate output directory.

Usage:
    python3 resize_photos.py --root Photos --output Resized_Images

Dependencies:
    pip install Pillow
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import List, Tuple, Optional

from PIL import Image, ImageOps, ExifTags
from datetime import datetime


IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp', '.gif'}


def collect_image_files(root: Path) -> List[Path]:
    files: List[Path] = []
    for p in root.rglob('*'):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
            files.append(p)
    files.sort()
    return files


# NEW helper: get timestamp (EXIF DateTimeOriginal preferred, fallback to file mtime)
def get_image_timestamp(path: Path) -> float:
    try:
        with Image.open(path) as im:
            try:
                exif = im._getexif() or {}
            except Exception:
                exif = {}
            if exif:
                for tag_id, val in exif.items():
                    tag = ExifTags.TAGS.get(tag_id, tag_id)
                    if tag == 'DateTimeOriginal' and isinstance(val, str):
                        try:
                            dt = datetime.strptime(val, "%Y:%m:%d %H:%M:%S")
                            return dt.timestamp()
                        except Exception:
                            # ignore parse errors and fallback to mtime
                            break
    except Exception:
        # fall through to file mtime on any error
        pass

    try:
        return path.stat().st_mtime
    except Exception:
        return 0.0


def compute_padding(total: int) -> int:
    return max(3, len(str(total)))


def resize_image_if_needed(img: Image.Image, max_size: Tuple[int, int]) -> Image.Image:
    width, height = img.size
    mw, mh = max_size
    if width <= mw and height <= mh:
        return img
    img = ImageOps.contain(img, max_size)
    return img


# MODIFIED FUNCTION
def process_images(
    files: List[Path], 
    max_size: Tuple[int, int], 
    output_dir: Path,  # NEW ARGUMENT
    dry_run: bool = False
) -> None:
    # sort files by date (oldest first)
    files_with_ts = [(f, get_image_timestamp(f)) for f in files]
    files_sorted = [f for f, _ in sorted(files_with_ts, key=lambda x: x[1])]
    total = len(files_sorted)
    pad = compute_padding(total)
    counter = 1

    # Ensure output directory exists
    if not dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)

    for src in files_sorted:
        # always use .jpg extension
        new_name = f"image_{str(counter).zfill(pad)}.jpg"
        dest = output_dir / new_name

        # show date in dry-run prints (optional)
        ts = get_image_timestamp(src)
        try:
            date_str = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            date_str = "unknown-date"

        print(f"[{counter}/{total}] {src} ({date_str}) -> {dest}")

        if dry_run:
            counter += 1
            continue

        try:
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im)

                # Convert palette mode upfront if necessary
                if im.mode == 'P':
                    im = im.convert('RGBA')

                # Resize if needed
                im_resized = resize_image_if_needed(im, max_size)

                # Flatten transparency and ensure RGB for JPEG
                needs_alpha = im_resized.mode in ('RGBA', 'LA') or im_resized.mode == 'P' or ('transparency' in im_resized.info)
                if needs_alpha:
                    rgba = im_resized.convert('RGBA')
                    bg = Image.new('RGB', rgba.size, (255, 255, 255))
                    bg.paste(rgba, mask=rgba.split()[-1])
                    im_to_save = bg
                else:
                    im_to_save = im_resized.convert('RGB')

                # Save as JPEG
                save_kwargs = dict(format='JPEG', quality=90, optimize=True)
                im_to_save.save(dest, **save_kwargs)

        except Exception as e:
            print(f"Error processing {src}: {e}")

        counter += 1


# MODIFIED FUNCTION
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='Resize and rename photos in a folder tree, saving to a new directory.')
    p.add_argument('--root', '-r', type=str, default='Photos', help='Root folder to process')
    p.add_argument('--output', '-o', type=str, default='Resized_Images', help='Output folder for resized images (must be different from root)')
    p.add_argument('--max-size', '-m', type=int, nargs=2, metavar=('WIDTH', 'HEIGHT'), default=(2048, 2048), help='Maximum width and height')
    p.add_argument('--dry-run', action='store_true', help='Show actions without modifying files')
    return p.parse_args()


# MODIFIED FUNCTION
def main() -> None:
    args = parse_args()
    root = Path(args.root)
    output_dir = Path(args.output)

    if not root.exists() or not root.is_dir():
        print(f"Root folder '{root}' not found or is not a directory.")
        return

    if root.resolve() == output_dir.resolve():
         print("Error: The root and output folders cannot be the same. Please choose a different output folder.")
         return

    files = collect_image_files(root)
    if not files:
        print(f"No images found under '{root}'.")
        return

    print(f"Found {len(files)} image(s). Padding: {compute_padding(len(files))} digits.")

    process_images(files, tuple(args.max_size), output_dir, dry_run=args.dry_run)
    print("Done.")


if __name__ == '__main__':
    main()