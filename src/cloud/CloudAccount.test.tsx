// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CloudAccount } from './CloudAccount'
import { acknowledgeSync } from './metadata'
const mocks = vi.hoisted(() => ({
  listener: undefined as undefined | ((event: string, session: unknown) => void),
  sync: vi.fn(), previewRestore: vi.fn(), keepLocal: vi.fn(),
  session: { user: { id: 'a', email: 'a@example.com' } },
}))
vi.mock('./client', () => {
  const client = { auth: { dispose: vi.fn(), onAuthStateChange: (listener: typeof mocks.listener) => { mocks.listener = listener; return { data: { subscription: { unsubscribe: vi.fn() } } } } } }
  return { getCloudClient: () => client, createOperationClient: () => client }
})
vi.mock('./auth', () => ({ createEmailAuth: () => ({ session: async () => mocks.session }) }))
vi.mock('./transport', () => ({ createSnapshotTransport: () => ({}) }))
vi.mock('./storage', () => ({ createBinaryStorage: () => ({}) }))
vi.mock('./assets', () => ({ createAssetSync: () => ({}) }))
vi.mock('./service', () => ({ createCloudService: () => ({ sync: mocks.sync, previewRestore: mocks.previewRestore, keepLocal: mocks.keepLocal }) }))
beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })
afterEach(cleanup)

it('discards a late conflict result from the previous account', async () => {
  let finish!: (result: unknown) => void
  mocks.sync.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  render(<CloudAccount />)
  await screen.findByText('已登录：a@example.com')
  fireEvent.click(screen.getByRole('button', { name: '立即同步' }))
  await act(async () => { mocks.listener!('SIGNED_IN', { user: { id: 'b', email: 'b@example.com' } }) })
  await act(async () => { finish({ status: 'conflict', remote: { revision: 7 } }) })
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.queryByText(/云端版本 7/)).toBeNull()
  expect(screen.getByText('已登录：b@example.com')).toBeTruthy()
})

it('discards a late restore preview from the previous account', async () => {
  let finish!: (result: unknown) => void
  mocks.previewRestore.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  render(<CloudAccount />)
  await screen.findByText('已登录：a@example.com')
  fireEvent.click(screen.getByRole('button', { name: '预览云端备份' }))
  await act(async () => { mocks.listener!('SIGNED_IN', { user: { id: 'b', email: 'b@example.com' } }) })
  await act(async () => { finish({ userId: 'a', remote: { revision: 7 }, state: { attempts: [], errorRecords: [] } }) })
  await waitFor(() => expect(screen.queryByRole('button', { name: '确认使用云端备份' })).toBeNull())
})

it('shows pending changes and the previous sync time after a local save', async () => {
  localStorage.setItem('toefl-gre-workbench:v2', JSON.stringify({ _localRevision: 3 }))
  acknowledgeSync('a', 3, 7)
  render(<CloudAccount />)
  await screen.findByText('已登录：a@example.com')
  expect(screen.getByText(/Synced · 已同步/)).toBeTruthy()
  expect(screen.getByText(/上次同步/)).toBeTruthy()
  await act(async () => {
    localStorage.setItem('toefl-gre-workbench:v2', JSON.stringify({ _localRevision: 4 }))
    window.dispatchEvent(new Event('workbench-data-change'))
  })
  expect(screen.getByText(/Sync pending · 待同步/)).toBeTruthy()
})
