/**
 * Resolve a Python executable for print-card-art wrappers.
 *
 * Order: DDBG_PYTHON → (win32: py -3, python) → python3 / python.
 * Skips the Windows Store "python3" stub that opens the Microsoft Store.
 */
import { spawnSync } from "node:child_process";

const STORE_STUB_RE =
  /Microsoft Store|install (it )?from the Microsoft Store|App execution aliases/i;

function probeOutput(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 8000,
    windowsHide: true,
  });
  const text = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return { result, text };
}

function isStoreStub(command, args) {
  const { result, text } = probeOutput(command, args);
  if (result.error) {
    return false;
  }
  return STORE_STUB_RE.test(text);
}

function isUsable(command, args) {
  if (isStoreStub(command, args)) {
    return false;
  }
  const { result } = probeOutput(command, args);
  return !result.error && result.status === 0;
}

/**
 * @returns {{ command: string, argsPrefix: string[] }}
 */
export function resolvePythonInvocation() {
  const fromEnv = process.env.DDBG_PYTHON?.trim();
  if (fromEnv) {
    if (!isUsable(fromEnv, ["--version"])) {
      throw new Error(`DDBG_PYTHON is set but not runnable: ${fromEnv}`);
    }
    return { command: fromEnv, argsPrefix: [] };
  }

  const candidates =
    process.platform === "win32"
      ? [
          { command: "py", argsPrefix: ["-3"] },
          { command: "python", argsPrefix: [] },
          { command: "python3", argsPrefix: [] },
        ]
      : [
          { command: "python3", argsPrefix: [] },
          { command: "python", argsPrefix: [] },
        ];

  for (const { command, argsPrefix } of candidates) {
    if (isUsable(command, [...argsPrefix, "--version"])) {
      return { command, argsPrefix };
    }
  }

  throw new Error(
    "No usable Python found. Set DDBG_PYTHON or install Python 3.10+ (Windows: py -3).",
  );
}

export function spawnPython(scriptPath, userArgs, options) {
  const { command, argsPrefix } = resolvePythonInvocation();
  return spawnSync(command, [...argsPrefix, scriptPath, ...userArgs], options);
}
