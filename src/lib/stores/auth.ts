import { writable, derived } from 'svelte/store'

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'employee'
  employeeCode: string
  department?: string
  designation?: string
  avatar?: string
}

function createAuthStore() {
  const { subscribe, set, update } = writable<{ user: User | null; token: string | null }>({
    user: null,
    token: null,
  })

  return {
    subscribe,
    init() {
      if (typeof localStorage === 'undefined') return
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      if (token && userStr) {
        try {
          set({ token, user: JSON.parse(userStr) })
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
    },
    login(token: string, user: User) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ token, user })
    },
    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      set({ token: null, user: null })
    },
    updateUser(user: Partial<User>) {
      update(state => {
        if (!state.user) return state
        const updated = { ...state.user, ...user }
        localStorage.setItem('user', JSON.stringify(updated))
        return { ...state, user: updated }
      })
    },
  }
}

export const authStore = createAuthStore()
export const user = derived(authStore, $auth => $auth.user)
export const isLoggedIn = derived(authStore, $auth => !!$auth.token)
export const isAdmin = derived(authStore, $auth => $auth.user?.role === 'admin')
