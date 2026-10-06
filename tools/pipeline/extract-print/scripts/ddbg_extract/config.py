"""Static configuration: which core-box PDFs are read, and how they map to categories.

Every PDF under the core-box print folder is listed exactly once, either in SOURCES (text-bearing,
extracted) or in TEXT_FREE (manual-entry items, listed in the report only). run_all.py fails if a
PDF in the folder is not covered by either list, so new/renamed files cannot be silently skipped.
"""
from pathlib import Path

PRINT_ROOT = Path("/workspace/ddbg-print/DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print")
OUT_ROOT = Path(__file__).resolve().parents[2]          # /workspace/ddbg-extract
EXTRACTOR_VERSION = "1.0.4"
C = "02_DD_CARDS_COREBOX/"
A = "00_ADD_014_CORE/"

# kind: "card" = one card per page (front/back paired by page number)
#       "sheet" = non-card component (board, punchboard sheet, tile, save sheet, letter)
# source_set: "base" = main core-box print files; "ADD_014" = files in 00_ADD_014_CORE (addendum)
SOURCES = [
    # category,          front file,                                              back file (or None),                                   kind,   source_set
    ("hero_skill",       C+"DD_EN_COREBOX_CARDS_44x68_SKILLS_FRONT.pdf",           C+"DD_EN_COREBOX_CARDS_44x68_SKILLS_BACK.pdf",           "card", "base"),
    ("hero_stat",        C+"DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf",      C+"DD_EN_COREBOX_CARDS_100x180_Hero_STAT_BACK.pdf",      "card", "base"),
    ("hero_pvp",         C+"DD_EN_COREBOX_CARDS_100_180_Hero_PVP_FRONT.pdf",       C+"DD_EN_COREBOX_CARDS_100_180_Hero_PVP_BACK.pdf",       "card", "base"),
    ("hero_pvp",         A+"DD_EN_COREBOX_CARDS_100_180_Hero_PVP_FRONT_ADD.pdf",   A+"DD_EN_COREBOX_CARDS_100_180_Hero_PVP_BACK_ADD.pdf",   "card", "ADD_014"),
    ("monster_medium",   C+"DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf", C+"DD_EN_COREBOX_CARDS_70_120_monsters_medium_BACK.pdf", "card", "base"),
    ("monster_medium",   A+"DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT_ADD.pdf", A+"DD_EN_COREBOX_CARDS_70_120_monsters_medium_BACK_ADD.pdf", "card", "ADD_014"),
    ("monster_large",    C+"DD_EN_COREBOX_CARDS_140x140_monster_large_FRONT.pdf",  C+"DD_EN_COREBOX_CARDS_140x140_monster_large_BACK.pdf",  "card", "base"),
    ("boss_ability",     C+"DD_EN_COREBOX_CARDS_70_120_Boss_Abilities_FRONT.pdf",  C+"DD_EN_COREBOX_CARDS_70_120_Boss_Abilities_BACK.pdf",  "card", "base"),
    ("trinket",          C+"DD_EN_COREBOX_CARDS_44x68_TRINKETS_FRONT.pdf",         C+"DD_EN_COREBOX_CARDS_44x68_TRINKETS_BACK.pdf",         "card", "base"),
    ("curio",            C+"DD_EN_COREBOX_CARDS_63x88_CURIO_FRONT_V2.pdf",         C+"DD_EN_COREBOX_CARDS_63x88_CURIO_BACK.pdf",            "card", "base"),
    ("room",             C+"DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",            C+"DD_EN_COREBOX_CARDS_63x88_rooms_BACK.pdf",            "card", "base"),
    ("stygian_room",     C+"DD_EN_COREBOX_CARDS_63x88_rooms_Stygian_FRONT.pdf",    C+"DD_EN_COREBOX_CARDS_63x88_rooms_Stygian_BACK.pdf",    "card", "base"),
    ("quest",            C+"DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf",          C+"DD_EN_COREBOX_CARDS_70_120_quests_BACK.pdf",          "card", "base"),
    ("hamlet_event",     C+"DD_EN_COREBOX_CARDS_70x120_Hamelt_Events_FRONT.pdf",   C+"DD_EN_COREBOX_CARDS_70x120_Hamelt_Events_BACK.pdf",   "card", "base"),
    ("quirk",            C+"DD_EN_COREBOX_CARDS_44x68_Quirks_FRONT.pdf",           C+"DD_EN_COREBOX_CARDS_44x68_Quirks_BACK.pdf",           "card", "base"),
    ("disease",          C+"DD_EN_COREBOX_CARDS_44x68_Disease_FRONT.pdf",          C+"DD_EN_COREBOX_CARDS_44x68_Disease_BACK.pdf",          "card", "base"),
    ("virtue_affliction",C+"DD_EN_COREBOX_CARDS_44x68_virtue_afflictions_FRONT.pdf", C+"DD_EN_COREBOX_CARDS_44x68_virtue_afflictions_BACK.pdf", "card", "base"),
    ("player_aid",       C+"DD_EN_COREBOX_CARDS_70_120_PLAYER_AIDS_FRONT.pdf",     C+"DD_EN_COREBOX_CARDS_70_120_PLAYER_AIDS_BACK.pdf",     "card", "base"),
    # non-card components that carry text
    ("save_sheet",       "DD_EN_COREBOX_SAVE_SHEET.pdf",                           None,                                                    "sheet", "base"),
    ("letter",           "DD_EN_COREBOX_LETTER.pdf",                               None,                                                    "sheet", "base"),
    ("hamlet_board",     "DD_EN_COREBOX_BOARD_Hamlet_FRONT.pdf",                   "DD_EN_COREBOX_BOARD_Hamlet_BACK.pdf",                   "sheet", "base"),
    ("punchboard_300x300","DD_EN_COREBOX_PUNCHBOARD_300x300_FRONT.pdf",            "DD_EN_COREBOX_PUNCHBOARD_300x300_BACK.pdf",             "sheet", "base"),
    ("punchboard_200x300","DD_EN_COREBOX_PUNCHBOARD_200x300_FRONT_V2.pdf",         "DD_EN_COREBOX_PUNCHBOARD_200x300_BACK_V2.pdf",          "sheet", "base"),
    ("punchboard_130x106",A+"DD_EN_COREBOX_PUNCHBOARD_130x106_FRONT.pdf",          A+"DD_EN_COREBOX_PUNCHBOARD_130x106_BACK.pdf",           "sheet", "ADD_014"),
    ("dungeon_tile",     "DD_COREBOX_TILES_FRONT.pdf",                             "DD_COREBOX_TILES_BACK.pdf",                             "sheet", "base"),
]

# Categories whose icons are included in the card-icon annotation workload numbers.
CARD_CATEGORIES = [s[0] for s in SOURCES if s[3] == "card"]

# PDFs with no extractable text (outlined/bitmap only) -> manual entry. (file, label, note)
TEXT_FREE = [
    (C+"DD_EN_COREBOX_CARDS_44x68_Initiative_FRONT.pdf", "initiative", "8 initiative cards; no text (bitmap/outlines)"),
    (C+"DD_EN_COREBOX_CARDS_44x68_Initiative_BACK.pdf", "initiative", "backs"),
    (C+"DD_COREBOX_CARDS_193x203_QuestMap_FRONT.pdf", "quest_map", "14 quest map cards; no text"),
    (C+"DD_COREBOX_CARDS_193x203_QuestMap_BACK.pdf", "quest_map", "backs"),
    ("01_DD_DICE_COREBOX/DD_COREBOX_DICE_D10_Death_Door.pdf", "dice_net", "D10 death's door die net; vector only"),
    ("01_DD_DICE_COREBOX/DD_COREBOX_DICE_D10_Number.pdf", "dice_net", "D10 number die net; vector only"),
    ("01_DD_DICE_COREBOX/DD_COREBOX_DICE_D6_Exploration.pdf", "dice_net", "D6 exploration die net; vector only"),
    ("01_DD_DICE_COREBOX/DD_COREBOX_DICE_D6_Provision.pdf", "dice_net", "D6 provision die net; vector only"),
    ("DD_COREBOX_BOARD_Monster_Stance_FRONT.pdf", "stance_board", "monster stance tracker; single bitmap"),
    ("DD_COREBOX_BOARD_Monster_Stance_BACK.pdf", "stance_board", "back"),
    ("DD_COREBOX_DASHBOARD_Hero_FRONT_V2.pdf", "hero_dashboard", "4 hero dashboards; single bitmap each"),
    ("DD_COREBOX_DASHBOARD_Hero_BACK.pdf", "hero_dashboard", "backs"),
    ("DD_COREBOX_PUNCHBOARD_130x60_FRONT.pdf", "punchboard_130x60", "token sheet; no text"),
    ("DD_COREBOX_PUNCHBOARD_130x60_BACK.pdf", "punchboard_130x60", "back"),
    ("DD_COREBOX_Paper_Insert_01.pdf", "paper_insert", "box insert artwork; not game data"),
    ("DD_COREBOX_Paper_Insert_02.pdf", "paper_insert", "box insert artwork; not game data"),
]

# Rulebook component list (DD_EN_COREBOX_RULES, "Components" spread; see ddbg-src/para/DD_EN_COREBOX_RULES.txt
# lines ~168-427).  Values are card counts as printed.
RULEBOOK_COMPONENTS = {
    "Hero Skill Cards": 231, "Hero Cards": 23, "Hero PvP Cards": 22, "Monster & Boss Cards": 168,
    "Trinkets": 38, "Positive Quirks": 17, "Negative Quirks": 18, "Curio Cards": 24, "Hamlet Events": 16,
    "Quest Cards": 19, "Diseases": 11, "Virtues": 5, "Afflictions": 5, "Room Cards": 17,
    "Boss Room Cards": 8, "Stygian Room Cards": 17, "Player Aid Cards": 8, "Initiative Cards": 8,
}

# Geometry thresholds (PDF points, 1pt = 1/72 in)
ICON_MAX_SIDE = 60.0      # elements larger than this on either side are art/background, not icon layers
ICON_MAX_AREA = 45.0 * 45.0
MIN_VEC_SIDE = 1.2        # ignore hairline vectors
RENDER_ZOOM = 4.0         # px per pt for icon signature renders
