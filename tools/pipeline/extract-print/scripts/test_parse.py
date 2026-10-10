"""Offline parser regression: read existing raw JSON; no PDF assets required."""
import json
from pathlib import Path
import unittest
from ddbg_extract.parse import parse_hero_skill

ROOT = Path(__file__).resolve().parents[4]

class StatsLineTest(unittest.TestCase):
    def test_accusation_is_not_accuracy(self):
        raw = json.loads((ROOT / "packages/data/extract/corebox/raw/hero_skill.json").read_text(encoding="utf-8"))
        for card in raw["cards"]:
            if card["id"] not in ["hero_skill:p004", "hero_skill:p005", "hero_skill:p006"]:
                continue
            with self.subTest(card=card["id"]):
                parsed = parse_hero_skill(card)
                self.assertNotIn("Accusation", parsed["stats_line_raw"])
                crit, acc = {"hero_skill:p004": (0, 9), "hero_skill:p005": (0, 10), "hero_skill:p006": (1, 11)}[card["id"]]
                self.assertIn(f"Crit {crit}", parsed["stats_line_raw"])
                self.assertIn(f"Acc {acc}", parsed["stats_line_raw"])
                self.assertEqual(parsed["name"], "Zealous Accusation")

if __name__ == "__main__":
    unittest.main()
