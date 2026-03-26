import { useState, useEffect, useMemo } from 'react'
import { Search, MapPin, ChevronRight, AlertTriangle, Loader2, Building2, Globe } from 'lucide-react'
import { fetchSitesDirect, fetchRegionsForUser } from '../../lib/siteCatalogService'

/**
 * SiteSelector — lets the inspector pick a site from the catalog.
 * If the inspector's company has multiple regions, shows a region
 * filter first. If only one region exists, it is skipped entirely.
 *
 * Props:
 *   selectedSite  — { id, site_id, name, province, height_m, region_id } | null
 *   onSelect(site) — callback when a site is chosen
 */
export default function SiteSelector({ selectedSite, onSelect }) {
  const [sites, setSites]     = useState([])
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [query, setQuery]     = useState('')
  const [selectedRegion, setSelectedRegion] = useState(null)  // { id, name } | null
  const [open, setOpen]       = useState(!selectedSite)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchSitesDirect(), fetchRegionsForUser()])
      .then(([sitesData, regionsData]) => {
        setSites(sitesData)
        setRegions(regionsData)
        // Auto-select if only one region — inspector never sees the picker
        if (regionsData.length === 1) setSelectedRegion(regionsData[0])
      })
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false))
  }, [])

  const multiRegion = regions.length > 1

  // Sites filtered by region + search query
  const filtered = useMemo(() => {
    let list = sites
    if (selectedRegion) {
      list = list.filter(s => s.region_id === selectedRegion.id)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(s =>
        s.site_id?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.province?.toLowerCase().includes(q)
      )
    }
    return list
  }, [sites, selectedRegion, query])

  // ── Already selected — show summary + change button ──
  if (selectedSite && !open) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg">
                  {selectedSite.site_id}
                </span>
                {selectedSite.height_m && (
                  <span className="text-xs text-gray-400">{selectedSite.height_m}m</span>
                )}
              </div>
              <div className="font-bold text-sm text-gray-900">{selectedSite.name}</div>
              {selectedSite.province && (
                <div className="text-xs text-gray-400 mt-0.5">{selectedSite.province}</div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-primary font-bold px-3 py-1.5 rounded-xl border border-primary/30 hover:bg-primary/5 active:scale-95 transition-all flex-shrink-0"
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  // ── Selector open ──
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Seleccionar Sitio
        </div>

        {/* Region filter — only shown when company has multiple regions */}
        {!loading && !error && multiRegion && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Globe size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500">Región</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {regions.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRegion(prev => prev?.id === r.id ? null : r)
                    setQuery('')
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    selectedRegion?.id === r.id
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search — visible only after a region is chosen (or single-region) */}
        {(!multiRegion || selectedRegion) && (
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por ID, nombre o provincia..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-gray-50"
              autoComplete="off"
            />
          </div>
        )}

        {/* Hint when multi-region and no region selected yet */}
        {!loading && !error && multiRegion && !selectedRegion && (
          <p className="text-xs text-gray-400 text-center py-1">
            Selecciona una región para ver los sitios disponibles
          </p>
        )}
      </div>

      {/* Site list — hidden until region is picked in multi-region mode */}
      {(!multiRegion || selectedRegion) && (
        <div className="max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Cargando sitios...</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 p-4 text-amber-700 bg-amber-50">
              <AlertTriangle size={18} />
              <div>
                <div className="text-sm font-bold">Error al cargar sitios</div>
                <div className="text-xs">{error}</div>
              </div>
            </div>
          )}

          {!loading && !error && sites.length === 0 && (
            <div className="p-6 text-center">
              <AlertTriangle size={28} className="text-amber-400 mx-auto mb-2" />
              <div className="font-bold text-sm text-gray-800 mb-1">Sin sitios disponibles</div>
              <div className="text-xs text-gray-500">
                No hay sitios asignados a su empresa. Comuníquese con su supervisor.
              </div>
            </div>
          )}

          {!loading && !error && sites.length > 0 && filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              {query ? `Sin resultados para "${query}"` : 'No hay sitios en esta región'}
            </div>
          )}

          {!loading && !error && filtered.map(site => (
            <button
              key={site.id}
              type="button"
              onClick={() => { onSelect({ ...site, region_name: regions.find(r => r.id === site.region_id)?.name || '' }); setOpen(false); setQuery('') }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-primary/5 transition-colors border-b border-gray-50 last:border-0 ${
                selectedSite?.id === site.id ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg flex-shrink-0">
                    {site.site_id}
                  </span>
                  {site.height_m && (
                    <span className="text-xs text-gray-400 flex-shrink-0">{site.height_m}m</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-900 truncate">{site.name}</div>
                {site.province && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{site.province}</span>
                  </div>
                )}
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Cancel if already had a selection */}
      {selectedSite && (
        <div className="p-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => { setOpen(false); setQuery('') }}
            className="w-full py-2 text-sm text-gray-500 font-medium rounded-xl hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
