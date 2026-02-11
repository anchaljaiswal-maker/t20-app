
import json
import requests

URL = "https://cricket-xi-data.s3.us-west-2.amazonaws.com/competitions/230/players.json"
OUTPUT_FILE = "player-points.json"

def main():
    r = requests.get(URL, timeout=30)
    r.raise_for_status()
    data = r.json()

    result = {}

    for p in data.get("players", []):
        name = (
            p.get("fullname")
            or p.get("full_name")
            or p.get("name")
        )

        points = (
            p.get("points")
            or p.get("total_points")
            or p.get("fantasy_points")
            or 0
        )

        if name:
            result[name] = float(points)

    # Sort by points descending
    result = dict(sorted(result.items(), key=lambda x: x[1], reverse=True))

    with open(OUTPUT_FILE, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Updated {OUTPUT_FILE} with {len(result)} players")

if __name__ == "__main__":
    main()
