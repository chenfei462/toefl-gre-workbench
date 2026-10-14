import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { WorkbenchState } from '../../src/types'

const storageKey = 'toefl-gre-workbench:v2'
const offlineQuestions = Array.from({ length: 20 }, (_, index) => ({
  id: `offline-user-${index + 1}`,
  sourceId: 'user-manual',
  sourceQuestionId: `offline-${index + 1}`,
  sourceSection: 'verbal',
  exam: 'gre',
  examVersion: 'GRE_CURRENT',
  section: 'verbal',
  questionType: 'text_completion',
  skillIds: ['gre-text-completion'],
  prompt: `User-authored offline practice question ${index + 1}`,
  options: [{ id: 'a', text: 'Correct option' }, { id: 'b', text: 'Wrong option' }],
  answer: { optionId: 'a', verification: 'verified' },
  answerType: 'single_choice',
  storageMode: 'full',
  verification: 'verified',
  compatibility: { examVersion: 'GRE_CURRENT', status: 'current' },
  tags: ['offline-user-authored'],
  explanationIds: [],
  mediaIds: [],
}))
const offlineVocabulary = [
  ['mitigate', 'make less severe'], ['resilient', 'able to recover'],
  ['ephemeral', 'lasting a short time'], ['pragmatic', 'focused on practical results'],
  ['lucid', 'easy to understand'], ['tenacious', 'persistently determined'],
  ['abate', 'become less intense'], ['candid', 'truthful and direct'],
  ['diligent', 'showing careful effort'], ['eloquent', 'expressing ideas fluently'],
  ['frugal', 'careful with resources'], ['gregarious', 'enjoying company'],
  ['impartial', 'treating all sides fairly'], ['judicious', 'showing good judgment'],
  ['meticulous', 'paying close attention to detail'], ['novel', 'new or original'],
  ['obsolete', 'no longer in use'], ['plausible', 'seeming reasonable'],
  ['robust', 'strong and reliable'], ['succinct', 'expressed briefly and clearly'],
]

async function saved(page: Page): Promise<WorkbenchState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), storageKey)
}

function businessState(state: WorkbenchState) {
  const { _localRevision: revision, ...business } = state as WorkbenchState & { _localRevision?: number }
  expect(revision).toEqual(expect.any(Number))
  return business
}

async function expectRetainedState(page: Page, previous: WorkbenchState) {
  const current = await saved(page)
  expect(businessState(current)).toEqual(businessState(previous))
  expect((current as WorkbenchState & { _localRevision: number })._localRevision).toBeGreaterThanOrEqual((previous as WorkbenchState & { _localRevision: number })._localRevision)
}

async function importOfflineBank(page: Page) {
  // Exercise the public importer: production previews do not serve /src modules.
  await page.goto('/questions/import')
  await page.getByLabel('粘贴 JSON / CSV').fill(JSON.stringify({ questions: offlineQuestions }))
  await page.getByRole('button', { name: '预览导入', exact: true }).click()
  const preview = page.getByRole('dialog')
  await expect(preview).toContainText('发现：20 · 有效：20 · 重复：0 · 无效：0')
  await preview.getByRole('button', { name: '确认保存', exact: true }).click()
  await expect(preview).toBeHidden()
  await expect(page.getByText('20 / 20 题', { exact: true })).toBeVisible()
}

test('installed app shell reloads offline and retains local preference changes', async ({ page, context }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW !== '1', 'Offline shell requires a production build')
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.getByRole('button', { name: '生成我的 30 天计划' }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('toefl-gre-workbench:v2') ?? '{}').tasks?.length ?? 0)).toBeGreaterThan(0)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByLabel('每天可用时间').fill('75')
  await page.getByRole('button', { name: '保存设置', exact: true }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('toefl-gre-workbench:v2')!).profile.dailyMinutes)).toBe(75)
  await page.reload()
  await expect(page.getByLabel('每天可用时间')).toHaveValue('75')
  await context.setOffline(false)
})

test('production app completes the study loop offline and retains its history after reconnecting', async ({ page, context, browser }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW !== '1', 'Offline study loop requires a production build')
  test.setTimeout(process.env.CLOUD_E2E === '1' ? 120000 : 90000)
  const cloudEnabled = process.env.CLOUD_E2E === '1'
  const email = `offline-browser-${Date.now()}-${test.info().retry}@example.com`
  const password = 'Local-offline-test-password-2026'
  await page.goto('/')
  if (cloudEnabled) {
    await page.getByLabel('邮箱', { exact: true }).fill(email)
    await page.getByLabel('密码', { exact: true }).fill(password)
    await page.getByRole('button', { name: '注册邮箱账号', exact: true }).click()
    await expect(page.getByText('已登录：' + email, { exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: '生成我的 30 天计划' }).click()
  await expect.poll(async () => (await saved(page)).tasks?.length ?? 0).toBeGreaterThan(0)
  await importOfflineBank(page)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe('activated')

  await context.setOffline(true)
  try {
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false)
    await page.goto('/practice')
    await expect(page.locator('.practice-picker input[type="checkbox"]')).toHaveCount(20)
    await page.getByRole('button', { name: '选择前 20 题', exact: true }).click()
    await page.getByRole('button', { name: '开始练习 · 20 题', exact: true }).click()
    for (let index = 0; index < 20; index++) {
      await expect(page.getByRole('heading', { name: `Question ${index + 1} / 20`, exact: true })).toBeVisible()
      await page.getByLabel(index < 13 ? 'Correct option' : 'Wrong option', { exact: true }).check()
      if (index < 19) await page.getByRole('button', { name: '下一题', exact: true }).click()
    }
    await expect.poll(async () => {
      const session = (await saved(page)).practiceSessions?.[0]
      return { index: session?.currentIndex, answers: Object.keys(session?.answers ?? {}).length }
    }).toEqual({ index: 19, answers: 20 })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Question 20 / 20', exact: true })).toBeVisible()
    await expect(page.getByLabel('Wrong option', { exact: true })).toBeChecked()
    await page.getByRole('button', { name: '提交练习', exact: true }).click()
    await page.getByRole('button', { name: '确认提交', exact: true }).click()
    await expect(page.getByText('正确率 65%', { exact: true })).toBeVisible()
    await expect(page.getByText('正确 13', { exact: true })).toBeVisible()
    await expect(page.getByText('错误 7', { exact: true })).toBeVisible()
    await expect.poll(async () => {
      const state = await saved(page)
      return { attempts: state.attempts.length, errors: state.errorRecords.length, status: state.practiceSessions?.[0].status }
    }).toEqual({ attempts: 20, errors: 7, status: 'submitted' })

    await page.goto('/errors')
    await expect(page.getByRole('button', { name: '开始二刷', exact: true })).toHaveCount(7)
    for (let index = 0; index < 3; index++) {
      await page.getByRole('button', { name: '开始二刷', exact: true }).nth(index).click()
      await page.getByRole('button', { name: '这次答对', exact: true }).click()
      await expect.poll(async () => (await saved(page)).reviewAttempts.length).toBe(index + 1)
    }
    await page.reload()
    await expect(page.getByText('错题 7 · 二刷 3 次 · 二刷正确率 100%', { exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: '错题队列', exact: true }).selectOption('resolved')
    await expect(page.getByRole('button', { name: '开始二刷', exact: true })).toHaveCount(3)

    await page.goto('/vocabulary')
    for (const [index, [word, meaning]] of offlineVocabulary.entries()) {
      await page.getByLabel('单词', { exact: true }).fill(word)
      await page.getByLabel('词义', { exact: true }).fill(meaning)
      await page.getByRole('button', { name: '添加词汇', exact: true }).click()
      await page.getByRole('button', { name: '显示词义', exact: true }).click()
      await page.getByRole('button', { name: 'Easy', exact: true }).click()
      await expect.poll(async () => (await saved(page)).vocabularyReviews?.length).toBe(index + 1)
    }
    await page.reload()
    await expect(page.getByText('今天没有到期词汇。', { exact: true })).toBeVisible()
    await expect(page.getByText(/^Due Today 0 · 20 total · /)).toBeVisible()
    await page.getByText('词汇与复习历史', { exact: true }).click()
    await expect(page.getByText(/ · GRE · 下次 .* · reps 1 · lapses 0$/)).toHaveCount(20)
    await expect(page.getByText(/^[a-z]+ · Easy · /)).toHaveCount(20)
    for (const [word, meaning] of offlineVocabulary) {
      await expect(page.getByText(new RegExp(`^${word} · ${meaning} · GRE · 下次 `))).toBeVisible()
    }

    const offlineState = await saved(page)
    const session = offlineState.practiceSessions![0]
    const practiceAttempts = offlineState.attempts.filter(attempt => attempt.sessionId === session.id)
    expect(offlineState.practiceSessions).toHaveLength(1)
    expect(session.status).toBe('submitted')
    expect(Object.keys(session.answers)).toHaveLength(20)
    expect(session.questions.map(item => item.question.id).sort()).toEqual(offlineQuestions.map(question => question.id).sort())
    expect(practiceAttempts).toHaveLength(20)
    expect(practiceAttempts.filter(attempt => attempt.correct === true)).toHaveLength(13)
    expect(practiceAttempts.filter(attempt => attempt.correct === false)).toHaveLength(7)
    expect(offlineState.attempts).toHaveLength(40)
    expect(offlineState.errorRecords).toHaveLength(7)
    expect(offlineState.reviewAttempts).toHaveLength(3)
    expect(new Set(offlineState.reviewAttempts.map(review => review.errorRecordId)).size).toBe(3)
    for (const review of offlineState.reviewAttempts) {
      expect(review.correct).toBe(true)
      expect(offlineState.errorRecords.find(error => error.id === review.errorRecordId)).toMatchObject({ status: 'resolved', reviewCount: 1 })
    }
    expect(offlineState.vocabulary).toHaveLength(20)
    expect(offlineState.vocabularyReviews).toHaveLength(20)
    expect(offlineState.vocabulary.map(card => [card.word, card.meaning]).sort()).toEqual([...offlineVocabulary].sort())
    for (const card of offlineState.vocabulary) {
      expect(card.fsrs?.reps).toBe(1)
      expect(Date.parse(card.fsrs!.due)).toBeGreaterThan(Date.now())
      expect(offlineState.vocabularyReviews!.filter(review => review.cardId === card.id)).toHaveLength(1)
      expect(offlineState.vocabularyReviews!.find(review => review.cardId === card.id)).toMatchObject({ rating: 4, due: card.fsrs!.due })
    }

    await page.goto('/practice')
    await expect(page.getByRole('link', { name: /^查看结果 · 20 题 · / })).toHaveCount(1)
    await page.getByRole('link', { name: /^查看结果 · 20 题 · / }).click()
    await expect(page.getByText('正确率 65%', { exact: true })).toBeVisible()
    await page.goto('/')
    await page.reload()
    await expect(page.getByText(/^今天：40 次作答 · 33 正确 · 7 错题 · 3 二刷 · 20 词汇复习 · /)).toBeVisible()
    await page.getByText('持久学习历史', { exact: true }).click()
    await expect(page.getByText(/^\d{4}-\d{2}-\d{2} · 40 作答 · 33 正确 · 3 二刷 · 20 词汇$/)).toBeVisible()
    await expectRetainedState(page, offlineState)

    await context.setOffline(false)
    await page.reload()
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(true)
    await expect(page.getByText(/^今天：40 次作答 · 33 正确 · 7 错题 · 3 二刷 · 20 词汇复习 · /)).toBeVisible()
    await page.getByText('持久学习历史', { exact: true }).click()
    await expect(page.getByText(/^\d{4}-\d{2}-\d{2} · 40 作答 · 33 正确 · 3 二刷 · 20 词汇$/)).toBeVisible()
    await expectRetainedState(page, offlineState)
    await page.goto('/questions')
    await expect(page.getByText('20 / 20 题', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^User-authored offline practice question \d+$/ })).toHaveCount(20)
    if (cloudEnabled) {
      // Obtain the expected portable bank through the same UI available in production.
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: '导出题库', exact: true }).click()
      const download = await downloadPromise
      const questionBank = JSON.parse(await readFile((await download.path())!, 'utf8'))
      await page.getByRole('button', { name: '设置', exact: true }).click()
      await page.getByRole('button', { name: '立即同步', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('已同步')
      await expect(page.getByLabel('同步状态', { exact: true })).toContainText('Synced')
      await expectRetainedState(page, offlineState)
      const expected = { ...businessState(await saved(page)), questionBank, cloudAssets: { recordings: [], materials: [] } }
      const freshContext = await browser.newContext()
      try {
        const fresh = await freshContext.newPage()
        await fresh.goto('/')
        await fresh.getByLabel('邮箱', { exact: true }).fill(email)
        await fresh.getByLabel('密码', { exact: true }).fill(password)
        await fresh.getByRole('button', { name: '登录', exact: true }).click()
        await expect(fresh.getByText('已登录：' + email, { exact: true })).toBeVisible()
        await fresh.getByRole('button', { name: '预览云端备份', exact: true }).click()
        await expect(fresh.getByText(/云端版本 \d+ · 40 条作答 · 7 道错题/)).toBeVisible()
        await fresh.getByRole('button', { name: '确认使用云端备份', exact: true }).click()
        await expect(fresh.getByRole('heading', { level: 1, name: "Today's Prescription", exact: true })).toBeVisible()
        // Reconciliation settles source references after restore; every business
        // field must still match the uploaded portable snapshot.
        await expect.poll(async () => businessState(await saved(fresh))).toEqual(expected)
        await expect(fresh.getByText(/^今天：40 次作答 · 33 正确 · 7 错题 · 3 二刷 · 20 词汇复习 · /)).toBeVisible()
        await fresh.getByText('持久学习历史', { exact: true }).click()
        await expect(fresh.getByText(/^\d{4}-\d{2}-\d{2} · 40 作答 · 33 正确 · 3 二刷 · 20 词汇$/)).toBeVisible()
        await fresh.getByRole('button', { name: '题库', exact: true }).click()
        await expect(fresh.getByText('20 / 20 题', { exact: true })).toBeVisible()
      } finally { await freshContext.close() }
    }
  } finally {
    await context.setOffline(false)
  }
})
