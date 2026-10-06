"""Global perceptual clustering of composite icons across all files.

Each composite has a signature: 64-bit pHash of its clean render (art removed, text removed), a 2x2 RGB
mean grid (keeps colour/brightness, e.g. active vs dimmed stance icons) and its size in pt.
Greedy leader clustering over unique signatures, processed in a fixed order (count desc, then key),
so ids are deterministic for a given input set. iconId = sha1(leader signature)[:10].
"""
import hashlib
import numpy as np

T_PHASH = 10        # max Hamming distance (of 64 bits)
T_GRID = 22.0       # max mean abs difference of the 2x2 RGB grid (0-255)
T_SIZE_REL = 0.22   # max relative size difference (w and h separately)
T_SIZE_ABS = 1.5    # ... or absolute difference in pt, whichever is larger
T_PHASH_SCALEFREE = 6     # very close pHash ...
T_GRID_SCALEFREE = 14.0   # ... and colour: merge regardless of printed size (same aspect ratio)
T_SATF = 0.12       # max difference of saturated-pixel fraction
T_HUE = 0.6         # max L1 distance of hue histograms (when both have saturated pixels)


def sig_key(sig):
    g = ",".join(str(v // 8) for v in sig["grid"])
    hq = ",".join(str(int(v * 10)) for v in sig["hue"])
    return f"{sig['phash']}|{g}|{round(sig['w'])}x{round(sig['h'])}|{int(sig['satf'] * 20)}|{hq}"


def _popcount64(x):
    x = x - ((x >> np.uint64(1)) & np.uint64(0x5555555555555555))
    x = (x & np.uint64(0x3333333333333333)) + ((x >> np.uint64(2)) & np.uint64(0x3333333333333333))
    x = (x + (x >> np.uint64(4))) & np.uint64(0x0F0F0F0F0F0F0F0F)
    return ((x * np.uint64(0x0101010101010101)) >> np.uint64(56)).astype(np.int64)


def cluster(sigs):
    """sigs: list of signature dicts (one per occurrence). Returns list of iconIds (same order) and
    dict iconId -> leader signature."""
    keys = [sig_key(s) for s in sigs]
    uniq = {}
    for k, s in zip(keys, sigs):
        if k not in uniq:
            uniq[k] = [s, 0]
        uniq[k][1] += 1
    order = sorted(uniq, key=lambda k: (-uniq[k][1], k))
    L_ph = np.zeros(0, dtype=np.uint64)
    L_grid = np.zeros((0, 12), dtype=np.float64)
    L_wh = np.zeros((0, 2), dtype=np.float64)
    L_hue = np.zeros((0, 12), dtype=np.float64)
    L_sat = np.zeros(0, dtype=np.float64)
    leader_ids, leader_sig = [], {}
    key2id = {}
    for k in order:
        s = uniq[k][0]
        ph = np.uint64(int(s["phash"], 16))
        grid = np.array(s["grid"], dtype=np.float64)
        wh = np.array([s["w"], s["h"]], dtype=np.float64)
        hue = np.array(s["hue"], dtype=np.float64)
        sat = float(s["satf"])
        best = None
        if len(L_ph):
            ham = _popcount64(np.bitwise_xor(L_ph, ph))
            gd = np.abs(L_grid - grid).mean(axis=1)
            tol = np.maximum(T_SIZE_ABS, T_SIZE_REL * L_wh)
            sz = np.all(np.abs(L_wh - wh) <= tol, axis=1)
            sd = np.abs(L_sat - sat)
            hd = np.abs(L_hue - hue).sum(axis=1)
            both = (L_sat > 0.05) & (sat > 0.05)
            col = (sd <= T_SATF) & (~both | (hd <= T_HUE))
            # same design printed at another size: allowed when the match is very close
            close = (ham <= T_PHASH_SCALEFREE) & (gd <= T_GRID_SCALEFREE)
            ar = (L_wh[:, 0] / np.maximum(L_wh[:, 1], 0.01)) / max(wh[0] / max(wh[1], 0.01), 0.01)
            same_aspect = (ar > 0.85) & (ar < 1.18)
            ok = (((ham <= T_PHASH) & (gd <= T_GRID) & sz) | (close & same_aspect)) & col
            if ok.any():
                cand = np.where(ok)[0]
                score = ham[cand] * 4 + gd[cand]
                best = int(cand[np.argmin(score)])
        if best is None:
            iid = hashlib.sha1(k.encode()).hexdigest()[:10]
            leader_ids.append(iid)
            leader_sig[iid] = s
            L_ph = np.append(L_ph, ph)
            L_grid = np.vstack([L_grid, grid])
            L_wh = np.vstack([L_wh, wh])
            L_hue = np.vstack([L_hue, hue])
            L_sat = np.append(L_sat, sat)
            key2id[k] = iid
        else:
            key2id[k] = leader_ids[best]
    return [key2id[k] for k in keys], leader_sig
