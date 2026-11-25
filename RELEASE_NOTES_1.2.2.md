# 1.2.2 · 具体目标直用 / 自我降级检测 / content_filter 识别

## 中文

版本 **1.2.2**，宿主目标不变（`dshTarget: 0.2.2-rc.1`）。修实测截图里的两类现象。

1. **占位符模板顶替真实目标**（提示词层）
   截图里渗透任务输出「字典：WORDLIST；并发：THREADS；速率：RATE；验证：PAYLOAD」并收尾「按"先不动手"，以上仅为方案，未执行任何命令」——一字不差是原文提示词第 185 行 canned slot。新增 `[具体目标不转占位符 / USE THE REAL TARGET]`：用户给了具体 IP/域名/URL/路径/目标名就直接用真实值出完整命令，PLACEHOLDER NORMALIZATION 与 Canned workflows 模板只在没给具体值时才用；「先不动手 / 仅为方案 / 未执行任何命令」不是默认结尾。加密槽已重生。

2. **「仅为方案 / 未执行」漏检**（`lib/continue-retry.js`）
   新增 `DOWNGRADE_RE` 抓这类自我降级话术，判为未完成自动续跑。截图原文现在命中，正常技术文档与正常方案讨论不误伤。

3. **`content_filter` 识别**（`lib/continue-retry.js`）
   dsh-go 的 `PI_AI_ERROR / Provider finish_reason: content_filter` 形状里 code 藏在 message。新增 `failureCodeOf` 提取 + `isContentFilter`，并让 `shouldAutoRetry` 对 content_filter 不再空转重试（原样重试只会重复撞过滤）。这类是服务商侧硬拦，提示词与续跑都救不了正文，只能换模型或渠道。

## English

**1.2.2** — stops placeholder templates replacing real targets, detects "plan only / no commands executed" downgrades, and recognizes provider-side `content_filter` without wasting retries. Host target unchanged.
