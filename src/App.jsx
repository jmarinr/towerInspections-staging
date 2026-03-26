import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import InspeccionSitio from './pages/InspeccionSitio'
import MantenimientoPreventivo from './pages/MantenimientoPreventivo'
import InventarioEquipos from './pages/InventarioEquipos'
import InventarioEquiposV2 from './pages/InventarioEquiposV2'
import SafetyClimbingDevice from './pages/SafetyClimbingDevice'
import GroundingSystemTest from './pages/GroundingSystemTest'
import AdditionalPhotoReport from './pages/AdditionalPhotoReport'
import PreventiveMaintenanceExecuted from './pages/PreventiveMaintenanceExecuted'
import Login from './pages/Login'
import OrderScreen from './pages/OrderScreen'
import FormIntro from './pages/FormIntro'
import SplashScreen from './components/ui/SplashScreen'
import Toast from './components/ui/Toast'
import ConnectivityBanner from './components/ui/ConnectivityBanner'
import { useAppStore } from './hooks/useAppStore'

const APP_VERSION = '2.5.86'
import { startSupabaseBackgroundSync } from './lib/supabaseSync'
import { supabase } from './lib/supabaseClient'
import RequireAuth from './components/auth/RequireAuth'

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-6">
        <div className="text-lg font-extrabold text-gray-900">Página no encontrada</div>
        <p className="mt-2 text-sm text-gray-600">La ruta no existe o cambió en esta versión.</p>
        <a
          href="#/"
          className="inline-flex mt-5 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  )
}

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const { toast, hideToast, logout } = useAppStore()
  const forceUpdate = useAppStore((s) => s.forceUpdate)


  useEffect(() => {
    startSupabaseBackgroundSync()
  }, [])

  // ── Version check every 60 minutes ──────────────────────────────────────
  useEffect(() => {
    const checkVersion = async () => {
      if (!navigator.onLine) return
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'min_version')
          .single()
        if (error || !data?.value) return

        const parse = (v) => String(v).split('.').map((n) => parseInt(n, 10))
        const min = parse(data.value)
        const cur = parse(APP_VERSION)

        // Compare major.minor.patch lexicographically
        let isOutdated = false
        for (let i = 0; i < 3; i++) {
          if (cur[i] < min[i]) { isOutdated = true; break }
          if (cur[i] > min[i]) { isOutdated = false; break }
        }

        console.log(`[VersionCheck] current=${APP_VERSION} min=${data.value} outdated=${isOutdated}`)
        if (isOutdated) {
          useAppStore.setState({ forceUpdate: true })
        }
      } catch (e) {
        console.warn('[VersionCheck] failed:', e?.message)
      }
    }

    checkVersion()
    const interval = setInterval(checkVersion, 60 * 60 * 1000) // 60 min
    return () => clearInterval(interval)
  }, [])


  // Session watchdog moved to RequireAuth.jsx — runs only when authenticated

  // ── Session watchdog: if Supabase token expires/invalidates, force logout ──
  // Guard: only act if session still exists in store to avoid logout → signOut → SIGNED_OUT → logout loop
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        const currentSession = useAppStore.getState().session
        if (currentSession) {
          logout()
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [logout])

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showSplash && <SplashScreen />}

      {/* ── Force update modal ── */}
      {forceUpdate && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-3xl">🗼</span>
            </div>
            <div>
              <p className="text-base font-extrabold text-gray-900">Nueva versión disponible</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Hay una actualización requerida del sistema. Por favor actualiza para continuar.
              </p>
            </div>
            <button
              onClick={() => {
                logout()
                setTimeout(() => window.location.reload(true), 300)
              }}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-primary active:scale-[0.98] transition-all"
            >
              Actualizar ahora
            </button>
          </div>
        </div>
      )}
      <ConnectivityBanner />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route element={<RequireAuth />}>
          <Route path="/order" element={<OrderScreen />} />
          <Route path="/" element={<Home />} />
          <Route path="/intro/:formId" element={<FormIntro />} />

          {/* Compat: el menú principal usa /inspeccion */}
          <Route path="/inspeccion" element={<InspeccionSitio />} />
          <Route path="/inspeccion/:step" element={<InspeccionSitio />} />
          <Route path="/inspeccion-sitio" element={<InspeccionSitio />} />
          <Route path="/inspeccion-sitio/:step" element={<InspeccionSitio />} />

          <Route path="/mantenimiento" element={<MantenimientoPreventivo />} />
          {/* Alias para compatibilidad (evita pantalla en blanco si se usa este path) */}
          <Route path="/mantenimiento-preventivo" element={<MantenimientoPreventivo />} />

          <Route path="/mantenimiento-ejecutado" element={<PreventiveMaintenanceExecuted />} />

          <Route path="/inventario-equipos" element={<InventarioEquipos />} />
          <Route path="/inventario-equipos/:step" element={<InventarioEquipos />} />

          <Route path="/inventario-equipos-v2" element={<InventarioEquiposV2 />} />
          <Route path="/inventario-equipos-v2/:step" element={<InventarioEquiposV2 />} />

          <Route path="/safety-climbing-device" element={<SafetyClimbingDevice />} />
          <Route path="/sistema-ascenso" element={<SafetyClimbingDevice />} />

          <Route path="/grounding-system-test" element={<GroundingSystemTest />} />

          <Route path="/reporte-fotos" element={<AdditionalPhotoReport />} />

          {/* Fallback para evitar pantalla en blanco en rutas no registradas */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toast message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />
    </>
  )
}

export default App
