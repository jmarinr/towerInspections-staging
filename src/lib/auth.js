import permissions from '../data/permissions.json'

/**
 * Validate user credentials against permissions.json
 * @returns {{ success: boolean, user?: { username, name, role, roleLabel }, error?: string }}
 */
export function authenticate(username, pin) {
  const key = username.trim().toLowerCase()
  const userEntry = permissions.users[key]

  if (!userEntry) {
    return { success: false, error: 'Usuario no encontrado' }
  }

  if (userEntry.pin !== pin.trim()) {
    return { success: false, error: 'PIN incorrecto' }
  }

  const roleConfig = permissions.roles[userEntry.role]

  return {
    success: true,
    user: {
      username: key,
      name: userEntry.name,
      role: userEntry.role,
      roleLabel: roleConfig?.label || userEntry.role,
    },
  }
}

/**
 * Get allowed form IDs for a role
 * @returns {string[]} - Array of form IDs, or ['*'] for all access
 */
export function getAllowedForms(role) {
  const roleConfig = permissions.roles[role]
  if (!roleConfig) return []
  return roleConfig.forms || []
}

/**
 * Check if a role has access to a specific form
 */
export function canAccessForm(role, formId) {
  const allowed = getAllowedForms(role)
  if (allowed.includes('*')) return true
  return allowed.includes(formId)
}

/**
 * Filter a forms array to only include allowed forms for a role
 */
export function filterFormsByRole(forms, role) {
  const allowed = getAllowedForms(role)
  if (allowed.includes('*')) return forms
  return forms.filter((f) => allowed.includes(f.id))
}
