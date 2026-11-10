import { useState } from "react";
import type { PendingChoice } from "@ddbg/engine";

export function FundraiserChoice({
  choice,
  availableGold,
  choose,
}: {
  choice: PendingChoice;
  availableGold: number;
  choose: (id: string) => void;
}) {
  const [selected, setSelected] = useState(choice.options[0]!.id);
  const [custom, setCustom] = useState("");
  const customSelected = selected === "custom";
  const amount = Number(custom);
  const validCustom =
    /^(0|[1-9]\d*)$/.test(custom) && Number.isSafeInteger(amount) && amount <= availableGold;
  return (
    <div>
      <label>
        捐献金币
        <select
          aria-label="捐献金币"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {choice.options
            .filter((o) => o.id !== "cancel")
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          {availableGold > 60 && <option value="custom">自订金额</option>}
        </select>
      </label>
      {customSelected && (
        <label>
          自订捐献金额
          <input
            type="number"
            min={0}
            max={availableGold}
            step={1}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
      )}
      <button
        disabled={customSelected && !validCustom}
        onClick={() => choose(customSelected ? `give:${amount}` : selected)}
      >
        确认捐献
      </button>{" "}
      <button onClick={() => choose("cancel")}>取消捐献</button>
    </div>
  );
}
