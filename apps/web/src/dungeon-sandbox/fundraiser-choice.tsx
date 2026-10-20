import { useState } from "react";
import type { PendingChoice } from "@ddbg/engine";

export function FundraiserChoice({
  choice,
  choose,
}: {
  choice: PendingChoice;
  choose: (id: string) => void;
}) {
  const [selected, setSelected] = useState(choice.options[0]!.id);
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
        </select>
      </label>
      <button onClick={() => choose(selected)}>确认捐献</button>{" "}
      <button onClick={() => choose("cancel")}>取消捐献</button>
    </div>
  );
}
