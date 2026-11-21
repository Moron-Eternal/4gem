#!/usr/bin/env python3
"""
Packages packs/BP and packs/RP into a ready-to-install Minecraft Bedrock .mcaddon archive:
    dist/Auralis_Firmament.mcaddon

Double-clicking a .mcaddon file on Windows, macOS, iOS, or Android imports both the
Behavior Pack and Resource Pack directly into Minecraft: Bedrock Edition!
"""

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
DIST.mkdir(parents=True, exist_ok=True)
OUT_PATH = DIST / "Auralis_Firmament.mcaddon"


def add_dir_to_zip(zf: zipfile.ZipFile, src_dir: Path, prefix: str):
    count = 0
    for p in sorted(src_dir.rglob("*")):
        if p.is_file():
            arc = f"{prefix}/{p.relative_to(src_dir).as_posix()}"
            # Store already-compressed .ogg/.png efficiently; deflate JSON/JS/lang
            comp = zipfile.ZIP_STORED if p.suffix.lower() in (".ogg", ".png") else zipfile.ZIP_DEFLATED
            zf.write(p, arcname=arc, compress_type=comp)
            count += 1
    return count


def main():
    with zipfile.ZipFile(OUT_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        n_bp = add_dir_to_zip(zf, ROOT / "packs" / "BP", "Auralis_BP")
        n_rp = add_dir_to_zip(zf, ROOT / "packs" / "RP", "Auralis_RP")
    mb = OUT_PATH.stat().st_size / (1024 * 1024)
    print(f"Built {OUT_PATH.relative_to(ROOT)} ({mb:.2f} MB) — {n_bp} BP files + {n_rp} RP files!")


if __name__ == "__main__":
    main()
