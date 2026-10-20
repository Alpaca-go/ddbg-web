import type { PendingChoice } from "@ddbg/engine";
import { readBasicQuest } from "../../../../../packages/data/src/basic-quests";
import {
  upgradableBuildings,
  recoveryBuildingLevel,
  stagecoachWaitingTokens,
  upgradeHamletBuilding,
  ownedHeroSkills,
  heroSkillSlotCount,
} from "@ddbg/engine";
import { buildingLabels } from "../labels";
import { HamletEventSection } from "../hamlet/hamlet-event-section";
import type { DungeonViewProps } from "../view-props";

export function QuestSummaryPanel({
  game,
  dispatch,
  formal,
  pendingChoice,
  includeHamletEvent = true,
}: DungeonViewProps & {
  pendingChoice: PendingChoice | null | undefined;
  includeHamletEvent?: boolean;
}) {
  const d = game.dungeon!;
  const quest = readBasicQuest(d.questDistribution);
  if (!(d.phase === "exited" || d.hamletReturn)) return null;
  return (
    <div data-testid="dungeon-quest-summary">
      {d.questSummary ? (
        <p>
          {d.questSummary.name} · {d.questSummary.questId !== "quest:p001" ? "巢穴清理" : "清理"}{" "}
          {d.questSummary.clearedRoomIds.length} / {quest!.maxRooms} 间 · 每名英雄
          {d.questSummary.awarded ? "已发" : "待发"} {d.questSummary.xpPerHero} XP · 驿站
          {d.questSummary.awarded ? "已发" : "待发"} {d.questSummary.stagecoachXp} XP
          {d.questSummary.questId === "quest:p003" &&
            (d.questSummary.objectiveMet
              ? ` · 捐献${d.questSummary.donatedGold}金币`
              : " · 提前离开，目标未达；跳过捐献")}
        </p>
      ) : (
        <button
          disabled={!!pendingChoice}
          onClick={() => dispatch({ type: "summarizeDungeonQuest" })}
        >
          生成任务结算摘要
        </button>
      )}
      {d.questSummary && !d.hamletReturn && (
        <button
          disabled={!!pendingChoice}
          onClick={() => dispatch({ type: "beginReturnToHamlet" })}
        >
          返回村庄
        </button>
      )}
      {d.hamletReturn && (
        <section aria-label="回村步骤" data-testid="hamlet-return">
          <p>弃牌已洗回 · 状态已移除 · 光照5 · 饰品正置；伤口和压力保留。</p>
          {d.hamletReturn.phase === "converting" && <p>按当前姿态顺序转换意志，请完成怪癖选择。</p>}
          {d.hamletReturn.phase === "awaitingReplacement" && (
            <p>有英雄永久死亡，等待驿站替换；XP尚未发放。</p>
          )}
          {d.hamletReturn.phase === "provisions" && (
            <>
              <p>可在下方使用补给，剩余每颗兑换1金币；完成后发放XP。</p>
              <button
                disabled={!!pendingChoice}
                onClick={() => dispatch({ type: "finishReturnToHamlet" })}
              >
                兑换剩余补给并完成回村
              </button>
            </>
          )}
          {d.hamletReturn.phase === "complete" && (
            <>
              <p>{d.hamlet ? "回村完成，进入村庄准备。" : "回村完成，等待村庄事件。"}</p>
              {!d.hamlet && (
                <button onClick={() => dispatch({ type: "drawHamletEvent" })}>抽村庄事件</button>
              )}
              <p>
                驿站累计XP {d.stagecoachXp}；{d.heroes.map((h) => `${h.id} XP ${h.xp}`).join(" · ")}
              </p>
              <section aria-label="村庄建筑升级" data-testid="hamlet-buildings">
                <p>团队共同决定升级，每级 20 金（铁匠、游商马车 10 金），不消耗英雄行动。</p>
                {upgradableBuildings.map((building) => {
                  const level = recoveryBuildingLevel(d, building);
                  const command = { type: "upgradeHamletBuilding", building } as const;
                  const allowed = !upgradeHamletBuilding(game, command).events.some(
                    (e) => e.type === "commandRefused",
                  );
                  return (
                    <div key={building}>
                      {buildingLabels[building]} {["I", "II", "III"][level - 1]}
                      <button disabled={!allowed} onClick={() => dispatch(command)}>
                        升级{buildingLabels[building]}（
                        {building === "blacksmith" || building === "nomadWagon" ? 10 : 20} 金）
                      </button>
                    </div>
                  );
                })}
              </section>
              <p>铁匠记录下次任务临时技能；游商按建筑等级陈列 I–III 级饰品。</p>
              {!!d.hamlet?.weekBlockedBuildings?.length && (
                <p data-testid="hamlet-week-blocked">
                  Labor Force：本次村庄准备期间不可访问
                  {d.hamlet.weekBlockedBuildings.map((b) => buildingLabels[b] ?? b).join("、")}
                </p>
              )}
              <p data-testid="stagecoach-tokens">
                驿站等待英雄代币：{stagecoachWaitingTokens(d) ?? "数据无效"} 枚。 升至 II / III
                级各增加 1 枚；驿站不可访问，死亡补人流程继续开发。
              </p>
              <p data-testid="next-quest-provisions">
                下次任务奖励补给骰：
                {d.heroes.map((h) => `${h.id} +${h.nextQuestProvisionDice ?? 0}`).join(" · ")}。
                下一次出征尚未接通；届时实际掷出，含开局补给最多16颗（R-041）。
              </p>
              <p data-testid="blacksmith-plan">
                下次任务铁匠临时技能：
                {d.heroes
                  .flatMap((hero) =>
                    (hero.nextQuestSkillUpgrades ?? []).map(
                      (u) =>
                        `${hero.id} ${d.battleCatalog?.skills.find((c) => c.id === u.temporarySkillId)?.name ?? u.temporarySkillId} ${d.battleCatalog?.skills.find((c) => c.id === u.temporarySkillId)?.level === 2 ? "II" : "III"}`,
                    ),
                  )
                  .join(" · ") || "无"}
                。原卡保留，出征使用/归还等待下一任务接入。
              </p>
              <p data-testid="guild-skills">
                公会永久升级：
                {d.heroes
                  .filter(
                    (hero) =>
                      hero.permanentlyRemovedSkillIds?.length ||
                      (hero.level !== undefined && hero.level > 1),
                  )
                  .map((hero) => {
                    const owned = d.battleCatalog ? ownedHeroSkills(hero, d.battleCatalog) : null;
                    const unequipped = owned
                      ? owned
                          .filter((s) => !hero.skillIds?.includes(s.id))
                          .map((s) => `${s.name} ${s.level}`)
                          .join(" / ")
                      : "";
                    return `${hero.id} HL${hero.level ?? "?"} XP ${hero.xp ?? 0}，永久移除${hero.permanentlyRemovedSkillIds?.length ?? 0}张；装备${heroSkillSlotCount(hero.level ?? 1)}槽 ${hero.skillIds
                      ?.map((id) => {
                        const c = d.battleCatalog?.skills.find((s) => s.id === id);
                        return `${c?.name ?? id} ${c?.level}`;
                      })
                      .join(" / ")}${unequipped ? `；未装备 ${unequipped}` : ""}`;
                  })
                  .join(" · ") || "无"}
                。出征要求技能槽=2+HL（I–III）。
              </p>
              <p data-testid="hamlet-virtues">
                当前美德：
                {d.heroes
                  .filter(
                    (h) => d.resolveCards.find((c) => c.id === h.resolveCardId)?.role === "virtue",
                  )
                  .map(
                    (h) => `${h.id} ${d.resolveCards.find((c) => c.id === h.resolveCardId)!.name}`,
                  )
                  .join(" · ") || "无"}
                。持有美德后，下次压力到10直接死亡（R28/R34）。
              </p>
            </>
          )}
        </section>
      )}
      {includeHamletEvent && (
        <HamletEventSection
          game={game}
          dispatch={dispatch}
          formal={formal}
          pendingChoice={pendingChoice}
          events={[]}
          commands={[]}
        />
      )}
    </div>
  );
}
