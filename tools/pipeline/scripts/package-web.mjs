#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dist = path.join(root, "apps/web/dist");
const deployRoot = path.join(root, "deploy");
const target = path.join(deployRoot, "web");
const relativeTarget = path.relative(root, target);

if (relativeTarget !== path.join("deploy", "web"))
  throw new Error(`拒绝写入非 deploy/web 目录：${relativeTarget}`);
if (!existsSync(path.join(dist, "index.html")))
  throw new Error("缺少 apps/web/dist/index.html；先运行 pnpm build");

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(dist, target, { recursive: true });

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
};
walk(target);

const tests = files.filter((file) => /\.test\.(?:ts|tsx)$/.test(file));
if (tests.length) {
  rmSync(target, { recursive: true, force: true });
  throw new Error(`部署目录混入测试文件：${tests.join(", ")}`);
}

const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
const forbiddenNames = files.filter((file) => /\.(?:json|ts|tsx)$/.test(file));
if (forbiddenNames.length)
  console.warn(`[package-web] 注意：部署目录含 ${forbiddenNames.length} 个 .json/.ts 文件`);

console.log(
  `[package-web] deploy/web: ${files.length} 个文件，${(bytes / 1024 / 1024).toFixed(2)} MiB`,
);
console.log("[package-web] 只上传 deploy/web；不要上传仓库根目录。");
