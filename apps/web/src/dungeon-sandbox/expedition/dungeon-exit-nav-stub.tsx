import type { GameState } from "@ddbg/engine";

/** 回村/已离开阶段仍保留探索按钮占位，供 e2e 断言禁用态。 */
export function DungeonExitNavStub({ game }: { game: GameState }) {
  const d = game.dungeon!;
  if (d.phase !== "exited" && !d.hamletReturn) return null;
  return (
    <p className="dungeon-exit-nav-stub">
      <button type="button" disabled>
        离开地牢
      </button>{" "}
      <button type="button" disabled>
        选择下一段探索
      </button>
    </p>
  );
}
