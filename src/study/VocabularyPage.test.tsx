// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { migrateState } from '../storage'
import { VocabularyPage } from './VocabularyPage'
afterEach(cleanup)
it('adds a due card immediately and lets an unknown-word meaning be completed before review', () => {
  function Harness() { const [state, setState] = useState(migrateState({})); return <VocabularyPage state={state} onUpdate={setState} flash={() => {}} /> }
  render(<Harness />)
  fireEvent.change(screen.getByPlaceholderText('添加一个词'), { target: { value: 'mitigate' } })
  fireEvent.click(screen.getByRole('button', { name: '添加词汇' }))
  fireEvent.click(screen.getByRole('button', { name: '显示词义' }))
  fireEvent.change(screen.getByLabelText('编辑 mitigate 词义'), { target: { value: 'reduce' } })
  fireEvent.click(screen.getByRole('button', { name: 'Good' }))
  expect(screen.getByText(/mitigate · reduce/)).toBeTruthy()
})
