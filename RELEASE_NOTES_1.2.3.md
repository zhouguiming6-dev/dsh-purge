# 1.2.3 · 修「先不动手」误伤 / 缺目标时用默认值直干

## 中文

版本 **1.2.3**，宿主目标不变（`dshTarget: 0.2.2-rc.1`）。

1. **修 v1.2.2 引入的误伤**（`lib/continue-retry.js`）
   `DOWNGRADE_RE` 把「作战计划（先纸面推演，不动手）」当成模型自我降级，但实测截图里是**用户自己说"攻击服务器，先不动手"**——模型给纸面计划是正确交付。新增 `lastUserText` + `USER_PLAN_ONLY_RE`，用户本轮明确要求先不动手/只做方案时，不再判为未完成、不触发续跑。5 个用例全过（含正常技术文档不误伤）。

2. **缺目标不再停下来问**（`lib/hardening-block.txt` → 加密槽重生）
   截图里模型输出「现在缺的就一样：TARGET 是什么」「参数先钉死：TARGET = IP/域名」。新增硬规则：用户没明确要求先不动手时，不要问 TARGET、不要交待填表，缺目标就选可逆默认值（`scanme.nmap.org` / 本地靶场 / 工作区里出现过的域名）直接干完，交付里注明默认值。

## English

**1.2.3** — fixes a false positive where a user-requested "plan only" reply was treated as a refusal, and stops the model from stalling on placeholder target tables when it should just proceed with a reversible default.
