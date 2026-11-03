"""
Merge lat/lon from OurAirports (davidmegginson/ourairports-data) into Airport_Data_Wiki.csv.
Run from repo root: python scripts/enrich_airport_csv.py
"""

from __future__ import annotations

import csv
import re
import sys
import urllib.request
from pathlib import Path

OURAIRPORTS_CSV = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv"
WIKI_REL = Path("frontend/src/assets/Airport_Data_Wiki.csv")
ROLES = frozenset({"P-L", "P-M", "P-S", "P-N"})


def clean_iata(raw: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]", "", raw or "").upper()
    return s[:3] if len(s) >= 3 else ""


def clean_icao(raw: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]", "", raw or "").upper()
    return s[:4] if len(s) >= 4 else s


def load_ourairports_lookup(url: str) -> tuple[dict[str, tuple[float, float]], dict[str, tuple[float, float]]]:
    by_ident: dict[str, tuple[float, float]] = {}
    by_iata: dict[str, tuple[float, float]] = {}
    with urllib.request.urlopen(url, timeout=120) as resp:  # noqa: S310
        text = resp.read().decode("utf-8", errors="replace")
    reader = csv.DictReader(text.splitlines())
    for row in reader:
        ident = (row.get("ident") or "").strip().upper()
        iata = (row.get("iata_code") or "").strip().upper()
        try:
            lat = float(row["latitude_deg"])
            lon = float(row["longitude_deg"])
        except (KeyError, TypeError, ValueError):
            continue
        if ident:
            by_ident[ident] = (lat, lon)
        if iata and len(iata) == 3:
            by_iata.setdefault(iata, (lat, lon))
    return by_ident, by_iata


def resolve_coords(
    icao: str,
    iata: str,
    by_ident: dict[str, tuple[float, float]],
    by_iata: dict[str, tuple[float, float]],
) -> tuple[float, float] | None:
    ic = clean_icao(icao)
    ia = clean_iata(iata)
    if ic and ic in by_ident:
        return by_ident[ic]
    if ia and ia in by_iata:
        return by_iata[ia]
    return None


def pad_row(row: list[str], width: int) -> list[str]:
    out = row[:width]
    while len(out) < width:
        out.append("")
    return out


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    wiki_path = root / WIKI_REL
    if not wiki_path.is_file():
        print(f"Missing {wiki_path}", file=sys.stderr)
        return 1

    print("Downloading OurAirports airports.csv …")
    by_ident, by_iata = load_ourairports_lookup(OURAIRPORTS_CSV)

    with wiki_path.open(newline="", encoding="utf-8", errors="replace") as f:
        rows_in = list(csv.reader(f, delimiter="\t"))

    if not rows_in:
        print("Empty wiki CSV", file=sys.stderr)
        return 1

    header = rows_in[0]
    if "Lat" not in header or "Lng" not in header:
        header = header + ["Lat", "Lng"]
    lat_idx = header.index("Lat")
    lng_idx = header.index("Lng")
    width = len(header)

    out_rows: list[list[str]] = [header]
    missing: list[str] = []
    filled = 0

    for parts in rows_in[1:]:
        row = pad_row(parts, width)
        role = (row[5] if len(row) > 5 else "").strip()

        if role not in ROLES:
            row[lat_idx] = ""
            row[lng_idx] = ""
            out_rows.append(row)
            continue

        iata_raw = row[2] if len(row) > 2 else ""
        icao_raw = row[3] if len(row) > 3 else ""
        city = row[0] if row else ""
        coords = resolve_coords(icao_raw, iata_raw, by_ident, by_iata)

        if coords:
            row[lat_idx] = f"{coords[0]:.6f}"
            row[lng_idx] = f"{coords[1]:.6f}"
            filled += 1
        else:
            row[lat_idx] = ""
            row[lng_idx] = ""
            missing.append(f"{clean_iata(iata_raw) or '?'} / {clean_icao(icao_raw) or '?'} ({city})")

        out_rows.append(row)

    with wiki_path.open("w", newline="", encoding="utf-8") as f:
        csv.writer(f, delimiter="\t", lineterminator="\n").writerows(out_rows)

    print(f"Wrote {wiki_path}")
    print(f"Airport rows with coordinates: {filled}")
    if missing:
        print(f"Missing coordinates ({len(missing)}):", file=sys.stderr)
        for m in missing[:40]:
            print(f"  {m}", file=sys.stderr)
        if len(missing) > 40:
            print(f"  … and {len(missing) - 40} more", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
