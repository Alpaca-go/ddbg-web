# Phase 4 · 战斗怪物卡面 atlas 切片（美术刀 D）

状态：**首刀**——战斗界面可在本地缓存存在时为站位轨道上的怪物实体与怪物回合侧栏显示 TTS 怪物卡 Face atlas 切格；无缓存时占位并保留文字芯片。美术二进制不入库。

## 与已合 PR 边界

| PR                                                     | 内容                   | 本刀关系                                                                                                   |
| ------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| [#249](https://github.com/Alpaca-go/ddbg-web/pull/249) | 英雄技能 Face          | 复用 `CardFace` / `resolve-card-art` 的 atlas CSS 与 `face-<deckId>` 缓存命名                              |
| [#250](https://github.com/Alpaca-go/ddbg-web/pull/250) | 探索 QuestMap / 房间牌 | 无重叠                                                                                                     |
| [#251](https://github.com/Alpaca-go/ddbg-web/pull/251) | 站位色条 + 英雄 token  | 同屏 `BattleStanceTrack`；色条 / token 不变；`battle-position-art-map` 的 `Large 1-2` 仍未绑 `stanceSlots` |

## 权威美术来源

- Steam Workshop TTS 存档 JSON（Workshop id `3657612854`）。
- `Darkest Dungeon/Monsters Cards` 下 `CustomDeck.FaceURL`（核心盒 deck **460** / **461** / **466**）。
- **不用**印刷 PDF；**不**热链 Steam CDN。

## 已映射

- **36** 张核心盒 `monster_medium` / `monster_large` 引擎 id → TTS nickname + atlas `deckId` + `cell`。
- 含 `battle-data` 试玩池全部 20 种怪物卡 id。
- 映射文件：`apps/web/src/card-art/monster-face-art-map.json`。

重生成：

```bash
node tools/pipeline/scripts/build-tts-monster-face-art-map.mjs \
  --tts /path/to/3657612854.json
```

## 本地缓存

```bash
node tools/pipeline/scripts/cache-tts-card-art.mjs
```

在既有 hero / exploration / battle-position 下载基础上，增加 `face-460` / `face-461` / `face-466`（及对应 back 表）。

## UI 接入面

- `BattleStanceTrack`：怪物实体芯片左侧 `MonsterCardFace`（`chip` 尺寸）。
- `BattleView` 怪物回合：侧栏 `MonsterCardFace`（`md`）+ 原有 `SkillCardText`。
- 试玩：`/?phase=2` 战斗沙盒；`/?phase=3&play=1` 进战斗后查看站位轨道与怪物回合。

## 待确认（`pendingConfirmation` 摘要）

- Boss / 收藏家 / 先祖战 / Stygian 等 **无 TTS Monsters Cards 昵称** 的条目未映射。
- `monster_medium:p078` Flesh Hound：TTS 同昵称多 cell，启发式未唯一选定 → 未入 map。
- cell 与印刷 FRONT 页码对齐仅作 nickname / level / page 启发式，未逐页目视核对。
- `monsterWidthArt`（`Large 1-2` 色条）仍在 `battle-position-art-map.json`，未与宽体怪 `stanceSlots` 绑定。
- Warrens / Weald / Cove / CC / CoM 扩展怪物 deck 不在核心盒切片。

## 范围外

战斗 Room Tile 整板、走廊 Tile、站位支援行 TTS 图、印刷 PDF 几何、Phase 5 Boss 全量管线。
