import { getBossScript } from "@ddbg/engine";
import type { DungeonState } from "@ddbg/engine";
import type { DungeonDispatch } from "../view-props";
import { needsInitialThreat } from "../initial-threat";

export function ExpeditionStartActions({
  dungeon,
  formal,
  pending,
  dispatch,
}: {
  readonly dungeon: DungeonState;
  readonly formal: boolean;
  readonly pending: boolean;
  readonly dispatch: DungeonDispatch;
}) {
  const missing = formal && needsInitialThreat(dungeon);
  const locationBosses =
    dungeon.mode !== "stygian" &&
    dungeon.contentPacks?.length === 2 &&
    dungeon.contentPacks.includes("core") &&
    dungeon.contentPacks.includes("weald");
  const unavailable = dungeon.bossLocationSources && !!dungeon.unregisteredImminentThreatHold;
  const threat = dungeon.activeBossThreatScriptId
    ? getBossScript(dungeon.activeBossThreatScriptId)
    : undefined;
  const unavailableName =
    dungeon.imminentThreatDescriptionCardId === "boss_ability:weald:p001"
      ? "Shrieker I"
      : dungeon.imminentThreatDescriptionCardId === "boss_ability:weald:p007"
        ? "Brigand Pounder I"
        : "已确定";
  return (
    <div data-testid="expedition-start-actions">
      {missing && (
        <div data-testid="initial-threat-setup">
          <p>
            {locationBosses
              ? "从遗迹与 Weald 的七位 Boss 中随机确定迫近威胁。Weald 已开放 Hag、Brigand Pounder 与 Shrieker 的 I／II／III 级战斗。"
              : "新战役先从四名遗迹 Boss 中随机确定迫近威胁，再掷开局补给骰。"}
          </p>
          <button
            disabled={pending}
            onClick={() =>
              dispatch({
                type: "establishImminentThreat",
                ...(locationBosses
                  ? {
                      locationBosses: true,
                      locationSources: true,
                      pounderDungeonThreats: true,
                      pounderHamletThreats: true,
                      pounderBossBattles: true,
                      shriekerBossBattles: true,
                      wealdHigherBosses: true,
                    }
                  : {}),
              })
            }
          >
            抽取迫近威胁
          </button>
        </div>
      )}
      {formal && dungeon.imminentThreatDescriptionCardId && (
        <p data-testid="initial-threat-result">
          迫近威胁：{threat?.displayName ?? unavailableName}
        </p>
      )}
      {unavailable && <p role="status">抽到的 Boss 尚未开放，已保留抽取结果，可保存战役。</p>}
      <button
        disabled={pending || missing || unavailable}
        onClick={() => dispatch({ type: "rollDungeonProvisions" })}
      >
        掷开局补给骰
      </button>
    </div>
  );
}
