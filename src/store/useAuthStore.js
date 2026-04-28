import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import permissions from '../data/permissions.json'

export const useAuthStore = create(
  persist(
    (set) => ({
      isAuthed: false,
      user: null,

      login: ({ username, password }) => {
        const key = String(username).trim().toLowerCase()
        const userEntry = permissions.users[key]

        if (!userEntry) return { ok: false, message: 'Usuario no encontrado' }
        if (userEntry.pin !== String(password).trim()) return { ok: false, message: 'PIN incorrecto' }

        const roleConfig = permissions.roles[userEntry.role]

        // Only allow roles with admin access
        if (roleConfig?.access !== 'admin') {
          return { ok: false, message: 'Sin acceso al panel de administración' }
        }

        const user = {
          username: key,
          name: userEntry.name,
          role: userEntry.role,
          roleLabel: roleConfig?.label || userEntry.role,
        }

        set({ isAuthed: true, user })
        return { ok: true }
      },

      logout: () => set({ isAuthed: false, user: null }),
    }),
    { name: 'pti_admin_auth_v2' }
  )
)
