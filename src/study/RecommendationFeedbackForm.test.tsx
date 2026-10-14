// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { migrateState } from '../storage'
import type { DailyPrescriptionBlock } from '../types'
import { RecommendationFeedbackForm } from './RecommendationFeedbackForm'

afterEach(cleanup)
const initial = () => migrateState({ schemaVersion: 1, profile: {}, tasks: [], resources: [], practiceEntries: [], weeklyReviews: [] })
const block: DailyPrescriptionBlock = { id: 'feedback-tc', exam: 'gre', section: 'verbal', skillId: 'gre-text-completion', type: 'practice', minutes: 30, priority: 80, reason: 'Recent errors' }

it('requires explicit rating and verdict before collecting feedback for the prescribed block', () => {
  const onUpdate = vi.fn()
  render(<RecommendationFeedbackForm state={initial()} onUpdate={onUpdate} block={block} date="2026-10-14" />)
  fireEvent.click(screen.getByText('评价这条建议'))
  const save = screen.getByRole('button', { name: '保存建议反馈' })
  expect(save).toBeDisabled()
  fireEvent.change(screen.getByLabelText('建议评分'), { target: { value: '2' } })
  expect(save).toBeDisabled()
  fireEvent.change(screen.getByLabelText('反馈原因'), { target: { value: 'bad_time_allocation' } })
  fireEvent.change(screen.getByLabelText('补充说明（可选）'), { target: { value: 'Need fewer minutes' } })
  fireEvent.click(save)
  expect(onUpdate).toHaveBeenCalledTimes(1)
  expect(onUpdate.mock.calls[0][0].recommendationFeedback[0]).toMatchObject({ skillId: block.skillId, recommendedMinutes: 30, rating: 2, verdict: 'bad_time_allocation', note: 'Need fewer minutes' })
  expect(screen.getByRole('status')).toHaveTextContent('建议反馈已记录')
  fireEvent.click(save)
  expect(onUpdate).toHaveBeenCalledTimes(1)
})

it('does not invent a skill identifier for a general review block', () => {
  const { container } = render(<RecommendationFeedbackForm state={initial()} onUpdate={vi.fn()} block={{ ...block, skillId: undefined }} date="2026-10-14" />)
  expect(container).toBeEmptyDOMElement()
})

it('presents a failed collection without a false saved message', () => {
  render(<RecommendationFeedbackForm state={initial()} onUpdate={() => { throw new Error('Local save failed') }} block={block} date="2026-10-14" />)
  fireEvent.click(screen.getByText('评价这条建议'))
  fireEvent.change(screen.getByLabelText('建议评分'), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText('反馈原因'), { target: { value: 'correct' } })
  fireEvent.click(screen.getByRole('button', { name: '保存建议反馈' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Local save failed')
  expect(screen.queryByRole('status')).toBeNull()
})
