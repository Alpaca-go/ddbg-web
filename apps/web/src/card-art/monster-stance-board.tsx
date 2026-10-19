import { useState, type ReactNode } from "react";
import type { SkillStance } from "@ddbg/engine";
import {
  cachedPrintMonsterStanceUrl,
  lookupMonsterStanceBoard,
  type MonsterStanceSlotEntry,
} from "./resolve-print-monster-stance-art";

export function stanceColumnHasOccupants(occupantCount: number): boolean {
  return occupantCount > 0;
}

export function MonsterStanceBoard({
  sideLabel,
  testIdPrefix,
  slots,
  occupantCountByStance,
  renderOccupants,
}: {
  readonly sideLabel: string;
  readonly testIdPrefix: string;
  readonly slots: readonly MonsterStanceSlotEntry[];
  readonly occupantCountByStance: Readonly<Record<SkillStance, number>>;
  readonly renderOccupants: (stance: SkillStance) => ReactNode;
}) {
  const board = lookupMonsterStanceBoard("front");
  const boardUrl = board ? cachedPrintMonsterStanceUrl(board) : "";
  const [failed, setFailed] = useState(!board);

  return (
    <div className="monster-stance-board" data-testid={`${testIdPrefix}-board`}>
      <div className="monster-stance-board-art" aria-hidden={failed}>
        {!failed && board && (
          <img
            src={boardUrl}
            alt={`${sideLabel}站位板（印刷 Monster Stance）`}
            className="monster-stance-board-img"
            data-testid={`${testIdPrefix}-board-img`}
            data-card-art="print"
            onError={() => setFailed(true)}
          />
        )}
        {failed && (
          <div
            className="monster-stance-board-placeholder"
            data-testid={`${testIdPrefix}-board-placeholder`}
            data-card-art="placeholder"
          >
            <span>无本地站位板图</span>
            <span className="muted">导出印刷 PNG 至 .cache/print-card-art</span>
          </div>
        )}
      </div>
      <div className="monster-stance-board-columns" role="list">
        {slots.map((slot) => {
          const stance = slot.stance as SkillStance;
          const count = occupantCountByStance[stance] ?? 0;
          const active = stanceColumnHasOccupants(count);
          return (
            <div
              key={stance}
              className={`monster-stance-column monster-stance-column-${stance} ${active ? "has-occupants" : ""}`}
              role="listitem"
              data-testid={`${testIdPrefix}-column-${stance}`}
              data-stance={stance}
              data-occupant-count={count}
            >
              <div className="monster-stance-column-head">
                <span className="stance-rank" aria-hidden="true">
                  {slot.rank}
                </span>
                <span className="stance-label">{slot.labelZh}</span>
              </div>
              <div className="monster-stance-column-body">{renderOccupants(stance)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
