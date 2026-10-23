import { aggregateLitHeroSkillStanceCounts, type HeroSkillCardView } from "@ddbg/engine";
import {
  EMBARK_ROSTER_POSITION_STANCES,
  embarkPositionStanceGlowTier,
  embarkRosterPositionUrl,
} from "../../card-art/resolve-assets-plus-art";
import { stanceLabels } from "./formal-party";

export function EmbarkSkillStanceSummary({
  skills,
  selectedSkillIds,
}: {
  readonly skills: readonly Pick<HeroSkillCardView, "id" | "top_row_icons">[];
  readonly selectedSkillIds: readonly string[];
}) {
  const selected = skills.filter((s) => selectedSkillIds.includes(s.id));
  const counts = aggregateLitHeroSkillStanceCounts(selected);

  return (
    <div className="embark-skill-lights" data-testid="embark-skill-lights">
      <ol className="embark-skill-lights__track" aria-label="偏好位置">
        {EMBARK_ROSTER_POSITION_STANCES.map((stance) => {
          const count = counts[stance];
          const glowTier = embarkPositionStanceGlowTier(count);
          const title =
            selected.length === 0
              ? `${stanceLabels[stance]}：未选技能`
              : `${stanceLabels[stance]}：${count}/${selected.length} 张已选技能可在此姿态使用`;
          return (
            <li
              key={stance}
              className={[
                "embark-skill-position-slot",
                count === 0 ? "embark-skill-position-slot--muted" : "",
                glowTier === 2 ? "embark-skill-position-slot--glow-2" : "",
                glowTier === 3 ? "embark-skill-position-slot--glow-3" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={title}
            >
              <div className="embark-skill-position-slot__core">
                <img
                  src={embarkRosterPositionUrl(stance)}
                  alt=""
                  className="embark-skill-position-slot__img"
                  aria-label={title}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
