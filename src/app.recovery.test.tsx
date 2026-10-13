// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { storage } from './storage'

beforeEach(() => storage.clear())
afterEach(cleanup)

it('shows retained original data and a recovery download when startup cannot parse the saved history', () => {
  const raw = '{"damaged-history":'
  localStorage.setItem('toefl-gre-workbench:v2', raw)
  render(<MemoryRouter><App /></MemoryRouter>)

  expect(storage.getRecovery()?.rawPayload).toBe(raw)
  expect(screen.getByRole('alert').textContent).toContain('原始学习数据')
  expect(screen.getByRole('button', { name: '下载原始恢复数据' })).toBeTruthy()
})
