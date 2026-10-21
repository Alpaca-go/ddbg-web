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
import { DungeonSandbox } from "../dungeon-sandbox";
import { QuestSaveControls } from "../quest-save-controls";
import { useDungeonStore } from "../store";
import { taskSources } from "../task-sources";
import { EmbarkHeroPicker } from "./embark-hero-picker";
import { ExpeditionPrepSection } from "./expedition-prep-section";
import {
  defaultPartyNames,
  formalHeroLevel1Skills,
  formalPartySlot,
  stanceLabels,
  toggleEmbarkSkillIds,
} from "./formal-party";

export function DungeonQuest() {
  const beginTask = useDungeonStore((s) => s.beginTask);
  const [started, setStarted] = useState(false),
    [prepStep, setPrepStep] = useState<"party" | "expedition">("party"),
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

  const embark = () => {
    setError("");
    try {
      const game = createCoreDungeonQuest(Number(seed), selectedQuest.id, mode, party, taskSources);
      beginTask(game, {
        seed: Number(seed),
        questId: selectedQuest.id,
        mode,
        party: party.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
      });
      setStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (prepStep === "expedition") {
    return (
      <main className="shell">
        <ExpeditionPrepSection
          quests={startQuests}
          questId={questId}
          onQuestIdChange={setQuestId}
          onBack={() => {
            setError("");
            setPrepStep("party");
          }}
          onEmbark={embark}
          error={error}
          embarking={false}
        />
        <QuestSaveControls onLoad={() => setStarted(true)} />
      </main>
    );
  }

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
            setError("");
            setPrepStep("expedition");
          }}
        >
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
            可选身份共 {FORMAL_HERO_NAMES.length} 名（与替补白名单一致）。盗墓者 I 级七战斗技能与
            Pilfer 抽取已接（R-096、R-098：抽取不翻面）；神秘学者 I 级技能与 Dark Ritual
            未接线。可编队并装备已转录技能；未接线效果按 R-048 拒绝，不发明。
          </p>
          {party.map((hero, index) => {
            const name = partyNames[index]!;
            const gapLabel = heroHasUnwiredCombatSkills(name) ? "技能效果未接线" : "";
            return (
              <fieldset key={index}>
                <legend>
                  席位 {index + 1} · {stanceLabels[hero.stance]}
                  {gapLabel ? ` · ${gapLabel}` : ""}
                </legend>
                <div className="embark-seat">
                  <EmbarkHeroPicker
                    seatIndex={index}
                    heroName={name}
                    partyNames={partyNames}
                    onSelect={(next) =>
                      setParty(
                        party.map((h, i) => (i === index ? formalPartySlot(next, index) : h)),
                      )
                    }
                  />
                  <div
                    className="embark-seat-skills"
                    role="group"
                    aria-label={`${name} 起始技能（已选 ${hero.skillIds.length}/3）`}
                  >
                    {formalHeroLevel1Skills(name).map((skill) => {
                      const selected = hero.skillIds.includes(skill.id);
                      return (
                        <CardFace
                          key={skill.id}
                          skillId={skill.id}
                          size="sm"
                          selected={selected}
                          onSelect={() =>
                            setParty(
                              party.map((h, i) =>
                                i !== index
                                  ? h
                                  : {
                                      ...h,
                                      skillIds: toggleEmbarkSkillIds(h.skillIds, skill.id),
                                    },
                              ),
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              </fieldset>
            );
          })}
          {error && <p role="alert">{error}</p>}
          <button type="submit">前往出征准备</button>
        </form>
      </section>
      <QuestSaveControls onLoad={() => setStarted(true)} />
    </main>
  );
}
