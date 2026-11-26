import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { preProcessFile } from "typescript";
import { expect, it } from "vitest";
import dataPackage from "../../package.json";
import enginePackage from "../../../engine/package.json";

const dataRoot = fileURLToPath(new URL("../..", import.meta.url));
const engineRoot = resolve(dataRoot, "../engine");

function workspaceImports(entry: string) {
  const files = new Set([entry]);
  const imports = new Set<string>();
  for (const file of files) {
    if (extname(file) === ".json") continue;
    const { importedFiles } = preProcessFile(readFileSync(file, "utf8"), true, false);
    for (const { fileName } of importedFiles) {
      if (!fileName.startsWith(".")) {
        imports.add(fileName);
        continue;
      }
      const path = resolve(dirname(file), fileName);
      const target = [path, path + ".ts", resolve(path, "index.ts")].find(
        (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
      );
      if (!target) throw new Error("无法解析工作区依赖：" + file + " → " + fileName);
      files.add(target);
    }
  }
  return { files, imports };
}

it("运行时入口保留 engine → data 依赖方向，文件系统通过写入子入口访问", () => {
  const data = workspaceImports(resolve(dataRoot, dataPackage.exports["."]));
  const engine = workspaceImports(resolve(engineRoot, enginePackage.exports["."]));
  const writers = workspaceImports(resolve(dataRoot, dataPackage.exports["./write"]));

  expect([...data.files].some((file) => file.startsWith(engineRoot))).toBe(false);
  expect([...engine.files].some((file) => file.startsWith(resolve(dataRoot, "normalized")))).toBe(
    true,
  );
  for (const graph of [data, engine]) {
    expect(
      [...graph.imports].filter((name) =>
        /^(?:node:|react(?:\/|$)|react-dom(?:\/|$)|zustand(?:\/|$)|@ddbg\/engine$)/.test(name),
      ),
    ).toEqual([]);
    expect([...graph.files].some((file) => file.startsWith(resolve(dataRoot, "../../apps")))).toBe(
      false,
    );
  }
  expect(writers.imports.has("node:fs")).toBe(true);
});
