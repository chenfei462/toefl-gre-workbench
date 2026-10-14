# Study OS 验收记录

日期：2026-10-14。基线 fa80e7c；开发分支 codex/study-os-integration。原始要求见 docs/upstream/USER_REQUIREMENTS.md。

## G0 基线
初始工作区干净。typecheck、lint、build通过；24个文件115个测试通过。

## 范围及证据
| Phase | 交付 | 验证证据 |
|---|---|---|
|0|8份上游审计、采纳矩阵、真实license和文件路径|检查11个引用仓库的在线metadata/tree，选择性阅读manifest/license/source；未运行上游应用|
|1|持久PracticeSession、计时导航标记确认结果|20题13对7错→20 Attempts/7 Errors；幂等提交、刷新、备份、真实IndexedDB材料、排序题测试|
|2|Speaking Player、IndexedDB录音、复听自评|MediaRecorder生命周期/拒权/失败/取消/存储失败测试；真实Chromium模拟麦克风录制、audio.play时间推进、刷新恢复|
|3|ts-fsrs词汇卡、四评分、历史和mastery证据|100词20Again/20Hard/50Good/10Easy产生4种due时间；旧词保留、坏数据拒绝、即刻新增可复习|
|4|14类TrapType、三层分析、重复陷阱、生词转入|保存/导入/二刷保留；补充题号不丢分析；跨科富化技能和同作答多个错误保持关联|
|5|可执行今日处方、实际历史、晚间复习、明日计划|7天模拟168题+7次词汇复习、84错误、36二刷，TC→RC推荐随表现变化；备份后排序一致|
|6|独立MockSession、分科/总分checkpoint、证据权重|合法分制、幂等、同日最新结果、无总分分科checkpoint、权重与历史测试|
|7|FINAL WEEK、真实日期紧迫度、混合弱项、预留错题/模考时间|预算/边界/近期模考/最后一天测试；浏览器验证混合选题|
|8|关键A–F流程及口语/材料/FinalWeek|9条Chromium E2E全部通过，含390×844无横向溢出|
|9|push/PR CI|workflow含npm ci/typecheck/lint/test/build/browser install/e2e；本地同等命令验证，未宣称云端已执行|
|10|开发流程、handoff、用户说明|docs/upstream/DEVELOPMENT_WORKFLOW.md与本验收记录|

## G9 独立审查与G10修复回归
使用独立子代理阅读规格和diff：上游审计代理审查Practice/Speaking/FSRS/Mock/存储；Practice代理审查Speaking/Materials/Traps；Speaking代理审查Mock/Traps。作者自审不计独立审查。

已修复：词汇时钟冻结、新增词不显示；未校验FSRS导入；保存失败提示被成功toast遮盖；补充批量错题丢失分析/二刷；模考重复提交；处方参数被忽略；session用时未计入日报；缺失计时被视为最快；分科模考无checkpoint；同日旧成绩覆盖新成绩；空词义不能补充；同一作答多个错误技能关联丢失；富化跨科技能不可编辑；录音保存失败保护；空audio src。

新增测试先运行并观察失败，再修复；旧assertions保留。V1迁移幂等测试暴露新字段默认值不一致，修复初始化默认数组后通过。

## 最终命令结果
- `npm run typecheck`: PASS
- `npm run lint`: PASS，无lint诊断
- `npm test`: PASS，37文件161测试
- `npm run build`: PASS，主JS约570KB（gzip174KB）；Vite提示chunk超过500KB，功能无构建错误
- `npm run test:e2e`: PASS，9/9，58.5秒，顺序单次运行

一次重叠Playwright运行曾因共享trace产物被另一运行删除和共享server关闭导致ENOENT/connection refused；停止并行运行后全套9/9通过。此失败按测试编排根因处理，没有删除assertion。

## 明确的验证边界
- 麦克风许可、录音、播放采用真实Chromium媒体实现与模拟音源；未使用用户物理麦克风。
- 七天证据为可重复模拟，不是已经完成七天真实学习或证明考试提分。
- CI已编写，本次未推送/部署，未产生GitHub Actions云端运行记录。
- JSON含口语metadata、材料目录；二进制音频/材料通过单独下载备份。PDF/DOCX原文存储与打开支持，不宣称自动内容解析/抽题。
