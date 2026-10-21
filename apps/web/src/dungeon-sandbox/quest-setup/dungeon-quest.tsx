import { useState } from "react";
import {
  createCoreDungeonQuest,
  FORMAL_HERO_NAMES,
  heroHasUnwiredCombatSkills,
} from "@ddbg/engine";
import type { QuestParty, DungeonState, FormalHeroName } from "@ddbg/engine";
import { battleData as questBattleData } from "virtual:quest-battle-data";
import { basicQuests } from "../../../../../packages/data/src/basic-quests";
import type { BasicQuestId } from "../../../../../packages/data/src/basic-quests";
import { CardFace } from "../../card-art/card-face";
import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { DungeonSandbox } from "../dungeon-sandbox";
import { QuestSaveControls } from "../quest-save-controls";
import { useDungeonStore } from "../store";
import { taskSources } from "../task-sources";
import { defaultPartyNames, formalPartySlot, stanceLabels } from "./formal-party";

export function DungeonQuest() {
  const beginTask = useDungeonStore((s) => s.beginTask);
  const [started, setStarted] = useState(false),
    [questId, setQuestId] = useState<BasicQuestId>("quest:p001"),
    [mode, setMode] = useState<DungeonState["mode"]>("standard"),
    [seed, setSeed] = useState("1"),
    [error, setError] = useState("");
  const [party, setParty] = useState<QuestParty>(() =>
    defaultPartyNames.map((name, index) => formalPartySlot(name, index)),
  );
  const partyNames = party.map(
    (hero) =>
      questBattleData.heroStats.find((s) => s.id === hero.heroStatId)!.name as FormalHeroName,
  );
  if (started) return <DungeonSandbox formal />;
  const startQuests = basicQuests.filter((q) => q.level === 1);
  const selectedQuest = startQuests.find((q) => q.id === questId) ?? startQuests[0]!;
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DDBG · PHASE 4</p>
          <h1>开局建队</h1>
          <p>正式八英雄开局四人 · I级遗迹 · 单设备1–4人轮流操作</p>
          <a href="/?view=battle">打开战斗沙盒</a>
        </div>
      </header>
      <section className="panel">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const game = createCoreDungeonQuest(
                Number(seed),
                selectedQuest.id,
                mode,
                party,
                taskSources,
              );
              beginTask(game, {
                seed: Number(seed),
                questId: selectedQuest.id,
                mode,
                party: party.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
              });
              setStarted(true);
            } catch (error) {
              setError(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          <label>
            任务卡
            <select
              aria-label="任务卡"
              value={selectedQuest.id}
              onChange={(e) => setQuestId(e.target.value as BasicQuestId)}
            >
              {startQuests.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </label>
          <div className="quest-start-card">
            <CoreboxPrintCardFace
              deck="quest"
              cardId={selectedQuest.id}
              label={selectedQuest.name}
              testId={`quest-card-face-${selectedQuest.id}`}
            />
          </div>
          <label>
            模式
            <select
              aria-label="任务模式"
              value={mode}
              onChange={(e) => setMode(e.target.value as DungeonState["mode"])}
            >
              <option value="standard">标准模式</option>
              <option value="radiant">Radiant</option>
            </select>
          </label>
          <label>
            种子
            <input
              aria-label="任务种子"
              type="number"
              min="0"
              max="4294967295"
              step="1"
              required
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          <p>
            QuestMap FRONT
            p1（已批准）。从起点S开始，房间代币按任务随机分布，先领取八颗开局补给。普通遗迹全部九面已接通。
          </p>
          <p>
            柴火休息 {selectedQuest.restPoints} 点。
            {selectedQuest.xpKind === "gold"
              ? "清理至少一间巢穴后，可每捐献20金币获得1XP，最多捐献60金币、获得3XP。"
              : `每清理${selectedQuest.roomsPerXp}${selectedQuest.xpKind === "lair" ? "间巢穴" : "个房间"}获得1XP，最多${selectedQuest.maxRooms / selectedQuest.roomsPerXp}XP。`}
            任务结算仅记待发XP，回村发放。
          </p>
          <p>
            可选身份共 {FORMAL_HERO_NAMES.length} 名（与替补白名单一致）。盗墓者 I 级七战斗技能与
            Pilfer 抽取已接（R-096、R-098：抽取不翻面）；神秘学者 I 级技能与 Dark Ritual
            未接线。可编队并装备已转录技能；未接线效果按 R-048 拒绝，不发明。
          </p>
          {party.map((hero, index) => {
            const name = partyNames[index]!;
            const gapLabel = heroHasUnwiredCombatSkills(name) ? "技能效果未接线" : "";
            const taken = new Set(partyNames.filter((_, i) => i !== index));
            return (
              <fieldset key={index}>
                <legend>
                  席位 {index + 1} · {stanceLabels[hero.stance]}
                  {gapLabel ? ` · ${gapLabel}` : ""}
                </legend>
                <label>
                  英雄
                  <select
                    aria-label={`席位 ${index + 1} 英雄`}
                    value={name}
                    onChange={(e) => {
                      const next = e.target.value as FormalHeroName;
                      setParty(
                        party.map((h, i) => (i === index ? formalPartySlot(next, index) : h)),
                      );
                    }}
                  >
                    {FORMAL_HERO_NAMES.filter((n) => n === name || !taken.has(n)).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                {hero.skillIds.map((id, slot) => (
                  <div key={slot} className="embark-skill-row">
                    <CardFace skillId={id} size="sm" />
                    <label>
                      起始技能 {slot + 1}
                      <select
                        aria-label={`${name} 技能 ${slot + 1}`}
                        value={id}
                        onChange={(e) =>
                          setParty(
                            party.map((h, i) =>
                              i !== index
                                ? h
                                : {
                                    ...h,
                                    skillIds: h.skillIds.map((s, j) =>
                                      j === slot ? e.target.value : s,
                                    ),
                                  },
                            ),
                          )
                        }
                      >
                        {questBattleData.skills
                          .filter(
                            (s) => s.hero === name && s.level === 1 && !s.verification.unverified,
                          )
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {heroHasUnwiredCombatSkills(name) ? "（效果未接线，使用时拒绝）" : ""}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                ))}
              </fieldset>
            );
          })}
          {error && <p role="alert">{error}</p>}
          <button type="submit">进入地牢</button>
        </form>
      </section>
      <QuestSaveControls onLoad={() => setStarted(true)} />
    </main>
  );
}
