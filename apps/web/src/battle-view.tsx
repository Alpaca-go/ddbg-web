import { useState } from "react";
import {
  heroSkillUsesSelfTarget,
  readPrintedTargets,
  PROVISION_EFFECTS,
  isInvokingMonster,
} from "@ddbg/engine";
import type { Command, SkillStance, ProvisionEffect, GameState, GameEvent } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import type { SandboxLayout } from "./battle-store";
import { battleStep } from "./battle-step";
import { CardFace } from "./card-art/card-face";
import { MonsterCardFace } from "./card-art/monster-card-face";
import { BattleStanceTrack } from "./battle-stance-track";
import { SkillCardText } from "./skill-card-text";
import { SkillRequirements } from "./skill-requirements";
import { SkillResults } from "./skill-results";
import { StateEventDetails } from "./state-event-details";
import { MonsterActionDetails } from "./monster-action-details";
import { ResolveEventDetails } from "./resolve-event-details";
import { EncounterEventDetails } from "./encounter-event-details";
import { provisionLabels, provisionEffectLabels } from "./provision-labels";

const stances: SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
export function BattleView({
  game,
  dispatch,
  reset = () => {},
  layout,
  events,
  commands,
  notice,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
  reset?: (seed: number, layout: SandboxLayout) => void;
  layout: SandboxLayout | "dungeon";
  events: readonly GameEvent[];
  commands: readonly Command[];
  notice: string;
}) {
  const [seed, setSeed] = useState("1");
  const [selectedLayout, setSelectedLayout] = useState<SandboxLayout>("basic");
  const [skillId, setSkillId] = useState("");
  const [targetId, setTargetId] = useState("soldier");
  const [targetAreaId, setTargetAreaId] = useState("");
  const [emptyAreaMode, setEmptyAreaMode] = useState(false);
  const [emptyAreaId, setEmptyAreaId] = useState("");
  const [selection, setSelection] = useState({ context: "", ids: [] as string[] });
  const [path, setPath] = useState<string[]>([]);
  const [provisionId, setProvisionId] = useState("");
  const [provisionTargetId, setProvisionTargetId] = useState("hero-0");
  const [provisionEffect, setProvisionEffect] = useState<ProvisionEffect>("heal");
  const battle = game.battle!;
  const turn = battle.encounter?.turn;
  const step = game.dungeon?.campaignFailure
    ? { label: "战役失败", hint: "驿站等待英雄不足，无法补齐队伍（R9/R25/R33）。" }
    : layout === "dungeon" && turn?.type === "halted"
      ? turn.reason === "heroesDefeated"
        ? {
            label: "英雄全灭",
            hint: "先处置死者饰品，再点击「结算英雄全灭」检查驿站人数（R9/R25）。",
          }
        : { label: "双方全灭", hint: "单场停止，无胜利或撤退奖励；保留双方全灭停点（R-068）。" }
      : battleStep(battle);
  const actor =
    turn && "actorId" in turn ? battle.entities.find((e) => e.id === turn.actorId) : undefined;
  const pending =
    game.dungeon?.deathTrinketChoice ??
    game.dungeon?.replacementPreparation?.choice ??
    battle.pending?.choice;
  const pendingArea =
    battle.pending?.type === "shuffleArea" || battle.pending?.type === "monsterMove";
  const shuffled = battle.shuffleIntents[0];
  const frozen = !!pending || battle.shuffleIntents.length > 0;
  const actorSkills = battleData.skills.filter((s) => actor?.skillIds.includes(s.id));
  const skill = actorSkills.find((s) => s.id === skillId) ?? actorSkills[0];
  const printedTargets = skill ? readPrintedTargets(skill) : undefined;
  const maxTargets = printedTargets?.kind === "exact" ? printedTargets.max : 1;
  const multiTarget = maxTargets > 1;
  const selfTarget = skill ? heroSkillUsesSelfTarget(skill) : false;
  const emptyAreaSelection = emptyAreaMode && !selfTarget;
  const emptyAreas = battle.areas.filter(
    (a) => !battle.entities.some((e) => !e.dead && e.areaId === a.id),
  );
  const selectedEmptyArea = emptyAreas.find((a) => a.id === emptyAreaId) ?? emptyAreas[0];
  const selectedArea = targetAreaId || actor?.areaId || battle.areas[0]!.id;
  const selectionContext = `${battle.encounter?.round}:${actor?.id}:${skill?.id}:${selectedArea}`;
  const areaTargets = battle.entities.filter((e) => !e.dead && e.areaId === selectedArea);
  const selectedIds =
    selection.context === selectionContext
      ? selection.ids.filter((id) => areaTargets.some((e) => e.id === id))
      : [];
  const heroTurn = turn?.type === "hero" && !frozen;
  const canChangeStance = (direction: "forward" | "backward") => {
    const index = stances.indexOf(actor?.stance as SkillStance);
    const neighbor = stances[index + (direction === "forward" ? -1 : 1)];
    return (
      !!neighbor &&
      battle.entities.some((e) => e.side === "hero" && !e.dead && e.stance === neighbor)
    );
  };
  const action = battle.monsterAction;
  const monsterCard = battleData.monsters.find((m) => m.id === actor?.monsterCardId);
  const monsterSkill = monsterCard?.skills.find((s) => s.slot === action?.skillSlot);
  const entityName = (id: string) => {
    const entity = battle.entities.find((e) => e.id === id);
    const duplicates = battle.entities.filter(
      (other) => other.monsterCardId && other.monsterCardId === entity?.monsterCardId,
    );
    const instance =
      duplicates.length > 1 ? ` #${duplicates.findIndex((other) => other.id === id) + 1}` : "";
    return (
      entity?.hero ??
      (battleData.monsters.find((m) => m.id === entity?.monsterCardId)?.name
        ? `${battleData.monsters.find((m) => m.id === entity?.monsterCardId)!.name}${instance}`
        : id)
    );
  };
  const send = (command: Command) => {
    dispatch(command);
    setPath([]);
  };
  const skillName = (id: string) =>
    battleData.skills.find((s) => s.id === id)?.name ??
    battleData.monsters
      .flatMap((m) => m.skills.map((s) => ({ id: `${m.id}:skill${s.slot}`, name: s.name })))
      .find((s) => s.id === id)?.name ??
    id;
  const turnText = !turn
    ? "尚未开始"
    : turn.type === "hero"
      ? `${entityName(turn.actorId)} · 剩余 ${turn.actions} 行动${turn.mustMove ? " · 必须移动离开" : ""}`
      : turn.type === "monster"
        ? `${entityName(turn.actorId)} · 怪物回合`
        : turn.type === "finished"
          ? turn.outcome === "victory"
            ? "胜利"
            : "第 4 轮结束：撤退"
          : turn.type === "halted"
            ? turn.reason === "mutualWipeout"
              ? "双方同次全灭：单场停止，无胜利／撤退奖励"
              : "英雄全灭：单场停止，真实任务请结算驿站人数"
            : "等待抽取先攻";
  const endpoint = path.at(-1) ?? actor?.areaId;
  const adjacent = battle.areas.find((a) => a.id === endpoint)?.adjacent ?? [];
  const stat = battleData.heroStats.find((s) => s.id === actor?.heroStatId);
  const provision =
    battle.provisions?.find((item) => item.id === provisionId) ??
    battle.provisions?.find((item) => item.face !== "tool") ??
    battle.provisions?.[0];
  const provisionEffects: readonly ProvisionEffect[] = provision
    ? PROVISION_EFFECTS[provision.face]
    : [];
  const effect = provisionEffects.includes(provisionEffect) ? provisionEffect : provisionEffects[0];
  const provisionWindow = battle.pending?.type === "turnStartProvision";
  const canUseProvision =
    !!turn &&
    (provisionWindow ||
      (!frozen &&
        (turn.type === "awaitingInitiative" ||
          turn.type === "hero" ||
          (turn.type === "monster" && !!action?.positioned))));

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DDBG · {layout === "dungeon" ? "PHASE 3" : "PHASE 2"}</p>
          <h1>暗黑地牢桌游</h1>
          <p className="muted">
            {layout === "dungeon" ? "地牢房间战斗" : "单场战斗沙盒"} · 1–4 人轮流操作
          </p>
          {layout !== "dungeon" && (
            <>
              <a href="/?phase=3&play=1">开始地牢任务</a>{" "}
              <a href="/?phase=3">打开 Phase 3 布局与侦察沙盒</a>
            </>
          )}
        </div>
        {layout !== "dungeon" && (
          <form
            className="seed-form"
            onSubmit={(e) => {
              e.preventDefault();
              const value = Number(seed);
              if (seed.trim() && Number.isSafeInteger(value)) {
                reset(value, selectedLayout);
                setPath([]);
                setSkillId("");
                setTargetId("soldier");
                setTargetAreaId("");
                setEmptyAreaMode(false);
                setEmptyAreaId("");
                setSelection({ context: "", ids: [] });
              }
            }}
          >
            <label>
              测试布置
              <select
                aria-label="测试布置"
                value={selectedLayout}
                onChange={(e) => setSelectedLayout(e.target.value as SandboxLayout)}
              >
                <option value="basic">基础战斗</option>
                <option value="shuffle">位移选择</option>
                <option value="heal">多目标治疗</option>
                <option value="pair">Soldier + Rabble</option>
                <option value="trio">Courtier + Soldier + Rabble</option>
                <option value="formalSoldier">正式部署：3 Soldier + Rabble</option>
                <option value="formalMixed">正式部署：2 Soldier + 2 Rabble</option>
                <option value="formalBack">正式部署：2 Courtier + Soldier + Rabble</option>
              </select>
            </label>
            <label>
              种子
              <input
                aria-label="种子"
                type="number"
                step="1"
                required
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
            </label>
            <button type="submit">重新布置</button>
          </form>
        )}
      </header>
      {layout === "dungeon" && (
        <p className="sandbox-note">
          真实房间部署 · 每名英雄装备三个 I 级技能；战后保留状态与补给。
          {(turn?.type === "finished" ||
            (turn?.type === "halted" && turn.reason === "heroesDefeated")) &&
            !game.dungeon?.campaignFailure && (
              <button onClick={() => send({ type: "finishDungeonBattle" })}>
                {turn.type === "halted" ? "结算英雄全灭" : "返回地牢地图"}
              </button>
            )}
        </p>
      )}
      {layout !== "dungeon" && (
        <p className="sandbox-note">
          {layout.startsWith("formal")
            ? "已复核起点：英雄 H/C，怪物按 Front / Back 生成；C/H 为 Cornered。测试技能选择沿用四英雄。"
            : "手动布置："}
          {layout.startsWith("formal")
            ? ""
            : layout === "heal"
              ? "Vestal 在防御位 / A，其余英雄在 B，Bone Soldier 在 C；四英雄初始伤口均为 5。种子 5 下，Crusader 移动到 A 再返回 B，抽取下一张先攻即可试用 Divine Comfort。"
              : layout === "shuffle"
                ? "Highwayman 在进攻位 / A，与 Bone Soldier 同区；Crusader / Hellion / Vestal 分别在 B / C / D。种子 5 可直接试用 Point Blank Shot。"
                : layout === "pair" || layout === "trio"
                  ? `四英雄在 A，Hellion 在远程位可试用 Breakthrough；B 区怪物为 ${layout === "pair" ? "Soldier + Rabble" : "Courtier + Soldier + Rabble"}，按列表顺序站进攻至远程位。`
                  : "四英雄在 A，Bone Soldier 在 B。"}
          光照 5。使用获批几何与卡牌；
          {!layout.startsWith("formal") && "初始位置为测试布置，不代表正式房间部署。"}
          {layout.startsWith("formal")
            ? "宝箱奖励与补给已接入；战役结算待后续阶段。"
            : "此测试布局不生成宝箱；战役结算待后续阶段。"}
        </p>
      )}
      <section className="statusbar" aria-label="战斗状态">
        <span>第 {battle.encounter?.round ?? "—"} 轮 / 4</span>
        <span>光照 {battle.light}</span>
        <strong data-testid="turn-status">{turnText}</strong>
        {frozen && (
          <span data-testid="pending-status">
            {step.label} ·{provisionWindow ? "可免费使用补给；其他行动暂不可用" : "其他行动已冻结"}
          </span>
        )}
      </section>
      <p className="step-hint" data-testid="step-hint">
        <strong>{step.label}</strong> · {step.hint}
      </p>
      <p className="notice" role="status">
        {notice}
      </p>
      <div className="workspace">
        <section className="panel board" aria-label="区域板">
          <h2>
            {battle.roomName ?? battleData.tileName} <small>区域邻接视图</small>
          </h2>
          <p className="muted">
            区域卡片顺序不表示空间相邻；移动使用本房间下列已核实连接，不能穿过黑墙或空隙。
          </p>
          <div className="area-grid">
            {battle.areas.map((area) => {
              const occupants = battle.entities.filter((e) => !e.dead && e.areaId === area.id);
              const count = occupants.reduce(
                (sum, e) => sum + (e.side === "hero" ? 1 : e.stanceSlots!),
                0,
              );
              return (
                <article
                  className={`area ${actor?.areaId === area.id ? "active-area" : ""} ${pendingArea && pending?.options.some((option) => option.id === area.id) ? "choice-area" : ""}`}
                  key={area.id}
                  data-testid={`area-${area.id}`}
                >
                  <div className="area-heading">
                    <h3>{area.id}</h3>
                    <span>
                      {count}/{area.capacity} 格{area.elevation === "high" ? " · 高地" : ""}
                    </span>
                  </div>
                  <p className="connections">连接：{area.adjacent.join(" · ") || "无"}</p>
                  {area.endTurnStress === 1 && (
                    <p className="muted">
                      {area.endTurnStressName ?? "Cornered"}：英雄结束回合压力 +1
                    </p>
                  )}
                  {area.endTurnStress === -1 && (
                    <p className="muted">Beacon of Light：英雄结束回合恢复 1 压力</p>
                  )}
                  {area.healingForbidden && (
                    <p className="muted">Unholy Aura：英雄不能治疗或被治疗</p>
                  )}
                  {area.ancestorGlory && (
                    <p>
                      Ancestor’s Glory：站立英雄免疫并移除
                      Blight／Bleed／Debuff／Stun／Mark，免疫目标 Shuffle；自身效果遵循 R20。
                    </p>
                  )}
                  {area.feelingThePresence && (
                    <p>
                      Feeling the Presence：英雄结束回合先压力 +1 × 负面怪癖数，存活再治疗 HL ×
                      正面怪癖数。
                    </p>
                  )}
                  {area.spikedPit && (
                    <p>
                      Spiked Pit：Shuffle实际落点或结束回合站立时，伤害3 → Bleed
                      1·3t；先坑后Vertigo。
                    </p>
                  )}
                  {area.invokerGoal && (
                    <p>The Invokers：本轮最后一只可行动怪物改为向本区移动，替代整个第2步。</p>
                  )}
                  {area.invokingAbyss && (
                    <p>Invoking Abyss：轮末本区有存活怪物时，全体存活英雄各压力+2。</p>
                  )}
                  {area.lootTheChest && <p>Loot the Chest：花2行动抽1张饰品，每场一次。</p>}
                  {area.hideAndHeal && (
                    <p>Hide and Heal：本区无怪物时，花1行动、压力+2，存活后移除全部伤口。</p>
                  )}
                  {area.circleOfPower && <p>Circle of Power：怪物在本区结束回合治疗4。</p>}
                  {area.endTurnHeal === 3 && (
                    <p className="muted">Healing Waters：英雄结束回合治疗 3</p>
                  )}
                  {battle.loot?.placed.some((token) => token.areaId === area.id) && (
                    <p>宝箱：可在同区花一个行动拾取</p>
                  )}
                  <ul>
                    {occupants.map((e) => (
                      <li key={e.id} className={e.side}>
                        {entityName(e.id)}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <BattleStanceTrack battle={battle} entityName={entityName} actorId={actor?.id} />
        </section>
        <aside className="panel actions" aria-label="行动面板">
          <h2>行动面板</h2>
          <fieldset disabled={!canUseProvision}>
            <legend>免费补给 · {battle.provisions?.length ?? 0}/16</legend>
            <label>
              补给
              <select
                aria-label="补给"
                value={provision?.id ?? ""}
                onChange={(event) => setProvisionId(event.target.value)}
              >
                {battle.provisions?.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    {provisionLabels[item.face]} #{index + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              接收英雄
              <select
                aria-label="补给接收英雄"
                value={provisionTargetId}
                onChange={(event) => setProvisionTargetId(event.target.value)}
              >
                {battle.entities
                  .filter((entity) => entity.side === "hero" && !entity.dead)
                  .map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entityName(entity.id)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              效果
              <select
                aria-label="补给效果"
                value={effect ?? ""}
                onChange={(event) => setProvisionEffect(event.target.value as ProvisionEffect)}
              >
                {provisionEffects.map((effect) => (
                  <option key={effect} value={effect}>
                    {provisionEffectLabels[effect]}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!provision || !effect}
              onClick={() =>
                provision &&
                effect &&
                send({
                  type: "useProvision",
                  provisionId: provision.id,
                  targetId: provisionTargetId,
                  effect,
                })
              }
            >
              免费使用补给
            </button>
          </fieldset>
          {!turn && (
            <button disabled={frozen} onClick={() => send({ type: "startBattle" })}>
              开始战斗
            </button>
          )}
          {game.dungeon &&
            battle.entities.some(
              (h) =>
                h.side === "hero" &&
                h.dead &&
                !game.dungeon!.preparedReplacements?.some((p) => p.deadHeroId === h.id),
            ) && (
              <button
                disabled={
                  !!game.dungeon.deathTrinketChoice ||
                  !!game.dungeon.replacementPreparation ||
                  !!game.dungeon.campaignFailure ||
                  (turn?.type === "halted" && turn.reason === "heroesDefeated")
                }
                onClick={() => send({ type: "prepareReplacementHero" })}
              >
                准备驿站替补
              </button>
            )}
          {game.dungeon?.campaignFailure && (
            <p>
              {game.dungeon.campaignFailure === "insufficientWaitingHeroes"
                ? "英雄全灭，驿站等待英雄不足四人，战役失败（R9/R25）。"
                : "等待英雄代币耗尽，战役失败（R33）。"}
            </p>
          )}
          {!!game.dungeon?.preparedReplacements?.length && <p>替补已准备，等待战斗结束后入队。</p>}
          {turn?.type === "awaitingInitiative" && !frozen && (
            <button onClick={() => send({ type: "drawInitiative" })}>抽取先攻</button>
          )}
          {pending && (
            <fieldset className="choice" key={pending.id}>
              <legend>
                待选决策 · {pending.actorId ? entityName(pending.actorId) : "当前玩家"}
              </legend>
              <p>{pending.prompt}</p>
              {battle.pending?.type === "shuffleArea" && shuffled && (
                <p>
                  被位移：{entityName(shuffled.entityId)} · 当前区域{" "}
                  {battle.entities.find((e) => e.id === shuffled.entityId)?.areaId}
                  {battle.pending.path.length > 0 &&
                    ` · 已选路径 ${battle.pending.path.join(" → ")}`}
                </p>
              )}
              <p className="muted">{step.hint}</p>
              {pending.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() =>
                    send({ type: "resolveChoice", choiceId: pending.id, optionId: option.id })
                  }
                >
                  {option.label}
                </button>
              ))}
            </fieldset>
          )}
          {!pending && battle.shuffleIntents.length > 0 && (
            <button onClick={() => send({ type: "resolveShuffles" })}>结算位移</button>
          )}
          {turn?.type === "hero" && (
            <>
              <fieldset disabled={!heroTurn}>
                <legend>移动 · Speed {stat?.speed}</legend>
                <p>
                  路径：{actor?.areaId}
                  {path.map((id) => ` → ${id}`).join("")}
                </p>
                <div className="button-row">
                  {adjacent.map((id) => (
                    <button
                      key={id}
                      disabled={path.length >= (stat?.speed ?? 0)}
                      onClick={() => setPath([...path, id])}
                    >
                      前往 {id}
                    </button>
                  ))}
                </div>
                <div className="button-row">
                  <button
                    disabled={!path.length}
                    onClick={() => send({ type: "moveHero", actorId: actor!.id, path })}
                  >
                    确认移动
                  </button>
                  <button disabled={!path.length} onClick={() => setPath([])}>
                    清空路径
                  </button>
                </div>
              </fieldset>
              <fieldset disabled={!heroTurn || turn.mustMove}>
                <legend>
                  战利品 · 金币 {battle.loot?.gold ?? 0} · 补给 {battle.provisions?.length ?? 0}/16
                </legend>
                <button
                  disabled={!battle.loot?.placed.some((token) => token.areaId === actor?.areaId)}
                  onClick={() => send({ type: "interactLoot", actorId: actor!.id })}
                >
                  拾取同区宝箱
                </button>
              </fieldset>
              {battle.areas.find((area) => area.id === actor!.areaId)?.lootTheChest && (
                <button
                  disabled={!heroTurn || turn.mustMove || turn.actions < 2 || battle.lootChestUsed}
                  onClick={() => send({ type: "lootTreasureChest", actorId: actor!.id })}
                >
                  Loot the Chest（2行动，本场一次）
                </button>
              )}
              {battle.areas.find((area) => area.id === actor!.areaId)?.hideAndHeal && (
                <button
                  disabled={
                    !heroTurn ||
                    turn.mustMove ||
                    turn.actions < 1 ||
                    battle.areas.find((a) => a.id === actor!.areaId)?.healingForbidden ||
                    battle.entities.some(
                      (e) => e.side === "monster" && !e.dead && e.areaId === actor!.areaId,
                    )
                  }
                  onClick={() => send({ type: "hideAndHeal", actorId: actor!.id })}
                >
                  Hide and Heal（1行动，压力+2）
                </button>
              )}
              <fieldset disabled={!heroTurn || turn.mustMove}>
                <legend>换姿态</legend>
                <div className="button-row">
                  <button
                    disabled={!canChangeStance("forward")}
                    onClick={() =>
                      send({ type: "changeStance", actorId: actor!.id, direction: "forward" })
                    }
                  >
                    向前换姿态
                  </button>
                  <button
                    disabled={!canChangeStance("backward")}
                    onClick={() =>
                      send({ type: "changeStance", actorId: actor!.id, direction: "backward" })
                    }
                  >
                    向后换姿态
                  </button>
                </div>
              </fieldset>
              <fieldset disabled={!heroTurn || turn.mustMove}>
                <legend>使用技能</legend>
                <div className="skill-hand" role="listbox" aria-label="手牌技能">
                  {actorSkills.map((s) => (
                    <CardFace
                      key={s.id}
                      skillId={s.id}
                      size="sm"
                      selected={skill?.id === s.id}
                      onSelect={() => {
                        setSkillId(s.id);
                        setSelection({ context: "", ids: [] });
                      }}
                    />
                  ))}
                </div>
                <label>
                  技能
                  <select
                    aria-label="技能"
                    value={skill?.id ?? ""}
                    onChange={(e) => {
                      setSkillId(e.target.value);
                      setSelection({ context: "", ids: [] });
                    }}
                  >
                    {actorSkills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {(["I", "II", "III"] as const)[s.level - 1]}
                      </option>
                    ))}
                  </select>
                </label>
                {skill && <SkillRequirements skill={skill} />}
                {!selfTarget && (
                  <div className="target-options">
                    <label>
                      <input
                        type="checkbox"
                        aria-label="选择空区域"
                        checked={emptyAreaMode}
                        onChange={(e) => setEmptyAreaMode(e.target.checked)}
                      />
                      选择空区域（仍消耗行动，成功使用后本回合不能重用）
                    </label>
                  </div>
                )}
                {emptyAreaSelection ? (
                  <>
                    <label>
                      空区域
                      <select
                        aria-label="空区域"
                        value={selectedEmptyArea?.id ?? ""}
                        onChange={(e) => setEmptyAreaId(e.target.value)}
                      >
                        {emptyAreas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="muted">
                      须符合卡面姿态与射程；没有目标命中、暴击或目标效果。自身 Push / Pull
                      以所选区域为参照，完成位移选择后扣行动。
                    </p>
                    {!emptyAreas.length && <p className="muted">当前没有空区域。</p>}
                  </>
                ) : multiTarget ? (
                  <>
                    <label>
                      目标区域
                      <select
                        aria-label="目标区域"
                        value={selectedArea}
                        onChange={(e) => {
                          setTargetAreaId(e.target.value);
                          setSelection({ context: "", ids: [] });
                        }}
                      >
                        {battle.areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="target-options" role="group" aria-label="同区目标">
                      {areaTargets.map((entity) => (
                        <label key={entity.id}>
                          <input
                            type="checkbox"
                            aria-label={`选择 ${entityName(entity.id)}`}
                            checked={selectedIds.includes(entity.id)}
                            disabled={
                              !selectedIds.includes(entity.id) && selectedIds.length >= maxTargets
                            }
                            onChange={(e) =>
                              setSelection({
                                context: selectionContext,
                                ids: e.target.checked
                                  ? [...selectedIds, entity.id]
                                  : selectedIds.filter((id) => id !== entity.id),
                              })
                            }
                          />
                          {entityName(entity.id)} · 伤口 {entity.wounds}/{entity.life}
                        </label>
                      ))}
                      {!areaTargets.length && <p className="muted">此区域没有存活目标。</p>}
                    </div>
                    <p className="muted">
                      已选 {selectedIds.length}/{maxTargets} ·
                      共用一次掷骰，逐目标判定。目标类型与射程须符合卡面。
                    </p>
                  </>
                ) : selfTarget ? (
                  <p>目标：自身 · {actor ? entityName(actor.id) : ""}</p>
                ) : (
                  <label>
                    目标
                    <select
                      aria-label="目标"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                    >
                      {battle.entities
                        .filter((e) => !e.dead)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {entityName(e.id)} · {e.areaId}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <button
                  disabled={
                    !skill ||
                    (emptyAreaSelection ? !selectedEmptyArea : multiTarget && !selectedIds.length)
                  }
                  onClick={() =>
                    send(
                      emptyAreaSelection
                        ? {
                            type: "playHeroSkillEmptyArea",
                            actorId: actor!.id,
                            skillId: skill!.id,
                            areaId: selectedEmptyArea!.id,
                          }
                        : multiTarget
                          ? {
                              type: "playHeroSkillTargets",
                              actorId: actor!.id,
                              targetIds: selectedIds,
                              skillId: skill!.id,
                            }
                          : {
                              type: "playHeroSkill",
                              actorId: actor!.id,
                              targetId: selfTarget ? actor!.id : targetId,
                              skillId: skill!.id,
                            },
                    )
                  }
                >
                  使用技能
                </button>
              </fieldset>
              {skill && (
                <>
                  <CardFace skillId={skill.id} size="md" />
                  <SkillCardText
                    name={skill.name}
                    level={skill.level}
                    lines={
                      skill.stats_line
                        ? [skill.stats_line, ...skill.effect_lines]
                        : skill.effect_lines
                    }
                  />
                </>
              )}
            </>
          )}
          {turn?.type === "monster" && !frozen && (
            <div className="monster-controls">
              {!action && (
                <button onClick={() => send({ type: "prepareMonsterAction", actorId: actor!.id })}>
                  {isInvokingMonster(battle, actor!.id)
                    ? "按 The Invokers 移动"
                    : battle.monsters
                          ?.find((c) => c.id === actor?.monsterCardId)
                          ?.skills.some((s) => s.target === "Self")
                      ? "怪物选招／执行自身技能"
                      : "怪物选招与选目标"}
                </button>
              )}
              {action && (
                <>
                  <p>
                    技能 {action.skillSlot} → {entityName(action.targetId)}
                  </p>
                  {!action.positioned ? (
                    <button
                      onClick={() => send({ type: "moveMonsterToRange", actorId: actor!.id })}
                    >
                      怪物移动到射程
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        send({
                          type: "playMonsterSkill",
                          actorId: actor!.id,
                          targetId: action.targetId,
                          skillSlot: action.skillSlot,
                        })
                      }
                    >
                      结算怪物技能
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {turn?.type === "monster" && monsterCard && (
            <MonsterCardFace monsterCardId={monsterCard.id} size="md" />
          )}
          {turn?.type === "monster" && monsterCard && monsterSkill && (
            <SkillCardText
              name={monsterSkill.name}
              level={monsterCard.level}
              lines={monsterSkill.lines}
            />
          )}
          <details className="debug">
            <summary>种子与命令调试</summary>
            <p data-testid="rng-status">
              布置 {layout} · seed {game.seed} · RNG 游标 {battle.rngCursor} · 命令{" "}
              {commands.length}
            </p>
            <pre>{JSON.stringify(commands, null, 2)}</pre>
          </details>
        </aside>
      </div>
      <section className="panel log" aria-label="战斗日志">
        <h2>
          战斗日志 <small>{events.length} 条事件</small>
        </h2>
        <ol>
          {events.map((event, i) => (
            <li key={i}>
              <span>{i + 1}.</span> {event.message}
              {"roll" in event &&
              event.roll !== null &&
              !("phase" in event && event.phase === "afterOwn")
                ? ` · d10=${event.roll}`
                : ""}
              {event.type === "heroSkillEmptyAreaResolved" && (
                <p>
                  {entityName(event.actorId)} · {skillName(event.skillId)} → 空区域 {event.areaId} ·
                  无目标命中 / 暴击判定
                </p>
              )}
              <StateEventDetails event={event} entityName={entityName} />
              <EncounterEventDetails event={event} entityName={entityName} />
              <MonsterActionDetails event={event} entityName={entityName} skillName={skillName} />
              <ResolveEventDetails
                event={event}
                entityName={entityName}
                cards={battleData.resolveCards}
              />
              {(event.type === "heroSkillResolved" ||
                event.type === "monsterSkillResolved" ||
                event.type === "heroSkillTargetsResolved" ||
                event.type === "monsterSkillTargetsResolved") &&
                !("phase" in event && event.phase === "ownPending") && (
                  <SkillResults
                    actorName={entityName(event.actorId)}
                    entityName={entityName}
                    skillName={skillName}
                    resolutions={"resolutions" in event ? event.resolutions : [event.resolution]}
                  />
                )}
            </li>
          ))}
        </ol>
        {!events.length && <p className="muted">尚无事件。</p>}
      </section>
    </main>
  );
}
