import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FormalHeroName, HeroSkillCardView } from "@ddbg/engine";
import { CardFace } from "../../card-art/card-face";
import {
  HERO_ACTIVITY_CANCEL_BUTTON_HEIGHT_PX,
  HERO_ACTIVITY_CANCEL_BUTTON_WIDTH_PX,
  HERO_ACTIVITY_CONFIRM_BUTTON_HEIGHT_PX,
  HERO_ACTIVITY_CONFIRM_BUTTON_WIDTH_PX,
  heroActivityCancelButtonUrl,
  heroActivityConfirmButtonUrl,
  selectedAbilityFrameUrl,
} from "../../card-art/resolve-assets-plus-art";
import { heroSkillIconUrl } from "../../card-art/resolve-hero-skill-icon-art";
import { EmbarkSkillStanceSummary } from "./embark-skill-stance-summary";

type EmbarkSkillOption = Pick<HeroSkillCardView, "id" | "top_row_icons"> & {
  readonly name: string;
};

export function EmbarkSkillIconPicker({
  seatIndex,
  heroName,
  skills,
  selectedSkillIds,
  skillsConfirmed,
  onSkillsConfirmedChange,
  onToggleSkill,
}: {
  readonly seatIndex: number;
  readonly heroName: FormalHeroName;
  readonly skills: readonly EmbarkSkillOption[];
  readonly selectedSkillIds: readonly string[];
  readonly skillsConfirmed: boolean;
  readonly onSkillsConfirmedChange: (confirmed: boolean) => void;
  readonly onToggleSkill: (skillId: string) => void;
}) {
  return (
    <div
      className={[
        "embark-skill-loadout",
        skillsConfirmed ? "embark-skill-loadout--locked" : "",
      ].join(" ")}
    >
      <div className="embark-skill-position-row">
        <EmbarkSkillStanceSummary skills={skills} selectedSkillIds={selectedSkillIds} />
        <button
          type="button"
          className="embark-skill-activity-btn"
          data-testid={`embark-skill-activity-btn-${seatIndex}`}
          aria-label={skillsConfirmed ? "取消确认，重新选择技能" : "确认技能选择"}
          onClick={() => onSkillsConfirmedChange(!skillsConfirmed)}
        >
          <span className="embark-skill-activity-btn__stack">
            <img
              src={heroActivityCancelButtonUrl()}
              alt=""
              width={HERO_ACTIVITY_CANCEL_BUTTON_WIDTH_PX}
              height={HERO_ACTIVITY_CANCEL_BUTTON_HEIGHT_PX}
              className="embark-skill-activity-btn__cancel"
            />
            <img
              src={heroActivityConfirmButtonUrl()}
              alt=""
              width={HERO_ACTIVITY_CONFIRM_BUTTON_WIDTH_PX}
              height={HERO_ACTIVITY_CONFIRM_BUTTON_HEIGHT_PX}
              className={[
                "embark-skill-activity-btn__confirm",
                skillsConfirmed ? "embark-skill-activity-btn__confirm--hidden" : "",
              ].join(" ")}
            />
          </span>
        </button>
      </div>
      <div className="embark-skill-icons-row">
        <div className="embark-skill-icons-scroll">
          <div className="embark-skill-icons">
            {skills.map((skill) => {
              const selected = selectedSkillIds.includes(skill.id);
              return (
                <EmbarkSkillIcon
                  key={skill.id}
                  heroName={heroName}
                  skillId={skill.id}
                  skillName={skill.name}
                  selected={selected}
                  locked={skillsConfirmed}
                  onToggle={() => onToggleSkill(skill.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmbarkSkillIcon({
  heroName,
  skillId,
  skillName,
  selected,
  locked,
  onToggle,
}: {
  readonly heroName: FormalHeroName;
  readonly skillId: string;
  readonly skillName: string;
  readonly selected: boolean;
  readonly locked: boolean;
  readonly onToggle: () => void;
}) {
  const iconUrl = heroSkillIconUrl(heroName, skillName);
  const [iconMissing, setIconMissing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [previewAnchor, setPreviewAnchor] = useState<{ x: number; y: number } | null>(null);

  const syncPreviewAnchor = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPreviewAnchor({ x: rect.left + rect.width / 2, y: rect.bottom });
  }, []);

  return (
    <div
      ref={wrapRef}
      className="embark-skill-icon-wrap"
      onMouseEnter={() => {
        if (locked) return;
        setHovered(true);
        syncPreviewAnchor();
      }}
      onMouseLeave={() => {
        setHovered(false);
        setPreviewAnchor(null);
      }}
    >
      <button
        type="button"
        className={["embark-skill-icon", selected ? "embark-skill-icon--selected" : ""].join(" ")}
        data-testid={`embark-skill-icon-${skillId}`}
        aria-pressed={selected}
        aria-label={skillName}
        disabled={locked}
        onClick={(e) => {
          if (locked) return;
          onToggle();
          e.currentTarget.blur();
        }}
      >
        <span className="embark-skill-icon__frame-slot">
          {selected && (
            <img
              src={selectedAbilityFrameUrl()}
              alt=""
              className="embark-skill-icon__selected-frame"
              aria-hidden="true"
            />
          )}
          <span className="embark-skill-icon__art">
            {!iconMissing ? (
              <img
                src={iconUrl}
                alt=""
                className="embark-skill-icon__img"
                onError={() => setIconMissing(true)}
              />
            ) : (
              <span className="embark-skill-icon__fallback" aria-hidden="true">
                {skillName.slice(0, 1)}
              </span>
            )}
          </span>
        </span>
      </button>
      {!locked &&
        hovered &&
        previewAnchor &&
        createPortal(
          <div
            className="embark-skill-icon-preview embark-skill-icon-preview--fixed"
            style={{ left: previewAnchor.x, top: previewAnchor.y }}
            aria-hidden={false}
          >
            <CardFace skillId={skillId} size="md" />
          </div>,
          document.body,
        )}
    </div>
  );
}
