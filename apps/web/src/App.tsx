import { applyCommand, createInitialState } from "@ddbg/engine";

const probe = applyCommand(createInitialState(1), {
  type: "ping",
  message: "engine-ok",
});
const probeMessage = probe.events[0]?.message ?? "";

export function App() {
  return (
    <main className="min-h-screen bg-stone-950 px-8 py-10 text-stone-100">
      <h1 className="text-3xl font-semibold tracking-tight">暗黑地牢桌游</h1>
      <p className="mt-3 text-stone-400">DDBG</p>
      <p className="mt-6 font-mono text-sm" data-testid="engine-value">
        {probeMessage}
      </p>
    </main>
  );
}
