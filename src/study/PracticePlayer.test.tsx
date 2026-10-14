// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IndexedDbQuestionRepository } from '../questionDatabase/indexedDbRepository'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import { migrateState } from '../storage'
import { PracticePlayer } from './PracticePlayer'
import { createPracticeSession } from './practice'
import type { Question } from '../types'
afterEach(cleanup)
it('honors prescription exam, skill and duration and can clear the filter', async () => {
  render(<MemoryRouter initialEntries={['/practice?exam=gre&skill=gre-logic&minutes=15']}><PracticePlayer state={migrateState({})} onUpdate={vi.fn()} flash={vi.fn()} /></MemoryRouter>)
  expect(await screen.findByText('处方技能：gre-logic')).toBeTruthy()
  expect((screen.getByLabelText('时长（分钟）') as HTMLInputElement).value).toBe('15')
  expect((screen.getByLabelText('考试') as HTMLSelectElement).value).toBe('gre')
  fireEvent.click(screen.getByRole('button', { name: '清除筛选，显示全部题目' }))
  expect(screen.queryByText('处方技能：gre-logic')).toBeNull()
})
it('starts a session from the real IndexedDB bank with passage and audio snapshots', async () => {
  const repository = new IndexedDbQuestionRepository(), id = crypto.randomUUID()
  await repository.importQuestions([{ id, sourceId: 'user-manual', sourceQuestionId: 'sample', exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', title: 'Repository practice item', skillIds: [], options: [], storageMode: 'reference_only', verification: 'unverified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, explanationIds: [], mediaIds: ['audio-fixture'], passageId: 'passage-fixture', tags: [] }])
  await repository.saveReferences({ passages: [{ id: 'passage-fixture', sourceId: 'user-manual', text: 'A retained passage', storageMode: 'full' }], media: [{ id: 'audio-fixture', questionId: id, kind: 'audio', url: 'https://example.com/audio.mp3', storageMode: 'full' }] })
  function Harness() { const [state, setState] = useState(migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })); return <PracticePlayer state={state} onUpdate={setState} flash={vi.fn()} /> }
  render(<MemoryRouter initialEntries={['/practice']}><Routes><Route path='/practice' element={<Harness />} /><Route path='/practice/session/:sessionId' element={<Harness />} /></Routes></MemoryRouter>)
  fireEvent.click(await screen.findByLabelText(/Repository practice item/))
  fireEvent.click(screen.getByRole('button', { name: '开始练习 · 1 题' }))
  expect(await screen.findByText('A retained passage')).toBeTruthy()
  expect(screen.getByLabelText('题目音频').getAttribute('src')).toBe('https://example.com/audio.mp3')
})
it('persists answers and flags, navigates with keyboard and confirms unanswered submission', async () => {
  const q: Question = { id: 'q', sourceId: 'user-manual', exam: 'gre', examVersion: 'GRE_CURRENT', section: 'verbal', questionType: 'text_completion', skillIds: [], prompt: 'Pick a word', options: [{ id: 'a', text: 'Alpha' }], answer: { optionId: 'a', verification: 'verified' }, answerType: 'single_choice', storageMode: 'full', verification: 'verified', compatibility: { examVersion: 'GRE_CURRENT', status: 'current' }, promptHash: '', explanationIds: [], mediaIds: [], tags: [], active: true, createdAt: '', updatedAt: '' }
  const session = createPracticeSession([{ question: q, media: [] }, { question: { ...q, id: 'q2', prompt: 'Second word' }, media: [] }], 30)
  function Harness() { const [state, setState] = useState({ ...migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] }), practiceSessions: [session] }); return <PracticePlayer state={state} onUpdate={next => setState({ ...next, practiceSessions: next.practiceSessions! })} flash={vi.fn()} /> }
  render(<MemoryRouter initialEntries={[`/practice/session/${session.id}`]}><Routes><Route path='/practice/session/:sessionId' element={<Harness />} /></Routes></MemoryRouter>)
  fireEvent.click(screen.getByLabelText('Alpha'))
  fireEvent.click(screen.getByRole('button', { name: '标记本题' }))
  fireEvent.keyDown(document, { key: 'ArrowRight' })
  expect(screen.getByText('Second word')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '上一题' }))
  expect((screen.getByLabelText('Alpha') as HTMLInputElement).checked).toBe(true)
  expect(screen.getByRole('button', { name: '取消标记' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '提交练习' }))
  expect(screen.getByText('还有 1 题未作答。未答题不会算作已掌握或错误。')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '确认提交' }))
  expect(screen.getByRole('heading', { name: '练习结果' })).toBeTruthy()
  expect(screen.getByText('待评价 / 未答 1')).toBeTruthy()
})
