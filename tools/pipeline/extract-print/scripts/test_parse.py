"""Offline parser regression: read existing raw JSON; no PDF assets required."""
import json
from pathlib import Path
import unittest
from ddbg_extract.parse import parse_hero_skill, parse_monster

ROOT = Path(__file__).resolve().parents[4]

class StatsLineTest(unittest.TestCase):
    def test_madman_accusation_is_a_separate_monster_skill(self):
        raw = json.loads((ROOT / "packages/data/extract/corebox/raw/monster_medium.json").read_text(encoding="utf-8"))
        card = next(c for c in raw["cards"] if c["id"] == "monster_medium:p043")
        parsed = parse_monster(card)
        self.assertEqual([(s["slot"], s["name"]) for s in parsed["skills"]], [(1, "Doomsay"), (2, "Accusation")])
        first, second = parsed["skills"]
        self.assertEqual((first["crit"], first["crit_value"], first["acc"], first["acc_value"]), (0, 1, 10, 0))
        self.assertEqual((second["crit"], second["crit_value"], second["acc"], second["acc_value"]), (0, 2, 10, 1))
        self.assertTrue(any("+1" in line for line in first["effect_lines_raw"]))
        self.assertFalse(any("+2" in line for line in first["effect_lines_raw"]))
        self.assertTrue(any("+2" in line for line in second["effect_lines_raw"]))
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
