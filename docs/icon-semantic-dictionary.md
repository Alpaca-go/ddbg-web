# 全局图标语义目录 v1

本目录是图标审阅与查阅用的生成文件。它按语义 key 汇总历史词典和补充印刷映射。引擎按卡牌的结构化规则结算，精确卡面校验继续使用已有的印刷索引。

## 为什么要有它

现有词典是 **iconId 为中心**：同一语义图标在不同卡面会得到多个 hash，例如：

- `bleed`：19 个 iconId；
- `buff`：17 个；
- `stress`：13 个；
- `debuff`：13 个。

如果每次新卡都按 hash 重新裁定，就会出现“同一图标后面跟着一大批图形”的维护问题。语义词典把裁定收敛到 **key**：

- `key`：全局语义（唯一）；
- `aliases`：该语义在不同卡面上的 iconId；
- `variants`：同一 key 下的不同卡面措辞（不改变语义）。

## 当前规模

历史快照 `icon-dictionary-v1.8.json` 的统计：

- **116 个语义 key**；
- **844 个 alias（iconId）**；
- 排除 `unknown_*` / `pending_*`（138 个 unreviewed，仍按 R-048 保留原始 ID）；
- 装饰类 key（`decor`、`skill_art`、`trinket_picture`、`hero_portrait` 等）保留在词典中，用 `kind/status` 区分，不当作规则语义。

## 文件结构

`packages/data/dictionary/icon-semantics-v1.json`：

```json
{
  "schema": "ddbg-icon-semantics-v1",
  "source": "dictionary/icon-dictionary-v1.8.json",
  "keyCount": 116,
  "aliasCount": 844,
  "keys": [
    {
      "key": "bleed",
      "nameEn": "Bleed",
      "nameZh": "流血",
      "kind": "status",
      "status": "confirmed",
      "aliases": ["784ec4fe7a", "..."],
      "variants": [{ "iconId": "...", "nameEn": "Bleed (large)", "nameZh": "流血（大）" }]
    }
  ]
}
```

## 维护口径

1. **裁定绑 key，不绑 hash**
   - 新 hash 先尝试归入已有 key；
   - 归入后在 `print-icon-additions.json` 追加核准词条，再生成 `aliases`；
   - 只有新语义才新建 key。

2. **新批次流程**
   - 提取 → 查 `icon-semantics-v1.json`；
   - 已在 aliases：直接复用；
   - 视觉相同但未收录：人工确认后作为 alias 加入；
   - 语义不同：新建 key，登记 Q/R；
   - 装饰/插画：标 `kind: decor` 或 `status: decor`，不进效果词典。

3. **不要自动合并**
   - 相似 hash 只能作为候选，不能自动确认；
   - 同形不同义（如 Mark 与技能编号）按卡、面和段位记录例外。

4. **与 rulings 的关系**
   - `docs/rulings.md` 记 key 级结论；
   - 具体 hash 只作为 key 的 alias 记录，避免每批重复写裁定。

## 生成

```bash
node tools/pipeline/scripts/build-icon-semantics.mjs
```

脚本读取 `icon-dictionary-v1.8.json` 和 `print-icon-additions.json`，输出 `icon-semantics-v1.json`。追加同义图样时保留旧条目的标准名称。`pnpm lint` 检查生成结果是否同步。

## 校验

`packages/data/tests/shared/dictionary/semantics.test.ts` 校验：

- key 唯一；
- 每个 alias 都存在于旧版词典或补充映射，且回指同一 key；
- alias 不跨 key 重复；
- 生成文件逐项覆盖两份来源中的已命名映射。
