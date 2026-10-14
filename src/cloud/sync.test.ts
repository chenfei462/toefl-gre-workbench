import { expect, it, vi } from 'vitest'
import { pushSnapshot } from './sync'
import { createSnapshot } from './snapshot'
import { migrateState } from '../storage'

const local = () => createSnapshot(migrateState({ schemaVersion: 1, profile: {}, tasks: [] }))
it('pushes only against the known remote revision', async () => {
  const snapshot = await local()
  const remote = { ...snapshot, revision: 4 }
  const compareAndSwap = vi.fn().mockResolvedValue({ ...snapshot, revision: 7 })
  const recover = vi.fn()
  expect(await pushSnapshot({ read: async () => remote, compareAndSwap }, snapshot, { baseRevision: 4, localRevision: 7, deviceId: 'a' }, recover)).toEqual({ status: 'synced', revision: 7 })
  expect(compareAndSwap).toHaveBeenCalledWith(snapshot, 4, 7, 'a')
  expect(recover).not.toHaveBeenCalled()
})
it('durably saves both sides before returning conflict, even for equal content', async () => {
  const snapshot = await local()
  const remote = { ...snapshot, revision: 5 }
  const compareAndSwap = vi.fn()
  const recover = vi.fn().mockResolvedValue(undefined)
  expect((await pushSnapshot({ read: async () => remote, compareAndSwap }, snapshot, { baseRevision: 4, localRevision: 5, deviceId: 'a' }, recover)).status).toBe('conflict')
  expect(recover).toHaveBeenCalledWith(expect.objectContaining({ local: snapshot, remote }))
  expect(compareAndSwap).not.toHaveBeenCalled()
})
it('does not overwrite when recovery storage fails', async () => {
  const snapshot = await local()
  const compareAndSwap = vi.fn()
  await expect(pushSnapshot({ read: async () => ({ ...snapshot, revision: 2 }), compareAndSwap }, snapshot, { baseRevision: 1, localRevision: 2, deviceId: 'a' }, async () => { throw new Error('quota') })).rejects.toThrow('quota')
  expect(compareAndSwap).not.toHaveBeenCalled()
})
it.each(['PT409', '40001'])('rechecks and preserves the winner after a concurrent CAS loss (%s)', async code => {
  const snapshot = await local()
  const read = vi.fn().mockResolvedValueOnce({ ...snapshot, revision: 1 }).mockResolvedValueOnce({ ...snapshot, revision: 2 })
  const recover = vi.fn()
  const result = await pushSnapshot({ read, compareAndSwap: async () => { throw Object.assign(new Error('conflict'), { code }) } }, snapshot, { baseRevision: 1, localRevision: 2, deviceId: 'a' }, recover)
  expect(result.status).toBe('conflict')
  expect(recover).toHaveBeenCalledOnce()
  expect(recover).toHaveBeenCalledWith(expect.objectContaining({ local: snapshot, remote: { ...snapshot, revision: 2 } }))
})
it('propagates network failures without invoking a recovery overwrite', async () => {
  const snapshot = await local()
  const recover = vi.fn()
  await expect(pushSnapshot({ read: async () => { throw new Error('offline') }, compareAndSwap: vi.fn() }, snapshot, { baseRevision: 0, localRevision: 1, deviceId: 'a' }, recover)).rejects.toThrow('offline')
  expect(recover).not.toHaveBeenCalled()
})
