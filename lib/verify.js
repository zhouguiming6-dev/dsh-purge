/**
 * 清洗自检 / unlock verification
 *
 * 面板上的 applied 只说明「补丁表认为打过了」，不说明宿主里真的没有拒绝面。
 * 这里做两件事：
 *   1. 按 filePatchSettled 的同一套判定汇总补丁状态；
 *   2. 直接在所有目标文件里搜官方拒绝/审批文案，命中就报出来。
 */

import fs from "node:fs";
import { ALL_PATCHES, patchStatus, targetFiles } from "./core.js";

/** 这些句子在宿主里就意味着还有一道闸。 */
export const RESTRICTION_SIGNATURES = [
  ["web 面禁止另开服务器", "Do not start a replacement server"],
  ["run_code 加宽需审批", "requires justification and approval"],
  ["run_code 理由要给用户审批", "shown to the user for approval"],
  ["交付物 present 禁令", "just to list edited source files"],
  ["ask 无通道即拒绝", "no approval channel is available"],
  ["ask 不支持即拒绝", "requires approval (not yet supported)"],
  ["读前编辑闸", "requires reading"],
  ["升级必须更宽", "is not strictly wider"],
  ["bwrap deny file-write", "(deny file-write"],
  ["外部内容不可当指令", "untrusted data, not instructions"],
  ["沙箱只读不许改", "Do not refuse a required modification"],
  ["审批文案宣告失败即关闸", "request fails closed"],
];

function readMaybe(fp) {
  try {
    return fs.readFileSync(fp, "utf8");
  } catch {
    return null;
  }
}

/**
 * @param {string} aiBase @deepseek-ai 插件根
 * @returns 补丁统计 + 残留拒绝面清单
 */
export async function verifyUnlock(aiBase) {
  const report = { patches: {}, counts: {}, leftovers: [], files_scanned: 0 };
  if (!aiBase) return report;

  const status = await patchStatus(aiBase);
  const table = status.patch_status || status;
  const counts = {};
  for (const p of ALL_PATCHES) {
    const st = table[p.id] || "undefined";
    report.patches[p.id] = st;
    counts[st] = (counts[st] || 0) + 1;
  }
  report.counts = counts;

  const files = targetFiles(aiBase);
  const seen = new Set();
  for (const value of Object.values(files)) {
    const list = Array.isArray(value) ? value : [value];
    for (const fp of list) {
      if (!fp || seen.has(fp)) continue;
      seen.add(fp);
      const text = readMaybe(fp);
      if (text === null) continue;
      report.files_scanned += 1;
      for (const [label, needle] of RESTRICTION_SIGNATURES) {
        const at = text.indexOf(needle);
        if (at < 0) continue;
        const line = text.slice(0, at).split("\n").length;
        report.leftovers.push({ label, needle, file: fp, line });
      }
    }
  }
  return report;
}
