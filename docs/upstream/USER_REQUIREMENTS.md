# TOEFL / GRE Workbench 开源项目融合二开总方案

## 一、最终目标

当前主仓库继续保持：

`chenfei462/toefl-gre-workbench`

不要重新起项目。

现有核心继续作为唯一业务内核：

```text
Question Bank
→ Attempt
→ Error
→ Retry
→ Mastery
→ Weakness
→ Priority
→ Daily Prescription
→ Checkpoint
→ Replanning
```

后续 GitHub 项目只用于：

```text
学习
→ 提炼设计
→ 局部移植
→ 重新适配
→ 测试
→ 接入现有领域模型
```

绝对不要变成：

```text
下载一个新项目
→ 把现在项目推倒
→ 从头改
```

---

# 二、最值得学习的仓库总表

## A. 第一优先级：ISTS — Study OS

仓库：

[aimerfeng/ists](https://github.com/aimerfeng/ists?utm_source=chatgpt.com)

这是目前最值得你的项目学习的整体架构参考。

它不是 TOEFL，而是 IELTS，但产品思路与你高度一致：

```text
Daily Study Loop
Vocabulary SRS
Reading / Listening Practice
Writing
Mock Exam
Mistake Review
Analytics
Material Import
JSON Backup
Single-user
Local-first
```

它使用：

```text
Next.js
React
TypeScript
SQLite
Zod
Vitest
```

而且明确是 MIT License。它已经实现错题进入复习队列、SRS 单词、模考、材料导入、Analytics 和 JSON Export，非常接近你正在做的“考试 Study OS”。

### 重点学

不要抄整个 Next.js 架构。

重点研究：

```text
Daily Study Loop

Mistake → Review Queue

Mock → Analytics

Study History

Material Import

Local-first 数据设计

Backup / Restore

单用户产品 UX
```

### 对应你项目

主要改进：

```text
Today
Practice
Error Lab
Review
Vocabulary
Score Checkpoint
Settings
```

---

# 三、TOEFL 实战考试播放器

## B. TOEFL Desktop App

仓库：

[fazrimaulana1230/toefl-desktop-app](https://github.com/fazrimaulana1230/toefl-desktop-app?utm_source=chatgpt.com)

技术：

```text
React
TypeScript
Vite
Zustand
Tailwind
Electron
```

MIT License。

和你目前 React + TypeScript + Vite 技术体系最接近。

项目本身已经拥有：

```text
Exam Sections

Question Bank

Exam Store

Question Navigation

Scoring

Result

Timer

考试界面
```


目录设计中直接有：

```text
src/data
src/pages
src/store
src/utils
src/components
```

用于题库、考试页面、状态和评分。

## 不要学

它主要是：

```text
TOEFL ITP / PBT
```

而不是你当前的 2026 TOEFL iBT。

所以禁止复制：

```text
考试结构
分数转换
ITP Question taxonomy
310–677 scoring
```

## 要学

只移植：

```text
Exam Player
Question Navigation
Countdown
Section Progress
Answer State
Submit Confirmation
Result Screen
Keyboard Navigation
Fullscreen Practice UX
```

---

# 四、把 Question Bank 升级成真正的 Practice Player

目前你有：

```text
Question Bank
```

下一阶段需要：

# Practice Player

页面建议：

```text
/practice/session/:sessionId
```

进入以后：

```text
Question 1 / 20

Timer

Passage / Audio
        |
        |
Question
Options

Previous
Next
Flag
Submit
```

提交以后：

```text
20 Questions

Correct 13
Wrong 7

Accuracy 65%
Time 28m
```

自动：

```text
20 Attempts
+
7 ErrorRecords
```

而不是再让你手工录：

```text
20题
错7
```

---

# 五、TOEFL Speaking

## C. Mock-Test-UI

仓库：

[developer-mezbah/Mock-Test-UI](https://github.com/developer-mezbah/Mock-Test-UI?utm_source=chatgpt.com)

它是 MIT License 的 React 项目，目标就是 IELTS / TOEFL / PTE Speaking practice，包含 Speaking simulation 和语音相关训练。

重点研究：

```text
Microphone Permission

Recording

Speaking Timer

Preparation Countdown

Response Countdown

Speech-to-text UX

Speaking Session
```

---

# 六、你的 Speaking 模块应该这样实现

2026 TOEFL：

```text
Listen and Repeat

Take an Interview
```

建立：

```text
SpeakingPracticeSession
```

流程：

```text
题目
↓
播放 Audio
↓
准备
↓
倒计时
↓
录音
↓
停止
↓
复听
↓
Self Review
↓
记录错误
```

第一版不要做：

```text
AI评分
```

先做到：

```text
真实训练
+
录音历史
+
用户自己评价
+
错误分类
```

错误：

```text
pronunciation
fluency
grammar
vocabulary
hesitation
memory
listening
organization
```

这些继续进入：

```text
Mastery
Priority
Daily Prescription
```

---

# 七、Speaking / Listening 高级参考

## D. LangHelper

仓库：

[NsLearning/LangHelper](https://github.com/NsLearning/LangHelper?utm_source=chatgpt.com)

MIT License。

目前约 349 stars / 23 forks。

它覆盖：

```text
TTS
STT
Speaking Assessment
Conversation
Listening
Words in context
```


这个项目值得学习，但：

```text
核心是 Rust
```

所以：

# 不移植代码。

只学习：

```text
Speaking workflow

STT pipeline

TTS pipeline

Listening exercises

Vocabulary in context

Speaking feedback UX
```

然后 Codex 用 TypeScript 重新实现。

---

# 八、GRE Vocabulary

## E. GRE Prep Tool

仓库：

[pycoder2000/GRE-Prep-Tool](https://github.com/pycoder2000/GRE-Prep-Tool?utm_source=chatgpt.com)

MIT License。

已有：

```text
词表

Vocabulary Test

MCQ

Written Test

Learning State

Test Time

Test Score

Streak

Statistics

Charts

Serial Revision
```


项目明确有多个 GRE 词表，并保存学习过的词、考试成绩与统计数据。

不要搬：

```text
Python CLI
```

只吸收：

```text
Vocabulary lifecycle
Test modes
Review workflow
Statistics
```

---

# 九、GRE Vocabulary 不应该继续使用简单 1/3/7/14

这里建议进一步升级。

## F. ts-fsrs

仓库：

[open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs?utm_source=chatgpt.com)

这是 TypeScript FSRS 实现。

当前仓库约：

```text
812 stars
73 forks
MIT
```

而且 2026 年仍在持续更新。

它原生支持：

```text
Again
Hard
Good
Easy
```

然后根据学习历史计算下一次复习时间。

---

# 十、你的 Vocabulary V2

现在：

```text
VocabularyItem
```

升级成：

```text
VocabularyCard

word
meaning
examples
source

state:
new
learning
review
relearning

difficulty
stability
due
lastReview
reps
lapses
```

用户每天：

```text
Again
Hard
Good
Easy
```

自动产生：

```text
nextReview
```

---

# 十一、GRE 错词自动进入词汇系统

例如：

```text
GRE TC Q31

Answer Wrong

Error:
Vocabulary

Unknown:
mitigate
```

点击：

```text
Add to Vocabulary
```

之后：

```text
mitigate
↓
FSRS
↓
Due Today
↓
Review
```

同时：

```text
Vocabulary Skill Mastery
```

得到更新。

---

# 十二、整体产品体验参考

## G. AI TOEFL Coach

仓库：

[dimonded1/ai-toefl-coach](https://github.com/dimonded1/ai-toefl-coach?utm_source=chatgpt.com)

这个项目与你产品概念非常接近。

包含：

```text
Dashboard
Predicted Score
Goal Setup
Vocabulary
Reading
Listening
Speaking
Writing
Mini TOEFL
Study Plan
Study Calendar
Mistake Bank
XP / streak
Weekly Progress
Analytics
```


还有：

```text
Node
Express
SQLite
JWT
Docker
nginx
```

可以作为以后：

```text
local-only
→
账号
→
云同步
```

阶段的参考。

## 但是

当前 GitHub metadata 没有明确 License。

所以：

# 只学习产品设计。

不要直接复制代码。

---

# 十三、重点学习 AI TOEFL Coach 的 4 个地方

学习：

```text
Score Gap UX

Study Roadmap UX

Mistake Bank UX

Analytics Dashboard
```

尤其值得吸收：

首页不是告诉用户：

```text
今天完成 4/8
```

而是：

```text
Current
4.5

Target
5.5

Gap
1.0

Biggest risk
Speaking

Next action
Speaking Interview — 45m
```

这与你现有 Dashboard 的方向一致。

---

# 十四、TOEFL Reading 错因设计

## H. Toeflbyte

仓库：

[jungmokk/Toeflbyte](https://github.com/jungmokk/Toeflbyte?utm_source=chatgpt.com)

它的一个非常有价值的设计是：

# Distractor Logic

它不只是：

```text
正确答案 C
```

而会描述：

```text
B 为什么是陷阱

D 为什么错误
```

例如：

```text
Not Mentioned

Word Salad

Wrong Scope
```


这正好适合增强你的：

```text
Error Lab
```

---

# 十五、Error Lab V2

现在：

```text
Vocabulary
Logic
Misread
Careless
...
```

继续增加：

```text
TrapType
```

例如：

### Reading

```text
not_mentioned
opposite
too_broad
too_narrow
wrong_scope
half_true
keyword_match
inference_overreach
```

### GRE TC / SE

```text
logic_direction
contrast_missed
support_missed
tone
vocab_gap
near_synonym_trap
```

---

# 十六、以后每一道错题可以回答

```text
为什么错？
```

分成三个层面：

```text
Skill:
Reading Inference

Error:
Misread

Trap:
Too Broad
```

例如：

```text
GRE RC Q12

Skill:
Inference

Error:
Logic

Trap:
Inference Overreach
```

这样 Mastery 会比单一的：

```text
Wrong
```

有价值很多。

---

# 十七、Study OS 架构重点学习 ISTS

从：

[ISTS Study OS](https://github.com/aimerfeng/ists?utm_source=chatgpt.com)

重点吸收：

## 1

```text
Durable Study History
```

你每天训练什么都留下历史。

## 2

```text
Automatic Mistake → Review Queue
```

不要让用户自己管理错题。

## 3

```text
Mock Analytics
```

模考独立于普通训练。

## 4

```text
Material Import
```

允许：

```text
PDF
DOCX
text
audio
```

不过你的系统仍保持版权边界：

```text
用户自己拥有
公开资源
授权资源
```

## 5

```text
JSON Backup
```

这一点你已经有，可以继续强化。

ISTS 本身明确采用 single-user / local-first 思路，并实现 SRS、practice、mock、mistake review、analytics 和 material import。

---

# 十八、不要现在做 AI Coach

ISTS 有 AI Coach。

AI TOEFL Coach 也有 AI Study Plan。

但你的阶段：

# 暂时不要。

原因：

你一个月就考试。

优先级：

```text
Practice
Error
Retry
Vocabulary
Mock
Prescription
```

明显高于：

```text
Chatbot
```

---

# 十九、Codex 开发 Phase 0

## Upstream Audit

先让 Codex 建：

```text
docs/upstream/
```

包括：

```text
ISTS.md

TOEFL_DESKTOP.md

MOCK_TEST_UI.md

LANGHELPER.md

GRE_PREP_TOOL.md

TS_FSRS.md

AI_TOEFL_COACH.md

TOEFLBYTE.md

UPSTREAM_ADOPTION_MATRIX.md
```

每份回答：

```text
What it does

License

Technology

Useful modules

Files worth studying

Things NOT to copy

How it maps to our architecture

Integration risk

Recommended adoption
```

---

# 二十、Phase 1 — Practice Player

参考：

[TOEFL Desktop App](https://github.com/fazrimaulana1230/toefl-desktop-app?utm_source=chatgpt.com)

实现：

```text
PracticeSession

PracticeQuestion

Timer

Navigation

Answer State

Flag

Submit

Result
```

连接现有：

```text
Question
QuestionRepository
Attempt
```

---

# 二十一、Phase 1 验收

测试：

```text
20 Question Session

↓

13 Correct
7 Wrong

↓

20 Attempts

↓

7 ErrorRecords
```

必须满足：

```text
刷新不会丢

Timer有效

Previous/Next有效

Submit确认

未答题提示

Result数据正确
```

---

# 二十二、Phase 2 — Speaking Player

参考：

[Mock-Test-UI](https://github.com/developer-mezbah/Mock-Test-UI?utm_source=chatgpt.com)

+

[LangHelper](https://github.com/NsLearning/LangHelper?utm_source=chatgpt.com)

实现：

```text
audio playback
mic
record
timer
playback
history
self rating
```

暂不做 AI Score。

---

# 二十三、Speaking Gate

必须实际测试：

```text
允许 microphone

开始录音

停止

可以复听

刷新后 metadata 存在

取消 permission 有提示

录音失败有提示
```

---

# 二十四、Phase 3 — GRE Vocabulary V2

参考：

[GRE Prep Tool](https://github.com/pycoder2000/GRE-Prep-Tool?utm_source=chatgpt.com)

调度算法：

[ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs?utm_source=chatgpt.com)

实现：

```text
Vocabulary Deck

New
Learning
Review
Relearning

Again
Hard
Good
Easy
```

---

# 二十五、Vocabulary Gate

模拟：

```text
100 words

Day 1 review

Again 20
Hard 20
Good 50
Easy 10
```

必须产生合理不同：

```text
due dates
```

不能所有词：

```text
明天再复习
```

---

# 二十六、Phase 4 — Error Lab V2

参考：

[Toeflbyte](https://github.com/jungmokk/Toeflbyte?utm_source=chatgpt.com)

增加：

```text
Error Type

Trap Type

My Reason

Correct Reason

Better Strategy
```

实现：

```text
Repeated Trap Analysis
```

例如：

```text
Too Broad
12 errors

Not Mentioned
7 errors
```

---

# 二十七、Phase 5 — Real Study Loop

参考：

[ISTS](https://github.com/aimerfeng/ists?utm_source=chatgpt.com)

形成：

```text
Morning

Dashboard
↓
Daily Prescription
↓
Practice

During Day

Session
↓
Attempts
↓
Errors

Evening

Retry Due
↓
Vocabulary Due
↓
Daily Summary
↓
Tomorrow Replan
```

这应该成为你的主 UX。

---

# 二十八、Phase 6 — Mock Exam

建立独立：

```text
MockSession
```

不要把模考简单当：

```text
PracticeEntry
```

因为模考证据权重大得多。

保存：

```text
source
exam
date
section scores
overall
duration
conditions
official / practice
```

---

# 二十九、模考数据权重

Mastery：

```text
Official Mock
>
High-quality Section Test
>
Normal Practice
>
Community Questions
```

你现在已经有 evidence weight，

这里要真正接 Mock。

---

# 三十、Phase 7 — Final Week Mode

距离考试：

```text
<= 7 days
```

自动切：

# FINAL WEEK

降低：

```text
新知识
新资源
无关题
```

增加：

```text
timed
mixed sets
mock
weak skills
unresolved errors
```

---

# 三十一、Phase 8 — Browser E2E

参考官方：

[Microsoft Playwright](https://github.com/microsoft/playwright?utm_source=chatgpt.com)

Playwright 支持 Chromium、Firefox、WebKit，并提供完整 E2E Test Runner。

加入：

```text
tests/e2e/
```

---

# 三十二、E2E 不要做太多

只测关键路径。

## Flow A

```text
Onboarding
→ Today
```

## Flow B

```text
Practice
→ Submit
→ Error
```

## Flow C

```text
Error
→ Retry
```

## Flow D

```text
Vocabulary
→ Review
```

## Flow E

```text
Export
→ Import
```

## Flow F

```text
390×844 Mobile
```

---

# 三十三、Phase 9 — CI

加入：

```text
.github/workflows/ci.yml
```

参考：

[actions/setup-node](https://github.com/actions/setup-node?utm_source=chatgpt.com)

它可以在 GitHub Actions 中安装指定 Node 版本并缓存 npm/pnpm/yarn 依赖。

每次：

```text
push

pull_request
```

自动：

```text
npm ci

npm run typecheck

npm run lint

npm test

npm run build

npm run test:e2e
```

---

# 三十四、Phase 10 — Codex 开发工作流

额外可以学习：

[AI Learning Coach](https://github.com/chrichuang218/ai-learning-coach?utm_source=chatgpt.com)

它本身不是考试 App。

但非常适合学习：

```text
Evidence-based Mastery

Cross-session state

Progress Evidence

Focus

Next Action
```

而且它就是 Codex Plugin，MIT License，目前有完整 validation / tests / evals。

你不需要把它放进产品。

它更适合：

# 优化 Codex 开发流程。

---

# 三十五、推荐最终架构

```text
              TOEFL / GRE WORKBENCH

                       │
                Daily Prescription
                       │
         ┌─────────────┼─────────────┐
         │             │             │
      Practice      Vocabulary     Retry
         │             │             │
         ▼             ▼             ▼
      Attempt        FSRS        ErrorRecord
         │                           │
         └──────────────┬────────────┘
                        ▼
                     Mastery
                        │
                     Weakness
                        │
                     Priority
                        │
                    Tomorrow
```

另外：

```text
Mock
↓
Checkpoint
↓
Trajectory
↓
Priority
```

---

# 三十六、真正应该抄/学的东西总结

## ISTS

[仓库](https://github.com/aimerfeng/ists?utm_source=chatgpt.com)

学：

```text
整体 Study OS
Daily Loop
Mistake Review
Mock
Analytics
Backup
```

---

## TOEFL Desktop App

[仓库](https://github.com/fazrimaulana1230/toefl-desktop-app?utm_source=chatgpt.com)

学：

```text
Exam Player
Timer
Navigation
Result
```

---

## Mock-Test-UI

[仓库](https://github.com/developer-mezbah/Mock-Test-UI?utm_source=chatgpt.com)

学：

```text
Speaking UX
Microphone
Recording
```

---

## LangHelper

[仓库](https://github.com/NsLearning/LangHelper?utm_source=chatgpt.com)

学：

```text
STT
TTS
Speaking
Listening
```

---

## GRE Prep Tool

[仓库](https://github.com/pycoder2000/GRE-Prep-Tool?utm_source=chatgpt.com)

学：

```text
Vocabulary
Quiz
Stats
Revision
```

---

## ts-fsrs

[仓库](https://github.com/open-spaced-repetition/ts-fsrs?utm_source=chatgpt.com)

学/直接集成：

```text
Spaced repetition
```

---

## Toeflbyte

[仓库](https://github.com/jungmokk/Toeflbyte?utm_source=chatgpt.com)

学：

```text
Distractor Logic
Reading Error Analysis
```

不要直接复制无明确 License 的代码。

---

## AI TOEFL Coach

[仓库](https://github.com/dimonded1/ai-toefl-coach?utm_source=chatgpt.com)

学：

```text
Score Gap UX
Dashboard
Mistake Bank UX
Study Roadmap
Backend方向
```

不要直接复制无明确 License 的代码。

---

# 三十七、开发优先级

最终排序：

```text
P0
真实 Daily Study Loop

P1
Practice Player

P2
GRE Vocabulary + FSRS

P3
Speaking Recorder

P4
Error Lab Trap Analysis

P5
Mock Exam

P6
Final Week Mode

P7
Playwright E2E

P8
GitHub CI

P9
更多题库

P10
AI Coach
```

不要调换成：

```text
AI Coach
→
漂亮UI
→
云端
→
最后才做训练
```

---

# 三十八、严格 Codex Gate

每一个 Phase：

```text
G0
Baseline cleanly recorded

G1
Scope check

G2
Typecheck

G3
Lint

G4
Targeted unit tests

G5
Relevant integration tests

G6
npm test

G7
npm run build

G8
Relevant browser E2E

G9
Independent review of diff

G10
Regression after repair
```

如果 FAIL：

```text
FAIL
↓
Root Cause
↓
Repair
↓
Targeted Test
↓
Full Relevant Gate
```

不需要询问用户是否修复。

---

# 三十九、禁止事项

Codex不得：

```text
重写整个项目

重新发明 Mastery

重新发明 Priority

删旧数据

复制无 License 项目源码

把 TOEFL ITP 模型套给 2026 iBT

把社区题当官方题

用普通正确率假装官方分数

为了通过测试删除 assertion

大规模加入 AI 功能
```

---

# 四十、30 天备考目标下的最重要原则

你不是在做一个：

```text
漂亮的考试管理系统
```

真正目标是：

```text
今天做什么
↓
做题
↓
为什么错
↓
明天什么时候重做
↓
哪个弱项最危险
↓
下一小时练什么
```

最终成功标准不是：

```text
页面数量
代码行数
题库数量
```

而是：

```text
连续使用7天后，

系统推荐的训练内容
是否明显跟着真实表现变化。
```