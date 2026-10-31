import {
  currentHamletEvent,
  currentHamletHero,
  hamletActionOptions,
  blacksmithOptions,
  visitGuild,
  setEquippedSkills,
  ownedHeroSkills,
  heroSkillSlotCount,
  visitNomadWagon,
  isHauntedGraveyardGuard,
  readFinalFormSequence,
} from "@ddbg/engine";
import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { buildingLabels } from "../labels";
import type { DungeonViewProps } from "../view-props";
import type { PendingChoice } from "@ddbg/engine";

const finalFormNames = {
  ancestor1: "Ancestor 1st Form",
  ancestor2: "Ancestor 2nd Form",
  gestatingHeart: "Gestating Heart",
  heartOfDarkness: "Heart of Darkness",
};

export function HamletEventSection({
  game,
  dispatch,
  formal,
  pendingChoice,
}: DungeonViewProps & { pendingChoice: PendingChoice | null | undefined }) {
  const d = game.dungeon!;
  const hamletCard = currentHamletEvent(game);
  const sequence = readFinalFormSequence(game);
  if (!d.hamlet) return null;
  const guarding = isHauntedGraveyardGuard(d, currentHamletHero(game)?.id);
  const guardHero = d.heroes.find((h) => h.id === d.hamlet!.hauntedGraveyard?.guardHeroId);
  const guardName =
    d.battleCatalog?.heroStats.find((s) => s.id === guardHero?.heroStatId)?.name ?? guardHero?.id;
  return (
    <section aria-label="村庄事件" data-testid="hamlet-event">
      {d.trinkets?.display !== undefined && (
        <div data-testid="nomad-display">
          <p>游商陈列：</p>
          {d.trinkets.display.length ? (
            <div className="trinket-held-row">
              {d.trinkets.display.map((id) => {
                const card = d.trinkets!.cards.find((c) => c.id === id)!;
                const price = card.verification.unverified
                  ? "待核实，暂不可购买"
                  : `${2 + 2 * card.level} 金`;
                return (
                  <CoreboxPrintCardFace
                    key={id}
                    deck="trinket"
                    cardId={id}
                    size="sm"
                    label={`${card.name} ${["I", "II", "III"][card.level - 1]}（${price}）`}
                  />
                );
              })}
            </div>
          ) : (
            <p>已售空，不补货</p>
          )}
        </div>
      )}
      <h3>{d.hamlet.finalPreparation ? "最后村庄准备" : hamletCard!.name}</h3>
      {d.hamlet.finalPreparation ? (
        <p>固定准备4天，不抽村庄事件。</p>
      ) : (
        <>
          <p>
            卡面准备天数：{hamletCard!.days ?? "0或3，须先完成事件选择"} · 村庄事件牌堆{" "}
            {d.hamlet.deck.length} 张（核心池16张，永久移出 {d.hamlet.permanentlyRemoved.length}{" "}
            张）
          </p>
          <p>
            {hamletCard!.runtime === "townFair"
              ? "每名英雄：压力 −3，治疗 2 × 自身英雄等级；相关怪癖修正照常生效。"
              : hamletCard!.effectLines
                  .map((line) => line.replace(/\{icon:[a-f0-9]+\}/g, "［待核对图标］"))
                  .join(" ") || "本周没有额外事件效果。"}
          </p>
        </>
      )}
      {d.hamlet.phase === "eventBlocked" && (
        <p>
          {pendingChoice?.id.startsWith("hamlet-medical:")
            ? "请在下方选择一名英雄移除疾病；结算后开始三天准备。"
            : pendingChoice?.id.startsWith("hamlet-caregivers:")
              ? "请逐个英雄选择免费移除一张怪癖，或放弃；全部结算后开始两天准备。"
              : pendingChoice?.id.startsWith("hamlet-labor-force:")
                ? "请选择免费升级一栋建筑，或放弃；事件永久移出后开始三天准备。"
                : pendingChoice
                  ? pendingChoice.prompt
                  : "本事件效果尚未接通，保留原卡；准备天数与看守人尚未开始。"}
        </p>
      )}
      {d.hamlet.phase === "awaitingCaretaker" && (
        <button onClick={() => dispatch({ type: "rollHamletCaretaker" })}>
          {d.hamlet.day === 1 ? "开始首日看守人" : `开始第 ${d.hamlet.day} 天看守人`}
        </button>
      )}
      {d.hamlet.phase === "heroActions" && (
        <>
          {d.hamlet.day === 1 && d.hamlet.hauntedGraveyard && (
            <p data-testid="haunted-graveyard">
              Haunted Graveyard：
              {d.hamlet.hauntedGraveyard.guardHeroId
                ? !guardHero || guardHero.dead
                  ? "原守卫英雄已阵亡，取消其个人守卫义务。"
                  : `${guardName}${d.hamlet.actedHeroes?.includes(d.hamlet.hauntedGraveyard.guardHeroId) ? "已完成墓地守卫。" : "首日去墓地守卫；服务仍受封锁和每日一次限制。"}`
                : "请从并列最低点数的英雄中选择一名墓地守卫。"}
            </p>
          )}
          <p>
            准备 {d.hamlet.preparationDays} 天 · 当前第 {d.hamlet.day} 天 · 剩余{" "}
            {d.hamlet.remainingDays ?? d.hamlet.preparationDays} 天
          </p>
          <p>
            看守人：
            {d.hamlet.caretaker
              ? buildingLabels[d.hamlet.caretaker]
              : d.hamlet.noCaretaker
                ? "Busy Week，本周不放置"
                : "已被移出，当天不再占用"}
            ；封锁建筑：
            {d.hamlet.blockedBuildings.map((id) => buildingLabels[id]).join("、") || "无"}
          </p>
          <p>
            当前行动英雄：
            {
              d.battleCatalog?.heroStats.find(
                (stat) => stat.id === currentHamletHero(game)?.heroStatId,
              )?.name
            }
          </p>
          <p>
            当天已访问：
            {d.hamlet.visitedBuildings?.map((id) => buildingLabels[id]).join("、") || "无"}
          </p>
          <div aria-label="村庄行动" hidden={pendingChoice?.id.startsWith("hamlet-haunted:")}>
            {!guarding &&
              currentHamletHero(game) &&
              !visitGuild(game, currentHamletHero(game)!.id).events.some(
                (e) => e.type === "commandRefused",
              ) && (
                <button
                  onClick={() =>
                    dispatch({
                      type: "visitGuild",
                      actorId: currentHamletHero(game)!.id,
                    })
                  }
                >
                  访问公会：永久升级英雄/技能
                </button>
              )}
            {d.heroes.map((hero) => {
              const owned =
                d.battleCatalog && !pendingChoice ? ownedHeroSkills(hero, d.battleCatalog) : null;
              if (!owned || !hero.level || !hero.id) return null;
              const slots = heroSkillSlotCount(hero.level);
              const candidate = [
                ...(hero.skillIds ?? []),
                ...owned.filter((s) => !hero.skillIds?.includes(s.id)).map((s) => s.id),
              ].slice(0, slots);
              if (
                candidate.length !== slots ||
                (hero.skillIds?.length === slots &&
                  hero.skillIds.every((id, i) => id === candidate[i]))
              )
                return null;
              const probe = setEquippedSkills(game, {
                type: "setEquippedSkills",
                actorId: hero.id,
                skillIds: candidate,
              });
              if (probe.events.some((e) => e.type === "commandRefused")) return null;
              return (
                <button
                  key={`loadout-${hero.id}`}
                  data-testid={`set-skills-${hero.id}`}
                  onClick={() =>
                    dispatch({
                      type: "setEquippedSkills",
                      actorId: hero.id,
                      skillIds: candidate,
                    })
                  }
                >
                  {hero.id}装满{slots}个技能槽
                </button>
              );
            })}
            {!guarding &&
              currentHamletHero(game) &&
              !visitNomadWagon(game, currentHamletHero(game)!.id).events.some(
                (e) => e.type === "commandRefused",
              ) && (
                <button
                  onClick={() =>
                    dispatch({
                      type: "visitNomadWagon",
                      actorId: currentHamletHero(game)!.id,
                    })
                  }
                >
                  访问游商马车
                  {["I", "II", "III"][(d.buildingLevels?.nomadWagon ?? 1) - 1]}
                  ：陈列与购买饰品
                </button>
              )}
            {!guarding &&
              blacksmithOptions(game).map((option) => (
                <button
                  key={option.command.skillId}
                  disabled={
                    d.gold < 1 ||
                    d.hamlet?.blockedBuildings.includes("blacksmith") ||
                    d.hamlet?.visitedBuildings?.includes("blacksmith")
                  }
                  onClick={() => dispatch(option.command)}
                >
                  {option.label}
                </button>
              ))}
            {hamletActionOptions(game).map((option) => (
              <button key={JSON.stringify(option.command)} onClick={() => dispatch(option.command)}>
                {option.label}
              </button>
            ))}
          </div>
          <p>
            已开放修道院、酒馆、疗养院、生存专家、墓地、铁匠及公会技能升级服务及 Sharpen Spear /
            Intimidate / Zealous Speech / Pray / Chant。其他服务与村庄技能继续开发。
          </p>
        </>
      )}
      {d.hamlet.phase === "preparationComplete" &&
        (d.hamlet.finalPreparation ? (
          <div>
            <p>最后四天准备已完成。最终战尚未接通，保留当前队伍与准备结果。</p>
            {!d.finalBattleProvisions && (
              <button onClick={() => dispatch({ type: "beginFinalBattleProvisions" })}>
                准备最终战补给
              </button>
            )}
            {d.finalBattleProvisions === "awaiting" && !pendingChoice && (
              <button onClick={() => dispatch({ type: "rollDungeonProvisions" })}>
                掷最终战补给骰
              </button>
            )}
            {d.finalBattleProvisions === "ready" && <p>最终战补给已就绪，等待开战。</p>}
            {d.finalBattleProvisions === "ready" && !d.finalFormSequence && (
              <button onClick={() => dispatch({ type: "prepareFinalBattleForms" })}>
                准备最终战形态流程
              </button>
            )}
            {sequence && (
              <div aria-label="最终战形态流程">
                <p>形态顺序：{sequence.forms.map((f) => finalFormNames[f.id]).join(" → ")}</p>
                <p>跳过形态：{finalFormNames[sequence.skippedForm]}</p>
                <p>
                  {sequence.progress.status === "complete"
                    ? "最终战全部形态完成。"
                    : sequence.progress.status === "fighting"
                      ? `当前形态：${sequence.current ? finalFormNames[sequence.current.id] : "—"}；已部署，请在战斗面板点击「开始战斗」洗入先攻（占位几何）。`
                      : `当前形态：${sequence.current ? finalFormNames[sequence.current.id] : "—"}；Ancestor Room 几何仍 hold，可部署占位开战骨架。`}
                </p>
                {sequence.progress.status === "awaitingDeployment" && sequence.current && (
                  <button onClick={() => dispatch({ type: "deployFinalBattleForm" })}>
                    部署当前形态（占位几何）
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <p>
              准备天数已用完。可抽取下一任务（至多两张选一，未选永久弃置）；出征时应用铁匠临时技能并在开局掷奖励补给骰。战役等级{" "}
              {d.campaignLevel ?? 1}。遗迹 I/II 幕击败 Boss 后须先推进战役等级，再进入村庄准备。
            </p>
            {!formal && (d.campaignLevel ?? 1) === 1 && (
              <button
                data-testid="advance-campaign-level"
                onClick={() => dispatch({ type: "advanceCampaignLevel" })}
              >
                沙盒预览 I→II（跳过未实现的 Boss，不支持正式存档）
              </button>
            )}
            <button
              data-testid="offer-next-quest"
              onClick={() => dispatch({ type: "offerNextQuest" })}
            >
              抽取下一任务
            </button>
          </>
        ))}
    </section>
  );
}
