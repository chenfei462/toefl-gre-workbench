import type { SupabaseClient } from '@supabase/supabase-js'

export function createEmailAuth(client: SupabaseClient | null) {
  const requireClient = () => {
    if (!client) throw new Error('Cloud Sync unavailable. Local mode remains usable.')
    return client
  }
  return {
    async session() {
      if (!client) return null
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      return data.session
    },
    async signIn(email: string, password: string) {
      const { data, error } = await requireClient().auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    },
    async signUp(email: string, password: string) {
      const { data, error } = await requireClient().auth.signUp({ email, password })
      if (error) throw error
      return data
    },
    async signOut() {
      const { error } = await requireClient().auth.signOut({ scope: 'local' })
      if (error) throw error
    },
  }
}
