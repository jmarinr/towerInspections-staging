import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import FormMetaBar from '../components/layout/FormMetaBar'
import BottomNav from '../components/layout/BottomNav'
import AutosaveIndicator from '../components/ui/AutosaveIndicator'
import DynamicForm from '../components/forms/DynamicForm'
import { groundingSystemTestConfig } from '../data/groundingSystemTestConfig'
import { useAppStore } from '../hooks/useAppStore'
import FormLockedScreen from '../components/ui/FormLockedScreen'
import ConfirmFinalizeModal from '../components/ui/ConfirmFinalizeModal'

function isFilled(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function getSectionProgress(fields, data) {
  if (!fields?.length) return { total: 0, filled: 0 }
  const d = data ?? {}
  // Exclude calculated fields from progress
  const countable = fields.filter((f) => f.type !== 'calculated')
  const filled = countable.filter((f) => isFilled(d[f.id])).length
  return { total: countable.length, filled }
}

function isSectionComplete(fields, data) {
  if (!fields?.length) return false
  const d = data ?? {}
  const required = fields.filter((f) => f.required)
  if (required.length > 0) {
    return required.every((f) => isFilled(d[f.id]))
  }
  const countable = fields.filter((f) => f.type !== 'calculated')
  return countable.some((f) => isFilled(d[f.id]))
}

const SECTION_EMOJIS = {
  datos: '📋',
  condiciones: '🌦️',
  equipo: '🔧',
  medicion: '📐',
  evidencia: '📸',
}

const SHORT_LABELS = {
  datos: 'Datos',
  condiciones: 'Terreno',
  equipo: 'Equipo',
  medicion: 'Medición',
  evidencia: 'Fotos',
}

const FORM_ID = 'grounding-system-test'

export default function GroundingSystemTest() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const isFormCompleted = useAppStore((s) => s.isFormCompleted)


  const groundingData = useAppStore((s) => s.groundingSystemData || {})
  const setGroundingField = useAppStore((s) => s.setGroundingField)
  const showToast = useAppStore((s) => s.showToast)
  const formMeta = useAppStore((s) => s.formMeta)
  const resetFormDraft = useAppStore((s) => s.resetFormDraft)
  const finalizeForm = useAppStore((s) => s.finalizeForm)

  const sections = groundingSystemTestConfig.sections

  // Step state
  const currentStepRaw = useAppStore((s) => s.groundingStep ?? 1)
  const setStep = (step) => useAppStore.setState({ groundingStep: step })

  const totalSteps = sections.length
  const currentStep = Math.max(1, Math.min(Number(currentStepRaw) || 1, totalSteps))
  const currentSection = sections[currentStep - 1]
  const sectionId = currentSection?.id

  const completedSections = useMemo(() => {
    return sections
      .filter((s) => isSectionComplete(s.fields, groundingData?.[s.id]))
      .map((s) => s.id)
  }, [groundingData, sections])

  const progress = useMemo(() => {
    let totalFields = 0
    let filledFields = 0
    sections.forEach((s) => {
      const p = getSectionProgress(s.fields, groundingData?.[s.id])
      totalFields += p.total
      filledFields += p.filled
    })
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0
  }, [groundingData, sections])

  const currentSectionProgress = useMemo(() => {
    if (!currentSection) return { total: 0, filled: 0 }
    const data = sectionId === 'medicion'
      ? { ...(groundingData?.medicion || {}), ...(groundingData?.evidencia || {}) }
      : (groundingData?.[sectionId] || {})
    return getSectionProgress(currentSection.fields, data)
  }, [currentSection, sectionId, groundingData])

  // Merged data for rendering: medicion section includes evidencia photos
  const sectionData = useMemo(() => {
    if (sectionId === 'medicion') {
      return { ...(groundingData?.medicion || {}), ...(groundingData?.evidencia || {}) }
    }
    return groundingData?.[sectionId] || {}
  }, [sectionId, groundingData])

  const handleChange = (fieldId, value) => {
    if (!sectionId) return
    // Field may declare a dataSectionId to save to a different bucket (e.g. evidencia photos inside medicion section)
    const field = currentSection?.fields?.find(f => f.id === fieldId)
    const targetSection = field?.dataSectionId || sectionId
    setGroundingField(targetSection, fieldId, value)

    // Auto-calculations for medicion section
    if (sectionId === 'medicion') {
      const next = { ...(groundingData?.medicion || {}), [fieldId]: value }

      const keys = [
        'rPataTorre', 'rCerramiento', 'rPorton',
        'rPararrayos', 'rBarraSPT', 'rEscalerilla1', 'rEscalerilla2',
      ]

      const vals = keys
        .map((k) => Number(next[k] ?? 0))
        .filter((v) => !Number.isNaN(v) && v !== 0)

      const sum = vals.reduce((a, b) => a + b, 0)
      const avg = vals.length ? sum / vals.length : 0

      setGroundingField('medicion', 'sumResistencias', sum.toFixed(2))
      setGroundingField('medicion', 'rg', avg.toFixed(2))
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) setStep(currentStep - 1)
  }

  const handleNext = async () => {
    try {
      const fields = currentSection?.fields ?? []
      const data = sectionData
      const requiredMissing = fields
        .filter((f) => f.required)
        .filter((f) => !isFilled(data[f.id]))
        .map((f) => f.label)

      if (requiredMissing.length) {
        const preview = requiredMissing.slice(0, 5).join(', ')
        const suffix = requiredMissing.length > 5 ? ` (+${requiredMissing.length - 5})` : ''
        showToast(`Campos requeridos: ${preview}${suffix}`, 'error')
        return
      }

      if (currentStep < totalSteps) {
        setStep(currentStep + 1)
      } else {
        try {
          setShowConfirm(true)
          return
        } catch (e) {
          console.error('[Grounding] finalize error:', e)
          showToast('Error al enviar. Intente de nuevo.', 'error')
        }
      }
    } catch (e) {
      console.error('[Grounding] handleNext error:', e)
      showToast('Error al avanzar. Intente de nuevo.', 'error')
    }
  }

  if (!currentSection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }


  if (isFormCompleted(FORM_ID)) return <FormLockedScreen title="Prueba de Puesta a Tierra" />

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <AutosaveIndicator />

      <AppHeader
        title="Prueba de puesta a tierra"
        subtitle={groundingData?.datos?.idSitio || groundingData?.datos?.nombreSitio || 'Nuevo'}
        badge="En progreso"
        progress={progress}
      />

      {/* Step pills */}
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {sections.map((section, idx) => {
            const stepNum = idx + 1
            const isActive = stepNum === currentStep
            const isCompleted = completedSections.includes(section.id)
            const isPast = idx < currentStep - 1

            return (
              <div key={section.id} className="flex items-center">
                {idx > 0 && (
                  <div className={`w-3 h-0.5 flex-shrink-0 ${isPast || isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
                <button
                  onClick={() => setStep(stepNum)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95 ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : isCompleted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {isCompleted && !isActive ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[9px]">
                      {stepNum}
                    </span>
                  )}
                  <span className="max-w-[72px] truncate">{SHORT_LABELS[section.id] || section.title}</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <main className="flex-1 px-4 pb-44 pt-4 overflow-x-hidden overflow-y-auto">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0"><FormMetaBar meta={formMeta?.['grounding-system-test']} formCode="puesta-tierra" formRoute="/intro/grounding-system-test" /></div>
          <button
            className="px-3 py-2 rounded-xl border border-red-200 text-red-600 font-bold text-sm active:scale-95 flex-shrink-0"
            onClick={() => {
              if (confirm('¿Reiniciar formulario? Se borrarán los datos.')) {
                resetFormDraft('puesta-tierra')
                setStep(1)
                showToast('Formulario reiniciado', 'info')
              }
            }}
          >
            Reiniciar
          </button>
        </div>

        {/* Section header */}
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl mb-1">{SECTION_EMOJIS[sectionId] || '⚡'}</div>
              <h2 className="text-xl font-extrabold text-gray-900">{currentSection.title}</h2>
              <p className="text-sm text-gray-500">{currentSection.description}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                {currentStep}/{totalSteps}
              </div>
              <div className="text-[10px] text-gray-500">sección</div>
              <div className="mt-1.5 text-xs font-medium text-gray-400">
                {currentSectionProgress.filled}/{currentSectionProgress.total}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <DynamicForm
            formCode="grounding-system-test"
            fields={currentSection.fields || []}
            data={sectionData}
            onChange={handleChange}
          />
        </div>
      </main>

      <BottomNav
        onPrev={handlePrev}
        onNext={handleNext}
        showPrev={currentStep > 1}
        nextLabel={currentStep === totalSteps ? 'Finalizar' : 'Siguiente'}
      />

      <ConfirmFinalizeModal
        show={showConfirm}
        formName="Prueba de Puesta a Tierra"
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          setShowConfirm(false)
          await finalizeForm('puesta-tierra')
          showToast('¡Formulario enviado!', 'success')
          setTimeout(() => navigate('/'), 3000)
        }}
        loading={loading}
      />
    </div>
  )
}
