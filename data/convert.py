#!/usr/bin/env python3
"""
CricketXI Data Converter
Converts raw ESPNcricinfo wickets/runs JSON to clean normalized format.

Usage:
  python3 convert.py --type wickets --input raw/wickets/ --output top-performers/wickets/
  python3 convert.py --type runs    --input raw/runs/    --output top-performers/runs/
"""

import json
import argparse
from pathlib import Path


def get_table(raw: dict) -> dict:
    """Extract the first table from any known ESPNcricinfo raw format."""
    if 'tables' in raw:
        return raw['tables'][0]
    elif 'content' in raw and 'tables' in raw['content']:
        return raw['content']['tables'][0]
    else:
        raise KeyError(f"Cannot find 'tables' in JSON. Top-level keys: {list(raw.keys())}")


def convert_wickets(raw: dict, team_code: str) -> dict:
    table = get_table(raw)
    team = table.get('team', team_code).upper()

    players = []
    for row in table['rows']:
        items = row['items']
        players.append({
            "Rank":   row['rank'],
            "Player": items[0]['value'],
            "Link":   items[0]['link'],
            "Span":   items[2]['value'],
            "Mat":    items[3]['value'],
            "Inns":   items[4]['value'],
            "Balls":  items[5]['value'],
            "Overs":  items[6]['value'],
            "Mdns":   items[7]['value'],
            "Runs":   items[8]['value'],
            "Wkts":   items[9]['value'],
            "BBI":    items[10]['value'],
            "Ave":    items[11]['value'],
            "Econ":   items[12]['value'],
            "SR":     items[13]['value'],
            "4w":     items[14]['value'],
            "5w":     items[15]['value'],
            "10w":    items[16]['value'],
        })

    return {"team": team, "stat": "Most Wickets", "players": players}


def convert_runs(raw: dict) -> dict:
    """Runs JSONs are already clean — just ensure Link field exists."""
    for player in raw.get('players', []):
        if 'Link' not in player:
            player['Link'] = None
    return raw


def get_team_code(filename: str) -> str:
    return Path(filename).stem.upper()


def process_directory(input_dir: str, output_dir: str, stat_type: str):
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    files = sorted(input_path.glob('*.json'))
    if not files:
        print(f"No JSON files found in {input_dir}")
        return

    success, failed = 0, 0

    for file in files:
        team_code = get_team_code(file.name)
        try:
            with open(file) as f:
                raw = json.load(f)

            if stat_type == 'wickets':
                result = convert_wickets(raw, team_code)
            elif stat_type == 'runs':
                result = convert_runs(raw)

            out_file = output_path / file.name
            with open(out_file, 'w') as f:
                json.dump(result, f, indent=2)

            count = len(result['players'])
            print(f"✓ {team_code:6} → {out_file}  ({count} players)")
            success += 1

        except Exception as e:
            print(f"✗ {team_code:6} → FAILED: {e}")
            failed += 1

    print(f"\nDone: {success} converted, {failed} failed")


def main():
    parser = argparse.ArgumentParser(description='CricketXI Data Converter')
    parser.add_argument('--type',   required=True, choices=['runs', 'wickets'])
    parser.add_argument('--input',  required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    print(f"Converting {args.type}: {args.input} → {args.output}\n")
    process_directory(args.input, args.output, args.type)


if __name__ == '__main__':
    main()
