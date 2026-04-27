import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, Mail, Eye, EyeOff, AlertTriangle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAppStore } from '../hooks/useAppStore'
import { getDeviceId } from '../lib/deviceId'

export default function Login() {
  const navigate   = useNavigate()
  const setSession = useAppStore((s) => s.setSession)
  const displacedByDevice = useAppStore((s) => s.displacedByDevice)
  // Also check location.state for displaced flag passed from RequireAuth redirect
  const location = useLocation?.() || {}
  const isDisplaced = displacedByDevice || location?.state?.displaced

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  // Single-session state
  const [blockedByDevice, setBlockedByDevice] = useState(false)
  const [pendingProfile, setPendingProfile]   = useState(null)
  const [pendingAuth, setPendingAuth]         = useState(null)
  const [forcing, setForcing]                 = useState(false)

  const deviceId = getDeviceId()

  // ── Core login logic (shared between normal and forced) ──────────────────
  const completeLogin = (profile, authData) => {
    setSession({
      userId:      profile.id,
      username:    authData.session.user.email,
      name:        profile.full_name,
      role:        profile.role,
      roleLabel:   'Inspector',
      orgCode:     profile.companies?.org_code || 'PTI',
      companyId:   profile.company_id,
      supervisorId: profile.supervisor_id || null,
    })
    navigate('/order')
  }

  // ── Normal login ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBlockedByDevice(false)
    console.log('[App] PTI Inspect v2.7.16 starting') — deviceId:', deviceId.slice(0, 8))

    if (!email.trim())    { setError('Ingrese su correo electrónico'); return }
    if (!password.trim()) { setError('Ingrese su contraseña'); return }

    setLoading(true)
    try {
      // 1. Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (authError) {
        setError('Credenciales incorrectas. Verifique su correo y contraseña.')
        setLoading(false)
        return
      }

      // 2. Load profile — use maybeSingle + no-cache to always get fresh active_device_id
      const { data: profile, error: profileError } = await supabase
        .from('app_users')
        .select('id, full_name, role, company_id, supervisor_id, active, active_device_id, active_device_at, companies(org_code, name)')
        .eq('id', authData.session.user.id)
        .maybeSingle()

      if (profileError || !profile) {
        setError('No se encontró un perfil de usuario. Contacte al administrador.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (!profile.active) {
        setError('Su cuenta está desactivada. Contacte al administrador.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (!['inspector', 'inspector-beta'].includes(profile.role)) {
        setError('Este acceso es solo para inspectores. Use el panel de administración.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // 3. Single-session check
      const existingDevice = profile.active_device_id
      console.log('[Login] device check — existing:', existingDevice?.slice(0, 8), 'current:', deviceId.slice(0, 8))
      const isBlocked = existingDevice && existingDevice !== deviceId

      if (isBlocked) {
        // Store pending data for forced login flow
        setPendingProfile(profile)
        setPendingAuth(authData)
        setBlockedByDevice(true)
        setLoading(false)
        return
      }

      // 4. Register this device
      const { error: updateErr } = await supabase
        .from('app_users')
        .update({ active_device_id: deviceId, active_device_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (updateErr) {
        console.warn('[Login] active_device_id update failed:', updateErr.message)
        // Proceed anyway — device lock not enforced if DB write fails
      } else {
        console.log('[Login] active_device_id registered:', deviceId.slice(0, 8))
      }

      completeLogin(profile, authData)
    } catch (err) {
      console.error('[Login] unexpected error:', err)
      setError('Error inesperado. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Force login ──────────────────────────────────────────────────────────
  const handleForceLogin = async () => {
    if (!pendingProfile || !pendingAuth) return
    setForcing(true)
    try {
      // Log the forced session
      await supabase.from('session_force_log').insert({
        user_id:            pendingProfile.id,
        previous_device_id: pendingProfile.active_device_id,
        new_device_id:      deviceId,
        user_agent:         navigator.userAgent,
      })

      // Overwrite active device
      const { error: forceErr } = await supabase
        .from('app_users')
        .update({ active_device_id: deviceId, active_device_at: new Date().toISOString() })
        .eq('id', pendingProfile.id)

      if (forceErr) {
        console.warn('[Login] force update failed:', forceErr.message)
        setError('Error al registrar dispositivo. Intente de nuevo.')
        setForcing(false)
        return
      }

      completeLogin(pendingProfile, pendingAuth)
    } catch (err) {
      console.error('[Login] force login error:', err)
      setError('Error al forzar sesión. Intente de nuevo.')
      setBlockedByDevice(false)
    } finally {
      setForcing(false)
    }
  }

  const handleCancelForce = () => {
    setBlockedByDevice(false)
    setPendingProfile(null)
    setPendingAuth(null)
    supabase.auth.signOut().catch(() => {})
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">🗼</span>
        </div>
        <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-extrabold text-gray-900">PTI Inspect</h1>
              {import.meta.env.VITE_APP_ENV === 'sandbox' && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase"
                  style={{ background: '#E0FAF4', color: '#007A63', border: '1px solid #99F6E4' }}>
                  Sandbox
                </span>
              )}
            </div>
        <p className="text-sm text-gray-500 mt-1">Ingrese sus credenciales</p>
      </div>

      {isDisplaced && (
        <div className="w-full max-w-sm mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Sesión cerrada</p>
            <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
              Tu sesión fue iniciada en otro dispositivo. Vuelve a ingresar.
            </p>
          </div>
        </div>
      )}

      {/* ── Blocked by another device ── */}
      {blockedByDevice ? (
        <div className="w-full max-w-sm bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Sesión activa en otro dispositivo</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Tu cuenta ya tiene una sesión abierta en otro dispositivo. Cierra sesión allá primero, o fuerza el inicio de sesión aquí.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700 font-semibold">
              ⚠️ Forzar el inicio de sesión cerrará la sesión del otro dispositivo y quedará registrado en el sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={handleForceLogin}
            disabled={forcing}
            className="w-full py-3 rounded-xl font-bold text-white text-sm bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {forcing ? (
              <><RefreshCw size={16} className="animate-spin" /> Forzando sesión...</>
            ) : (
              <><RefreshCw size={16} /> Forzar inicio de sesión</>
            )}
          </button>

          <button
            type="button"
            onClick={handleCancelForce}
            className="w-full py-2.5 rounded-xl font-semibold text-gray-600 text-sm bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
        </div>
      ) : (
        /* ── Normal login form ── */
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); useAppStore.setState({ displacedByDevice: false }) }}
                placeholder="inspector@ejemplo.com"
                autoComplete="email"
                autoCapitalize="none"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:scale-95"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <p className="text-sm font-semibold text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary shadow-sm hover:shadow-md'
            }`}
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      )}

      <p className="text-xs text-gray-400 mt-6">PTI Inspect v2.7.16{import.meta.env.VITE_APP_ENV === 'sandbox' ? ' · Sandbox' : ''}</p>
      <p className="text-xs text-gray-400 mt-1">
        by{' '}
        <a href="http://henkancx.com" target="_blank" rel="noopener noreferrer"
          className="text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors">
          HenkanCX
        </a>
      </p>
      <button
        type="button"
        onClick={() => {
          if (window.confirm('¿Borrar todos los datos locales? Se perderán formularios no enviados.')) {
            localStorage.clear()
            window.location.reload()
          }
        }}
        className="mt-2 text-[11px] text-gray-300 underline underline-offset-2 active:text-red-400"
      >
        Borrar datos locales
      </button>
    </div>
  )
}
