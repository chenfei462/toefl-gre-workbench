# TOEFL/GRE WORKBENCH — CODEX COMPLETE CONTINUATION CONTROLLER

你现在完整接管：

`https://github.com/chenfei462/toefl-gre-workbench`

后续所有开发。

项目已经完成主要 Study OS 功能。

本阶段不再重新设计产品核心，不再重写 Mastery / Priority / Prescription。

当前最高目标：

> 把已经可以本地使用的 TOEFL/GRE Score Improvement Operating System，安全升级为可部署、可跨设备同步、离线可用、数据不丢失、可在未来 30 天真实备考中长期使用的正式版本。

---

# 0. 当前已知基线

历史验收记录显示已经完成：

```text
PracticeSession

Speaking Player

MediaRecorder lifecycle

IndexedDB recordings

ts-fsrs vocabulary

TrapType / Error analysis

Daily Prescription

Study History

MockSession

Score Checkpoint

Final Week Mode

Question Bank

reference-only questions

Materials

Backup

Adaptive Mastery

Priority Engine

Rolling planning

Mobile UX

Playwright E2E

CI workflow
```

最近一次已报告：

```text
npm run typecheck
PASS

npm run lint
PASS

npm test
37 files
161 tests
PASS

npm run build
PASS

npm run test:e2e
9 / 9 PASS
```

但不要盲信历史报告。

第一阶段必须重新获取当前真实基线。

---

# 1. 最高行为原则

本项目已经进入：

# STABILITY + CLOUD + REAL USE

阶段。

优先级：

```text
数据安全
>
现有备考闭环稳定
>
离线能力
>
云同步
>
跨设备恢复
>
权限安全
>
部署可靠性
>
性能
>
UI polish
>
新增功能
```

禁止为了“现代化架构”大规模重写已经通过验证的代码。

---

# 2. Codex 全权执行模式

除以下 HARD BLOCKER 外：

不要反复向用户确认：

```text
是否继续
是否修复
是否新增测试
是否添加migration
是否重构局部实现
是否创建Supabase表
是否运行测试
是否运行build
是否创建Preview
```

采取：

```text
Inspect
→ Decide
→ Implement
→ Test
→ Review
→ Repair
→ Continue
```

策略。

如果有两个合理方案：

选择：

```text
风险最低
改动最小
可回滚
最容易验证
最保护用户数据
```

的方案。

---

# 3. 不允许重新实现已有核心

以下模块除非发现明确 bug，否则：

# DO NOT REWRITE

```text
mastery.ts

priority.ts

prescription.ts

trajectory.ts

spaced review

FSRS vocabulary

Error Lab

Trap analysis

Question Bank

Practice Session

Mock Session

Final Week

Dashboard decision engine

V1/V2 migration
```

如果发现问题：

执行局部 Repair。

不要整个重写。

---

# 4. 第一阶段：Repository Audit

立即检查真实：

```text
git status

git branch

git log --oneline -20

package.json

package-lock / pnpm-lock / yarn.lock

src/

tests/

playwright config

.github/workflows/

docs/

vite config

StorageAdapter

IndexedDB layer

export/import

Supabase-related files if already present
```

确认：

```text
当前branch
HEAD
dirty files
用户未提交修改
已有CI
已有环境变量
已有Playwright配置
已有部署配置
```

输出：

```text
docs/cloud/CLOUD_BASELINE.md
```

---

# 5. Baseline Gate

先运行真实脚本。

不得假设脚本存在。

从 package.json 读取。

目标至少：

```text
typecheck

lint

unit/integration tests

build

e2e
```

同时：

```text
git diff --check
```

保存结果：

```text
docs/cloud/CLOUD_BASELINE.md
```

如果当前已有 failure：

分类：

```text
PRE_EXISTING_FAILURE

REGRESSION

ENVIRONMENT_FAILURE
```

---

# 6. 当前总体架构原则

必须保留：

# LOCAL-FIRST

当前浏览器数据层仍是主要运行时数据来源。

推荐：

```text
React App
    │
    ├── Local Data
    │     ├── localStorage
    │     └── IndexedDB
    │
    └── Cloud Sync
          ↓
       Supabase
```

禁止：

```text
React
↓
所有保存都直接等Supabase
↓
断网就无法学习
```

正确：

```text
用户操作
↓
本地立即保存
↓
UI成功
↓
异步/显式同步云端
```

---

# 7. 本阶段 Supabase 角色

Supabase 第一阶段只负责：

```text
Auth

Cloud Snapshot

Cross-device Restore

Sync Metadata

Speaking Recording Storage

Study Material Storage
```

暂时不要把：

```text
Question
Attempt
Error
Vocabulary
Task
```

全部拆成复杂 relational SaaS schema。

考试前优先稳定。

---

# 8. Supabase 客户端

使用官方：

```text
@supabase/supabase-js
```

建立：

```text
src/cloud/
```

推荐：

```text
src/cloud/
  client.ts
  auth.ts
  sync.ts
  snapshot.ts
  conflict.ts
  storage.ts
  types.ts
```

组件禁止到处直接：

```ts
supabase.from(...)
```

统一通过 Cloud Service。

---

# 9. 环境变量

前端允许：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

或者当前 Supabase 项目实际推荐的公开 key 名称。

禁止：

```text
SUPABASE_SERVICE_ROLE_KEY
```

进入浏览器。

Service Role：

# NEVER EXPOSE CLIENT SIDE

不得写入：

```text
src/
public/
VITE_*
git repository
```

---

# 10. 环境变量验证

新增启动验证。

如果缺：

```text
Supabase URL
publishable key
```

应用不能崩。

应该：

```text
Cloud Sync unavailable

Local mode remains usable
```

本地学习功能仍正常工作。

---

# 11. Supabase Auth

第一版只做：

# EMAIL AUTH

不要现在同时开发：

```text
Google
Apple
GitHub
微信
手机号
```

支持：

```text
Sign Up

Sign In

Sign Out

Session Restore
```

如果用户未登录：

```text
Local-only mode
```

如果登录：

```text
Cloud Sync available
```

---

# 12. Auth UI

Settings 增加：

```text
Cloud Account

Not signed in
[Sign in]

or

Signed in
email
Last sync
[Sync now]
[Sign out]
```

不要强制用户登录才能学习。

---

# 13. Cloud Schema

第一版优先建立：

## workbench_snapshots

建议：

```sql
create table workbench_snapshots (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  schema_version integer not null,

  revision bigint not null,

  base_revision bigint,

  device_id text not null,

  checksum text not null,

  state jsonb not null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique(user_id)
);
```

根据项目实际需求可以调整。

但必须满足：

```text
一个用户有明确latest snapshot

revision可进行并发控制

有checksum

知道哪个device写入
```

---

# 14. 同步不能只用 updated_at

不能做：

```text
谁最后上传
谁覆盖一切
```

至少实现：

# REVISION-BASED OPTIMISTIC CONCURRENCY

本地维护：

```ts
interface CloudSyncMeta {
  deviceId: string

  localRevision: number

  lastSyncedRevision: number

  lastCloudRevision?: number

  lastSyncAt?: string

  syncStatus:
    | "local_only"
    | "synced"
    | "pending"
    | "conflict"
    | "error"
}
```

---

# 15. 本地写入 Revision

任何会改变 WorkbenchState 的有效 mutation：

应该使：

```text
localRevision++
```

但避免因为纯 UI 状态：

```text
modal open
current tab
hover
```

产生 revision。

---

# 16. Push Sync

同步步骤：

```text
读取local state

↓

Zod validate

↓

canonical serialize

↓

checksum

↓

读取remote revision

↓

比较 lastSyncedRevision

↓

safe push OR conflict
```

---

# 17. 安全 Push

例如：

```text
lastSyncedRevision = 14

remoteRevision = 14

localRevision = 17
```

允许：

```text
push revision 17
```

成功后：

```text
lastSyncedRevision = 17
lastCloudRevision = 17
```

---

# 18. 冲突检测

例如：

Device A：

```text
base = 14
local = 17
```

Device B：

```text
base = 14
local = 16
→ uploaded
```

现在 remote：

```text
16
```

A 上传时：

```text
remoteRevision != lastSyncedRevision
```

必须：

# CONFLICT

不能直接覆盖。

---

# 19. Conflict Safety

检测冲突时：

第一件事：

# SAVE RECOVERY SNAPSHOT

保留：

```text
local state

remote state

metadata
```

例如：

```text
IndexedDB recovery store
```

或者：

```text
downloadable JSON
```

然后才进入冲突处理。

---

# 20. 第一版 Conflict UX

考试前不要做复杂 CRDT。

第一版支持：

```text
Cloud conflict detected

Local:
revision 17
updated ...

Cloud:
revision 16
updated ...

[Keep Local]
[Use Cloud]
[Export Both]
```

Keep Local：

必须明确进行：

```text
force overwrite after explicit user choice
```

Use Cloud：

必须先保留 local recovery。

Export Both：

生成两个备份。

---

# 21. 自动同步策略

可以实现：

```text
登录完成
→ pull metadata

本地变化
→ status pending

用户点击 Sync
→ push/pull

页面重新获得焦点
→ lightweight remote revision check
```

不要第一版做：

```text
每次按键实时云写入
```

---

# 22. Background Sync 原则

如果实现自动同步：

必须：

```text
debounced
non-blocking
safe
```

任何云错误：

不能影响本地保存。

例如：

```text
Cloud sync failed

Local data is safe
```

---

# 23. New Device Restore

全新浏览器：

```text
No local profile
↓
Sign In
↓
Cloud snapshot exists
```

显示：

```text
Cloud backup found

Updated:
Revision:

[Restore]
```

Restore 流程：

```text
download
↓
checksum
↓
Zod validate
↓
schema migrate
↓
preview
↓
write local
↓
reload state
```

---

# 24. Restore Fail Safety

任何：

```text
checksum mismatch

invalid JSON

invalid schema

migration failure

storage write failure
```

都不得：

```text
清空本地
```

必须：

```text
restore aborted
existing data preserved
```

---

# 25. Cloud Snapshot 与现有 JSON Backup

不要开发两套不兼容格式。

Cloud snapshot 应最大化复用：

```text
exportState()
importState()
```

或当前项目等价的 canonical serialization。

这样：

```text
Manual JSON Backup
Cloud Snapshot
```

共用同一 Schema。

---

# 26. Binary Storage

以下不进入 JSON state：

```text
Speaking recording bytes

PDF bytes

DOCX bytes
```

继续 metadata + object reference 模式。

Supabase Storage 建：

```text
speaking-recordings

study-materials
```

均：

# PRIVATE BUCKET

---

# 27. Storage Path

必须 user scoped。

例如：

```text
{userId}/recordings/{recordingId}.webm
```

和：

```text
{userId}/materials/{materialId}/{safeFilename}
```

---

# 28. Binary Metadata

本地实体增加/复用：

```text
cloudPath?

cloudSyncStatus?

checksum?

mimeType?

size?
```

不要把公开 signed URL 永久保存。

需要访问时：

```text
generate signed URL
```

---

# 29. 上传顺序

Speaking recording：

```text
本地录音成功
↓
IndexedDB保存
↓
UI立即可用
↓
后台上传
```

上传失败：

```text
Local recording remains available

Cloud status = pending/error
```

不能因为网络问题丢录音。

---

# 30. 材料上传

Material 同理：

```text
local file metadata
↓
local availability
↓
optional cloud upload
```

大文件上传失败：

不得破坏 material record。

---

# 31. RLS 是发布硬门禁

workbench_snapshots：

必须：

```sql
enable row level security
```

用户只能访问：

```text
user_id = auth.uid()
```

至少：

```text
SELECT own
INSERT own
UPDATE own
DELETE own
```

---

# 32. Storage RLS

两个 private buckets：

用户只能：

```text
read own prefix

write own prefix

delete own prefix
```

路径：

```text
auth.uid() / ...
```

---

# 33. RLS 必须真实测试

测试用户：

```text
User A
User B
```

验证：

```text
A select A
PASS

A select B
DENIED

A update B
DENIED

A delete B
DENIED

A read B audio
DENIED
```

不得只检查 SQL 看起来正确。

---

# 34. Supabase Migrations

所有 schema：

通过：

```text
supabase/migrations/
```

或当前项目已有等价目录。

不要只在 Dashboard 手工点完然后没有版本记录。

至少：

```text
snapshots table

indexes

RLS policies

storage policies
```

有 reproducible SQL。

---

# 35. 不要自动破坏已有 Supabase 项目

开始前检查：

```text
existing tables

existing buckets

existing policies
```

如果存在用户已有数据：

不得：

```text
drop schema

drop tables

truncate
```

除非明确证明安全。

---

# 36. Cloud Sync Tests

新增：

```text
src/cloud/*.test.ts
```

至少：

```text
safe push

safe pull

same revision

remote newer

local newer

conflict

bad checksum

invalid schema

migration during restore

network failure

auth expired

storage error
```

---

# 37. Offline Gate

模拟：

```text
navigator offline / failed network
```

然后：

```text
create practice session

submit attempts

create errors

retry

review vocabulary

record daily data
```

刷新：

数据必须仍存在。

---

# 38. Reconnect Gate

之后恢复网络：

```text
Sync
```

必须把最新 local snapshot 安全推送。

---

# 39. Cross-device E2E

建立测试：

## Device A

```text
login

create profile

record:
20 attempts
7 errors
vocabulary reviews
mock checkpoint

sync
```

## Device B

```text
fresh browser context

login same user

restore cloud
```

必须验证：

```text
Profile

Attempts

Errors

Reviews

Vocabulary

Mock

Question states

Study history
```

一致。

---

# 40. Conflict E2E

模拟两个 Browser Context。

两者基于：

```text
revision N
```

分别修改。

B先上传。

A后上传。

必须：

```text
CONFLICT
```

不能：

```text
last write wins silently
```

---

# 41. Speaking Cloud E2E

至少验证：

```text
record or fixture audio

save local

upload

fresh context

download metadata

request signed URL

audio element load
```

浏览器自动测试可以继续使用模拟媒体。

不宣称测试了真实物理麦克风。

---

# 42. Vercel

不要改成 Next.js。

继续：

```text
Vite + React
```

部署 Vercel。

确认：

```text
build command

output directory

SPA fallback
```

如果 React Router 使用 browser history：

必须确保 Vercel rewrite：

```text
/* → /index.html
```

或当前适用方案。

---

# 43. Vercel 环境变量

Preview 和 Production：

配置：

```text
VITE_SUPABASE_URL

VITE_SUPABASE_PUBLISHABLE_KEY
```

不要把 secrets commit 到 git。

---

# 44. Preview First

所有 Cloud 改动：

先：

# VERCEL PREVIEW

不要第一步 Production。

Preview Gate：

```text
app loads

auth works

local-only works

cloud sync works

restore works

storage works

mobile works
```

---

# 45. Production Gate

只有所有 Critical Gate PASS：

才允许 Production。

如果当前 Codex 环境能够部署且项目已经明确绑定：

可以执行生产部署。

否则：

生成 production-ready 配置和明确 deployment checklist。

不得虚假声称已上线。

---

# 46. GitHub CI

检查现有：

```text
.github/workflows/
```

如果已经有 CI：

扩展，不重复创建冲突 workflow。

必须包含：

```text
npm ci

npm run typecheck

npm run lint

npm test

npm run build

npm run test:e2e
```

如果 E2E 很慢：

可以单独 Job。

---

# 47. CI 不允许假 PASS

只有 GitHub Actions 实际 run 成功：

才能写：

```text
CI CLOUD PASS
```

本地运行只能写：

```text
CI-equivalent local PASS
```

---

# 48. Playwright 并行问题修复

历史存在：

```text
共享 trace 目录冲突

共享 dev server 被另一 run 停止

ENOENT

connection refused
```

检查当前 config。

避免多进程相互破坏：

```text
unique outputDir

safe webServer reuse rules

run-specific artifacts
```

但不要为了这个问题删 E2E assertions。

---

# 49. Bundle Warning

当前历史：

```text
~570 KB JS

gzip ~174 KB

Vite >500 KB warning
```

这是 P2。

Cloud phase 完成之后，再做：

```text
route-level lazy loading

heavy feature dynamic import
```

优先拆：

```text
Speaking

Question Bank

Materials

Analytics
```

不要为了消 warning 进行危险重构。

---

# 50. Cloud Status UI

Settings / Header 可以显示：

```text
Local only

Sync pending

Synced

Conflict

Sync error
```

并显示：

```text
Last synced
```

---

# 51. 云同步不能影响今日学习

例如 Supabase outage：

用户必须仍可以：

```text
Practice

Speaking

Vocabulary

Retry

Mock

Today
```

只显示：

```text
Cloud temporarily unavailable
Local data safe
```

---

# 52. REAL STUDY PILOT

云端完成后：

进入：

# REAL STUDY PILOT

不要立刻增加大功能。

新增：

```text
Recommendation Feedback
```

记录：

```text
recommended skill

recommended minutes

user rating

too_high
too_low
correct
not_useful
resource_bad
time_bad
```

用于真实 7 天后算法校准。

---

# 53. Feedback Schema

例如：

```ts
interface RecommendationFeedback {
  id: string

  date: string

  skillId: string

  recommendedMinutes: number

  rating: 1 | 2 | 3 | 4 | 5

  verdict:
    | "correct"
    | "priority_too_high"
    | "priority_too_low"
    | "already_mastered"
    | "bad_resource"
    | "bad_time_allocation"

  note?: string
}
```

这是 P1。

---

# 54. 不要现在自动改算法

真实 7 天以前：

只收数据。

不要根据 1–2 天样本自动改变：

```text
mastery weights

priority weights
```

避免过拟合。

---

# 55. 真实 Baseline

确保 Diagnostic 可以录：

```text
TOEFL Official/High-quality Mock

GRE POWERPREP
```

区分：

```text
official
practice
estimated
```

官方 checkpoint 权重高于普通练习。

---

# 56. Question Data Ingestion

本阶段开始真正使用题库。

来源优先：

```text
ETS public official

TestReady reference-only

POWERPREP reference-only

user-owned materials

personal wrong questions
```

不追求题量。

---

# 57. 版权规则继续保持

禁止：

```text
scrape paid question banks

copy full POWERPREP content

copy protected audio

bypass login
```

使用：

```text
reference_only
```

记录：

```text
source

test

section

question #

mine

correct

error

trap

time
```

---

# 58. Full Backup V2

现有：

```text
JSON metadata
+
separate binary downloads
```

后续可以增加：

```text
Full Backup Manifest
```

但不是 Cloud P0。

如果实现：

```text
backup-manifest.json

state.json

recordings/

materials/
```

并验证 checksum。

---

# 59. Phase 顺序

严格：

## CLOUD-00

Repository + current baseline

## CLOUD-01

Supabase client + environment abstraction

## CLOUD-02

Email Auth + Local-only fallback

## CLOUD-03

Snapshot schema + migrations + RLS

## CLOUD-04

CloudSyncAdapter + revision metadata

## CLOUD-05

Push / Pull / Conflict / Recovery

## CLOUD-06

New-device Restore

## CLOUD-07

Supabase Storage — Speaking

## CLOUD-08

Supabase Storage — Materials

## CLOUD-09

Cross-device + RLS + offline E2E

## CLOUD-10

Vercel Preview

## CLOUD-11

CI cloud gates

## CLOUD-12

Production readiness / deployment

## PILOT-01

Recommendation feedback

## PILOT-02

Real 7-day usage

---

# 60. 每阶段严格 Gate

每个 Phase：

## G0 Scope

```text
git diff --name-only
```

确认无无关重构。

## G1 Static

```text
typecheck
lint
```

## G2 Targeted

新测试 PASS。

## G3 Existing Regression

全部相关旧测试 PASS。

## G4 Full Test

```text
npm test
```

## G5 Build

```text
npm run build
```

## G6 Browser

相关 Playwright PASS。

## G7 Data Integrity

如果涉及数据：

```text
refresh
restore
migration
conflict
```

PASS。

## G8 Independent Review

重新阅读实际 diff。

---

# 61. Independent Reviewer

实现完成后：

必须启动独立 Review 子任务。

Reviewer 不参与该模块核心实施。

审查：

```text
security

data loss

auth

RLS

concurrency

migration

offline behavior

error paths

test quality
```

---

# 62. Reviewer 必须主动攻击

至少问：

```text
断网保存会不会丢？

两个设备会不会互相覆盖？

恶意用户能读别人数据吗？

service role有没有泄露？

checksum错误怎么办？

schema不兼容怎么办？

restore中断怎么办？

文件上传一半怎么办？

登录过期怎么办？

Supabase挂掉本地还能不能用？
```

---

# 63. Repair Loop

Reviewer / Gate FAIL：

```text
FAIL
↓
Root Cause
↓
Add regression test
↓
Fix
↓
Targeted test
↓
Full relevant gates
↓
Review again
```

无需用户确认。

---

# 64. 同一问题连续失败三次

不要继续重复修。

切：

```text
REDESIGN_REQUIRED
```

缩小问题重新设计。

---

# 65. Git 安全

禁止：

```text
git add .
git add -A
git reset --hard
git clean -fd
force push
rebase
```

保护用户修改。

---

# 66. Commit

稳定 Phase Gate 全 PASS 后：

可以创建本地 commit，

如果 repo governance 允许。

精准：

```text
git add exact files
```

---

# 67. Push

如果当前仓库权限和用户工作流允许：

Cloud feature完成后可以 push 开发分支触发 Preview/CI。

不要 force push。

---

# 68. 生产数据安全

任何正式部署前：

保证：

```text
no dev admin endpoints

no service role client leak

RLS enabled

private storage

environment correct

preview tested
```

---

# 69. 最终 Cloud Acceptance 场景 A

Device A：

```text
login

TOEFL / GRE profile

20 GRE attempts

7 errors

3 vocabulary reviews

1 speaking recording

1 mock checkpoint

sync
```

Device B：

```text
fresh browser

login

restore
```

结果：

```text
exact user study state restored
```

---

# 70. 场景 B — Offline

```text
offline

20 questions

7 wrong

retry 3

vocab 20

refresh

all local data remains
```

联网：

```text
sync
```

remote 完整。

---

# 71. 场景 C — Conflict

两个 device：

```text
base revision 20
```

A → 21

B → 21 and upload

A upload：

必须：

```text
CONFLICT
```

而不是覆盖。

---

# 72. 场景 D — RLS

```text
User A ≠ User B
```

A 不能：

```text
select B snapshot

update B snapshot

read B audio

read B material
```

---

# 73. 场景 E — Auth Failure

Session expired：

```text
local work continues
```

Cloud sync：

```text
requires re-auth
```

不能：

```text
delete local state
```

---

# 74. 场景 F — Storage Failure

Speaking audio：

```text
local saved

cloud upload fails
```

必须：

```text
local playback still works

cloud state pending/error
```

---

# 75. 最终 Full Gate

至少：

```text
typecheck PASS

lint PASS

all tests PASS

build PASS

e2e PASS

cloud unit PASS

offline PASS

conflict PASS

restore PASS

RLS PASS

storage PASS

preview smoke PASS

git diff --check PASS
```

---

# 76. Final Documentation

必须创建：

```text
docs/cloud/CLOUD_ARCHITECTURE.md

docs/cloud/SUPABASE_SCHEMA.md

docs/cloud/RLS_SECURITY.md

docs/cloud/SYNC_PROTOCOL.md

docs/cloud/CONFLICT_RECOVERY.md

docs/cloud/VERCEL_DEPLOYMENT.md

docs/cloud/CLOUD_TESTING.md

docs/cloud/OPERATIONS_RUNBOOK.md

docs/cloud/FINAL_ACCEPTANCE.md
```

---

# 77. 用户手册

更新：

```text
README.md
```

至少说明：

```text
项目是什么

如何本地启动

如何运行测试

如何配置Supabase

如何配置Vercel

Local-only模式

Cloud Sync

Backup

Privacy
```

不要再保留 Vite 默认 README。

---

# 78. README 必须明确

说明：

```text
This tool does not provide official ETS scoring.

TOEFL/GRE trademarks belong to their respective owners.

Question provenance and copyright boundaries are respected.

Local data remains usable without cloud.
```

---

# 79. 不要宣称真实提分

即使算法和 7 天模拟测试通过：

不得在 README 写：

```text
Guaranteed +20 GRE
Guaranteed TOEFL 5.5
```

只能说：

```text
adaptive study planning

error-driven review

score trajectory tracking
```

---

# 80. Pilot Success Definition

云端上线后：

真正成功不是：

```text
Supabase connected
```

而是：

用户连续使用 7 天：

```text
学习数据不丢

手机/电脑能同步

错题会回来

Vocabulary due 合理

Priority 会变化

Daily Prescription 会变化

Mock 会影响未来计划
```

---

# 81. 当前禁止新增

Cloud 和 Pilot 完成前：

不要开发：

```text
AI Chat Coach

AI Writing Scoring

AI Speaking Official Scoring

Social

Leaderboard

Payment

Admin SaaS

复杂订阅

Community

大量第三方题库
```

---

# 82. 当前工作最终优先级

```text
P0
Cloud data safety

P0
Cross-device restore

P0
RLS

P0
Offline safety

P0
Conflict safety

P1
Speaking/Materials cloud backup

P1
Vercel deployment

P1
CI

P1
Real study feedback

P2
Bundle optimization

P2
Full backup zip

P3
AI
```

---

# 83. 最终状态定义

只有：

```text
CLOUD_ACCEPTED
```

或者：

```text
CLOUD_REJECTED
```

不能写：

```text
mostly done
probably fine
```

---

# 84. CLOUD_ACCEPTED 条件

必须真实满足：

```text
现有Study OS无核心回归

Local-first保持

Auth可用

云端snapshot可用

跨设备restore可用

revision冲突可检测

RLS通过

Speaking storage可用

Material storage可用

Offline可用

Reconnect sync可用

Preview可用

CI真实/可验证

生产配置安全
```

---

# 85. 当前立即开始

现在执行：

```text
1. Audit repository and git status.

2. Re-run full baseline.

3. Read existing StorageAdapter / IndexedDB / backup code.

4. Inspect existing Vercel config.

5. Inspect existing Supabase state.

6. Create docs/cloud/CLOUD_BASELINE.md.

7. Implement CLOUD-01 incrementally.

8. Add tests before/with critical sync logic.

9. Keep local-first behavior.

10. Proceed phase-by-phase automatically.

11. Run strict gates after every phase.

12. Spawn independent reviewer for security/data integrity.

13. Repair every blocking finding.

14. Deploy Preview only after local full gate passes.

15. Validate Preview.

16. Complete Production readiness.

17. Produce FINAL_ACCEPTANCE.md.
```

---

# 86. 最高原则

整个过程中牢记：

> 用户下个月要真实参加 TOEFL/GRE。

因此系统的优先目标不是成为复杂 SaaS。

它必须首先：

```text
稳定

不丢数据

离线可用

手机可用

电脑可用

备考数据能同步

错题能回来

明天计划会根据今天真实表现变化
```

所有不直接服务这些目标的功能：

延后。

# START CLOUD CONTINUATION NOW.