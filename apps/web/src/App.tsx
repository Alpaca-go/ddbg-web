import { useState } from "react";
import type { Command, SkillSegment, SkillStance } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import { useBattleStore } from "./battle-store";
import type { SandboxLayout } from "./battle-store";

const stances: SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
const stanceLabels = { aggressive: "进攻", defensive: "防御", ranged: "远程", support: "支援" };
function lineText(line: readonly SkillSegment[]) {
  return line
    .map((segment) =>
      segment.type === "text"
        ? segment.text
        : ["confirmed", "confirmed_rulebook"].includes(segment.icon.naming)
          ? `[${segment.icon.key}]`
          : `[未核实:${"iconId" in segment.icon ? String(segment.icon.iconId) : "原始图标"}]`,
    )
    .join("");
}

export function App() {
  const game = useBattleStore((s) => s.game);
  const dispatch = useBattleStore((s) => s.dispatch);
  const reset = useBattleStore((s) => s.reset);
  const layout = useBattleStore((s) => s.layout);
  const events = useBattleStore((s) => s.events);
  const commands = useBattleStore((s) => s.commands);
  const notice = useBattleStore((s) => s.notice);
  const [seed, setSeed] = useState("1");
  const [selectedLayout, setSelectedLayout] = useState<SandboxLayout>("basic");
  const [skillId, setSkillId] = useState("");
  const [targetId, setTargetId] = useState("soldier");
  const [path, setPath] = useState<string[]>([]);
  const battle = game.battle!;
  const turn = battle.encounter?.turn;
  const actor =
    turn && "actorId" in turn ? battle.entities.find((e) => e.id === turn.actorId) : undefined;
  const pending = battle.pending?.choice;
  const pendingArea =
    battle.pending?.type === "shuffleArea" || battle.pending?.type === "monsterMove";
  const shuffled = battle.shuffleIntents[0];
  const frozen = !!pending || battle.shuffleIntents.length > 0;
  const actorSkills = battleData.skills.filter((s) => actor?.skillIds.includes(s.id));
  const skill = actorSkills.find((s) => s.id === skillId) ?? actorSkills[0];
  const heroTurn = turn?.type === "hero" && !frozen;
  const action = battle.monsterAction;
  const entityName = (id: string) => {
    const entity = battle.entities.find((e) => e.id === id);
    return (
      entity?.hero ?? battleData.monsters.find((m) => m.id === entity?.monsterCardId)?.name ?? id
    );
  };
  const send = (command: Command) => {
    dispatch(command);
    setPath([]);
  };
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
            ? "英雄全灭：单场停止（战役结果待接入）"
            : "等待抽取先攻";
  const endpoint = path.at(-1) ?? actor?.areaId;
  const adjacent = battle.areas.find((a) => a.id === endpoint)?.adjacent ?? [];
  const stat = battleData.heroStats.find((s) => s.id === actor?.heroStatId);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DDBG · PHASE 2</p>
          <h1>暗黑地牢桌游</h1>
          <p className="muted">单场战斗沙盒 · 1–4 人轮流操作</p>
        </div>
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
      </header>
      <p className="sandbox-note">
        手动布置：
        {layout === "shuffle"
          ? "Highwayman 在进攻位 / A，与 Bone Soldier 同区；Crusader / Hellion / Vestal 分别在 B / C / D。种子 5 可直接试用 Point Blank Shot。"
          : "四英雄在 A，Bone Soldier 在 B。"}
        光照
        5。使用获批几何与卡牌；初始位置为测试布置，不代表正式房间部署。状态代币、压力检定、奖励与战役尚未接入。
      </p>
      <section className="statusbar" aria-label="战斗状态">
        <span>第 {battle.encounter?.round ?? "—"} 轮 / 4</span>
        <span>光照 {battle.light}</span>
        <strong data-testid="turn-status">{turnText}</strong>
        {frozen && <span>等待位移结算 · 其他行动已冻结</span>}
      </section>
      <p className="notice" role="status">
        {notice}
      </p>
      <div className="workspace">
        <section className="panel board" aria-label="区域板">
          <h2>
            {battleData.tileName} <small>区域邻接视图</small>
          </h2>
          <p className="muted">区域卡片顺序不表示空间相邻；移动使用下列连接。E-F 为黑墙阻隔。</p>
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
          <h2 className="track-heading">姿态与生命</h2>
          <div className="tracks">
            {(["hero", "monster"] as const).map((side) => (
              <div key={side}>
                <h3>{side === "hero" ? "英雄" : "怪物"}</h3>
                {stances.map((stance) => (
                  <div className="stance-slot" key={stance}>
                    <span>{stanceLabels[stance]}</span>
                    {battle.entities
                      .filter((e) => e.side === side && !e.dead && e.stance === stance)
                      .map((e) => (
                        <div key={e.id} data-testid={`entity-${e.id}`}>
                          <strong>
                            {entityName(e.id)}
                            {actor?.id === e.id ? " ← 当前" : ""}
                          </strong>
                          <p>
                            区域 {e.areaId} · 伤口 {e.wounds}/{e.life}
                            {e.side === "hero"
                              ? ` · 压力 ${e.stress}/10${e.wounds === e.life ? " · 死门" : ""}`
                              : ""}
                          </p>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {battle.entities.some((e) => e.dead) && (
            <p className="muted">
              阵亡：
              {battle.entities
                .filter((e) => e.dead)
                .map((e) => entityName(e.id))
                .join("、")}
            </p>
          )}
        </section>
        <aside className="panel actions" aria-label="行动面板">
          <h2>行动面板</h2>
          {!turn && <button onClick={() => send({ type: "startBattle" })}>开始战斗</button>}
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
              <p className="muted">只选择引擎返回的选项；完成后继续原结算，不重新掷骰。</p>
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
                <legend>换姿态</legend>
                <div className="button-row">
                  <button
                    onClick={() =>
                      send({ type: "changeStance", actorId: actor!.id, direction: "forward" })
                    }
                  >
                    向前换姿态
                  </button>
                  <button
                    onClick={() =>
                      send({ type: "changeStance", actorId: actor!.id, direction: "backward" })
                    }
                  >
                    向后换姿态
                  </button>
                </div>
              </fieldset>
              <fieldset disabled={!heroTurn || turn.mustMove}>
                <legend>使用技能 · 单目标</legend>
                <label>
                  技能
                  <select
                    aria-label="技能"
                    value={skill?.id ?? ""}
                    onChange={(e) => setSkillId(e.target.value)}
                  >
                    {actorSkills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} I
                      </option>
                    ))}
                  </select>
                </label>
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
                <button
                  disabled={!skill}
                  onClick={() =>
                    send({
                      type: "playHeroSkill",
                      actorId: actor!.id,
                      targetId,
                      skillId: skill!.id,
                    })
                  }
                >
                  使用技能
                </button>
              </fieldset>
              {skill && (
                <details open className="card-text">
                  <summary>{skill.name} I · 英文卡面文字</summary>
                  <p>{lineText(skill.stats_line ?? [])}</p>
                  {skill.effect_lines.map((line, i) => (
                    <p key={i}>{lineText(line)}</p>
                  ))}
                </details>
              )}
            </>
          )}
          {turn?.type === "monster" && !frozen && (
            <div className="monster-controls">
              {!action && (
                <button onClick={() => send({ type: "prepareMonsterAction", actorId: actor!.id })}>
                  怪物选招与选目标
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
              {"roll" in event && event.roll !== null ? ` · d10=${event.roll}` : ""}
              {"resolution" in event &&
                "skipped" in event.resolution &&
                event.resolution.skipped.length > 0 && (
                  <details>
                    <summary>未结算效果</summary>
                    <p>
                      {event.resolution.skipped
                        .map((item) =>
                          item.code === "effect_lines"
                            ? "卡面效果行未完整支持，本次未结算。"
                            : "组合标记没有额外结算。",
                        )
                        .join(" ")}
                    </p>
                  </details>
                )}
            </li>
          ))}
        </ol>
        {!events.length && <p className="muted">尚无事件。</p>}
      </section>
    </main>
  );
}
