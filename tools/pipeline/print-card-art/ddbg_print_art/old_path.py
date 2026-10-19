"""Detect Kyries 'old' print paths for `_old` PNG suffix."""

from __future__ import annotations

import re

_OLD_SEGMENT = re.compile(
    r"^(old|old_version|oldversion)$",
    re.IGNORECASE,
)


def normalize_segment(segment: str) -> str:
    return segment.lower().replace("-", "_").replace(" ", "_")


def is_old_path(relative_path: str) -> bool:
    parts = relative_path.replace("\\", "/").split("/")
    for part in parts:
        if _OLD_SEGMENT.match(normalize_segment(part)):
            return True
    return False
