import { CardFace } from "../../card-art/card-face";
import { AssetPlaceholder } from "../asset-placeholder";
import type { FlowPhaseId } from "../phase/flow-phase";
import { PhasePlaceholder } from "../phase/phase-placeholder";
import type { TabletopBottomTab, TabletopHeroState } from "../tabletop-types";

const TABS: readonly { readonly id: TabletopBottomTab; readonly label: string }[] = [
  { id: "skills", label: "Skills" },
  { id: "items", label: "Items" },
  { id: "move", label: "Move" },
];

export function TabletopActionDock({
  phase: _phase,
  dockCaption,
  showSkillHand,
  tab,
  onTab,
  activeHero,
  selectedSkillId,
  usedSkillIds,
  onSelectSkill,
}: {
  readonly phase: FlowPhaseId; // reserved for T5 per-phase tabs
  readonly dockCaption: string;
  readonly showSkillHand: boolean;
  readonly tab: TabletopBottomTab;
  readonly onTab: (t: TabletopBottomTab) => void;
  readonly activeHero: TabletopHeroState;
  readonly selectedSkillId: string | null;
  readonly usedSkillIds: readonly string[];
  readonly onSelectSkill: (id: string | null) => void;
}) {
  void _phase;
  return (
    <section
      className="tt-dock tt-phase-surface"
      aria-label="行动底栏"
      data-testid="tabletop-action-dock"
    >
      {!showSkillHand && <PhasePlaceholder label={dockCaption} testId="tabletop-dock-phase-ph" />}
      {showSkillHand && (
        <>
          <div className="tt-dock__tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? "tt-dock__tab tt-dock__tab--on" : "tt-dock__tab"}
                onClick={() => onTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="tt-dock__panel" role="tabpanel">
            {tab === "skills" && (
              <div className="tt-skill-hand">
                {activeHero.skillIds.map((skillId) => {
                  const used = usedSkillIds.includes(skillId);
                  const selected = selectedSkillId === skillId;
                  return (
                    <div
                      key={skillId}
                      className={[
                        "tt-skill-card-wrap",
                        selected ? "tt-skill-card-wrap--selected" : "",
                        used ? "tt-skill-card-wrap--used" : "",
                      ].join(" ")}
                      data-testid={`tabletop-skill-${skillId}`}
                    >
                      <CardFace
                        skillId={skillId}
                        face={
                          activeHero.form === "beast" &&
                          ["hero_skill:p221", "hero_skill:p222"].includes(skillId)
                            ? "back"
                            : "front"
                        }
                        {...(activeHero.form === "beast" &&
                        ["hero_skill:p221", "hero_skill:p222"].includes(skillId)
                          ? { label: "Transform to Human" }
                          : {})}
                        size="sm"
                        selected={selected}
                        onSelect={() => onSelectSkill(selected ? null : skillId)}
                      />
                      {used && <span className="tt-skill-used">已用</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {tab === "items" && (
              <div className="tt-dock__placeholder">
                <AssetPlaceholder assetType="dice_net" label="补给骰面 / 饰品（占位）" />
              </div>
            )}
            {tab === "move" && (
              <p className="muted tt-dock__placeholder">移动 / 交互 / 换姿态（T0 仅占位分页）</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
