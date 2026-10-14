// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { migrateState } from '../storage'
import { ErrorAnalysis } from './ErrorAnalysis'
afterEach(cleanup)
it('shows existing cross-section enrichment as an editable selected skill', () => {
  const state = migrateState({})
  state.skills.push({ id: 'gre-cross-section', exam: 'gre', section: 'reading', name: 'Enriched reading', priorityWeight: 1 })
  state.errorRecords = [{ id: 'e', attemptId: 'a', exam: 'gre', section: 'verbal', skillIds: ['gre-text-completion', 'gre-cross-section'], errorType: 'vocabulary', createdAt: '2026-10-14', status: 'new', reviewCount: 0 }]
  render(<ErrorAnalysis state={state} onUpdate={vi.fn()} flash={vi.fn()} errorId="e" onClose={vi.fn()} />)
  expect((screen.getByRole('checkbox', { name: 'Enriched reading' }) as HTMLInputElement).checked).toBe(true)
  expect(screen.queryByRole('checkbox', { name: 'Vocabulary in Context' })).toBeNull()
})
