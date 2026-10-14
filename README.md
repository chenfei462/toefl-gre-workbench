# TOEFL / GRE Workbench · 研习台

本地优先的备考工作台：逐题练习 → 作答证据 → 错题 → 二刷 → 掌握度与优先级 → 每日处方 → 模考 checkpoint → 重规划。继续使用现有 React + TypeScript + Vite 内核。

支持练习计时、口语录音与自评、FSRS 词汇、陷阱分析、个人材料、学习历史及最后一周训练。邮箱账号可提供云快照、跨设备恢复和私有文件备份。

## 启动与检查

使用 Node.js 22.12+ 或兼容更新版本：

```sh
npm ci
npm run dev
```

检查：

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
git diff --check
```

生产离线验收（PowerShell）：

```powershell
$env:PLAYWRIGHT_PREVIEW = '1'
$env:PLAYWRIGHT_PORT = '4174'
npm run test:e2e -- tests/e2e/offline.spec.ts
Remove-Item Env:PLAYWRIGHT_PREVIEW, Env:PLAYWRIGHT_PORT
```

独立端口与产物目录防止测试运行互相干扰；同一工作区的构建及浏览器套件仍应顺序执行。普通开发 E2E 明确跳过需要生产 service worker 或真实 Supabase 的场景。

## 可选 Supabase

复制 `.env.example` 为 Git 忽略的 `.env.local`，配置公开浏览器变量：

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

缺少配置或未登录仍可本地学习。**secret/service-role key 不得放入前端、VITE 变量或 Git。**客户端允许 publishable key 或兼容 anon key。

版本化 SQL 在 `supabase/migrations/`。应用到已有项目之前检查表、数据、bucket 和 policies；不要删除或重置已有数据。快照采用 RLS 与原子 revision 比较，音频和材料 bucket 均为私有。详见 [schema](docs/cloud/SUPABASE_SCHEMA.md) 与 [RLS](docs/cloud/RLS_SECURITY.md)。

启动本项目的 Docker/Supabase 栈并配置本地公开环境后：

```powershell
node scripts/cloud-security.mjs
$env:CLOUD_E2E = '1'
$env:PLAYWRIGHT_PORT = '4187'
npm run test:e2e -- tests/e2e/cloud-restore.spec.ts
Remove-Item Env:CLOUD_E2E, Env:PLAYWRIGHT_PORT
```

本地服务测试不替代托管项目验收，最终证据见 [Cloud 验收](docs/cloud/FINAL_ACCEPTANCE.md)。

## 云同步与恢复

设置和首次设置界面支持邮箱注册/登录；需要邮箱确认时先确认。学习操作先保存本地，点击「立即同步」上传已保存数据。同步错误不会阻止本地练习。设置显示待同步、已同步、冲突、错误及上次同步时间。

新设备登录后「预览云端备份」再确认恢复。恢复将替换学习记录和题库，先保存本地恢复快照。checksum、格式、账号、并发或存储错误会中止恢复并保留已有数据。冲突可导出双方备份、明确保留本地或预览后使用云端；不静默采用最后一次写入。

录音与材料先存本地，显式同步再上传到用户私有路径；signed URL 不保存。上传失败仍可使用本地文件。托管套餐上传上限可能低于本地 100 MB 上限。

## 本地、备份与隐私

localStorage 保存学习记录，IndexedDB 保存题库、录音、材料与恢复快照。首次在线访问生产构建并成功安装 service worker 后，可离线刷新与训练；外部网站和尚未下载的文件不保证离线可用。

设置导出/导入学习 JSON；题库页可另行导出题库。JSON 包含元数据和云引用，不包含音频/PDF/DOCX 字节，请下载重要原文件。云同步快照携带完整题库。清除站点数据会删除本地记录和文件，操作前请备份。

退出账号保留本地数据。共享浏览器配置文件的人可访问其本地数据。云端采用认证、RLS、私有 bucket 和 HTTPS，未提供对托管运营方的端到端加密。本地重置不会删除云账号或完成云端数据注销。

## Vercel 与 CI

`vercel.json` 配置 Vite、`npm run build`、`dist` 与 SPA fallback。分别设置 Preview/Production 的公开 Supabase 变量；不要发布 loopback 地址。先验收 Preview，再按 [部署说明](docs/cloud/VERCEL_DEPLOYMENT.md) 完成生产检查。

GitHub Actions 包含静态、单元、构建和浏览器检查。只有实际成功的云端 run 可称为 CI 通过，本地结果不替代它。

## 使用边界

This tool does not provide official ETS scoring. TOEFL/GRE trademarks belong to their respective owners. Question provenance and copyright boundaries are respected. Local data remains usable without cloud.

正确率、自评和轨迹不是官方分数。受保护的 TestReady/POWERPREP 内容使用 reference-only 记录，不抓取付费题库或复制受保护音频。提供自适应计划、错题驱动复习和轨迹记录，不保证提分。

真实七天试用需记录实际学习与推荐反馈。测试、模拟日期和合成媒体不替代真实使用证据；不会根据一两天反馈自动改算法权重。

更多：[学习手册](docs/STUDY_OS_USER_GUIDE.md) · [云架构](docs/cloud/CLOUD_ARCHITECTURE.md) · [测试](docs/cloud/CLOUD_TESTING.md) · [恢复](docs/cloud/CONFLICT_RECOVERY.md) · [运维](docs/cloud/OPERATIONS_RUNBOOK.md)
