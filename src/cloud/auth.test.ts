import { describe, expect, it, vi } from 'vitest'
import { createEmailAuth } from './auth'

describe('email auth boundary', () => {
  it('reports local mode without constructing a remote client', async () => {
    const auth = createEmailAuth(null)
    expect(await auth.session()).toBeNull()
    await expect(auth.signIn('learner@example.com', 'password')).rejects.toThrow('Cloud Sync unavailable')
  })
  it('passes credentials to the official client and propagates auth errors', async () => {
    const error = new Error('Invalid login credentials')
    const signInWithPassword = vi.fn().mockResolvedValue({ data: {}, error })
    const auth = createEmailAuth({ auth: { signInWithPassword } } as never)
    await expect(auth.signIn('learner@example.com', 'password')).rejects.toBe(error)
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'learner@example.com', password: 'password' })
  })
  it('restores sessions and signs out only through auth', async () => {
    const session = { user: { id: 'a' } }
    const signOut = vi.fn().mockResolvedValue({ error: null })
    const auth = createEmailAuth({ auth: { getSession: async () => ({ data: { session }, error: null }), signOut } } as never)
    expect(await auth.session()).toBe(session)
    await auth.signOut()
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
