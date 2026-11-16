#!/usr/bin/env node
/**
 * 宿主升级后一键修复 / repair after a host upgrade
 *
 * dsh-go / dsh 升级内置运行时时，`/opt/dsh`（或桌面端 resources）会被整体换回官方原版，
 * 打过补丁的文件和 `.dshpurge.bak` 一起消失，面板上会显示一堆 skipped / missing。
 * 这个脚本做三件事：
 *   1. 确认装的是本仓库这一版（core.js 里有本地强化层接线与 0.2.x 文件键）
 *   2. 跑 `dsh-purge --apply` 重打
 *   3. 跑 `dsh-purge --verify` 自检，并列出仍然残留的拒绝面
 *
 * 用法：
 *   node scripts/repair-local.mjs          # 应用 + 自检
 *   node scripts/repair-local.mjs --check   # 只看状态，不写入
 *   DSH_BASE=/path/to/@deepseek-ai node scripts/repair-local.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, "..");
const checkOnly = process.argv.includes("--check");

function sh(cmd, args, env) {
  return execFileSync(cmd, args, { env: { ...process.env, ...env }, encoding: "utf8" });
}

function fail(msg) {
  console.error("ERROR: " + msg);
  process.exit(1);
}

if (!fs.existsSync(path.join(PKG, "package.json"))) fail("找不到插件包根: " + PKG);
const pkg = JSON.parse(fs.readFileSync(path.join(PKG, "package.json"), "utf8"));
console.log(`dsh-purge ${pkg.version} @ ${PKG}`);

// 1. 本地强化层是否在位
const corePath = path.join(PKG, "lib", "core.js");
if (!fs.existsSync(corePath)) fail("缺少 lib/core.js");
const core = fs.readFileSync(corePath, "utf8");
const wired = {
  "applyLocalOverrides 调用": core.includes("applyLocalOverrides(ALL_PATCHES)"),
  "dsh-tools-pipeline 文件键": core.includes('"dsh-tools-pipeline"'),
  "ptc-executor 文件键": core.includes('"ptc-executor"'),
  "harness-dev-context 文件键": core.includes('"harness-dev-context"'),
  "deliverable-refs 文件键": core.includes('"deliverable-refs"'),
};
let allWired = true;
for (const [k, ok] of Object.entries(wired)) {
  console.log(`  ${ok ? "✓" : "✗"} ${k}`);
  if (!ok) allWired = false;
}
if (!allWired) {
  console.error("\n这个 core.js 不是本仓库的修复版（缺本地强化层接线）。");
  console.error("请重新安装本仓库版本，而不是继续在旧包上打补丁。");
  process.exit(2);
}

if (checkOnly) {
  console.log("\n--check: 只检查，不写入。");
  process.exit(0);
}

// 2. 重打 + 3. 自检
const bin = path.join(PKG, "bin", "dsh-purge.js");
if (!fs.existsSync(bin)) fail("缺少 bin/dsh-purge.js");

const env = process.env.DSH_BASE ? { DSH_BASE: process.env.DSH_BASE } : {};
try {
  const apply = sh(process.execPath, [bin, "--apply"], env);
  console.log("\n" + apply.trim().split("\n").slice(-3).join("\n"));
} catch (e) {
  console.error("apply 失败:\n" + (e.stdout || "") + (e.stderr || ""));
  process.exit(1);
}

let verifyOut = "";
try {
  verifyOut = sh(process.execPath, [bin, "--verify"], env);
} catch (e) {
  verifyOut = (e.stdout || "") + (e.stderr || "");
  console.error("verify 报错:\n" + verifyOut.slice(-800));
  process.exit(1);
}
console.log("\n" + verifyOut.trim().split("\n").slice(-4).join("\n"));

const leftovers = /✓ 没有残留拒绝面/.test(verifyOut) ? 0 : 1;
console.log(leftovers ? "\n还有残留拒绝面，见上面的 verify 输出。" : "\n清洗完整。");
process.exit(leftovers);
