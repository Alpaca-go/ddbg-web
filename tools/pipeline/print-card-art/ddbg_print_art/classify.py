"""Infer print category and card face from PDF relative path / filename."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

# Filename tokens → engine data category (aligned with extract-print config.py)
_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"monsters_medium", re.I), "monster_medium"),
    (re.compile(r"monster_large", re.I), "monster_large"),
    (re.compile(r"Boss_Abilities", re.I), "boss_ability"),
    (re.compile(r"SKILLS", re.I), "hero_skill"),
    (re.compile(r"Hero_STAT", re.I), "hero_stat"),
    (re.compile(r"Hero_PVP", re.I), "hero_pvp"),
    (re.compile(r"TRINKETS", re.I), "trinket"),
    (re.compile(r"CURIO", re.I), "curio"),
    (re.compile(r"rooms_Stygian", re.I), "stygian_room"),
    (re.compile(r"rooms", re.I), "room"),
    (re.compile(r"quests", re.I), "quest"),
    (re.compile(r"Hamelt_Events|Hamlet_Events", re.I), "hamlet_event"),
    (re.compile(r"Quirks", re.I), "quirk"),
    (re.compile(r"Disease", re.I), "disease"),
    (re.compile(r"virtue_afflictions", re.I), "virtue_affliction"),
    (re.compile(r"PLAYER_AIDS", re.I), "player_aid"),
    (re.compile(r"QuestMap", re.I), "quest_map"),
    (re.compile(r"Initiative", re.I), "initiative"),
    (re.compile(r"TILES", re.I), "dungeon_tile"),
    (re.compile(r"PUNCHBOARD", re.I), "punchboard"),
    (re.compile(r"BOARD_Hamlet", re.I), "hamlet_board"),
    (re.compile(r"DICE", re.I), "dice_net"),
    (re.compile(r"RULES", re.I), "rules"),
    (re.compile(r"SAVE_SHEET", re.I), "save_sheet"),
    (re.compile(r"LETTER", re.I), "letter"),
    (re.compile(r"DASHBOARD", re.I), "dashboard"),
]


@dataclass(frozen=True)
class PdfKind:
    category: Optional[str]
    side: Optional[str]  # "front" | "back" | None


def classify_pdf(relative_path: str) -> PdfKind:
    name = relative_path.replace("\\", "/").split("/")[-1]
    side: Optional[str] = None
    upper = name.upper()
    if "_FRONT" in upper or upper.endswith("_FRONT.PDF"):
        side = "front"
    elif "_BACK" in upper or upper.endswith("_BACK.PDF"):
        side = "back"
    category: Optional[str] = None
    for pat, cat in _PATTERNS:
        if pat.search(name):
            category = cat
            break
    return PdfKind(category=category, side=side)
