import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import FormMetaBar from '../components/layout/FormMetaBar'
import BottomNav from '../components/layout/BottomNav'
import AutosaveIndicator from '../components/ui/AutosaveIndicator'
import DynamicForm from '../components/forms/DynamicForm'
import { useAppStore } from '../hooks/useAppStore'
import FormLockedScreen from '../components/ui/FormLockedScreen'
import { safetyClimbingSections, safetySectionFields } from '../data/safetyClimbingDeviceConfig'
import ConfirmFinalizeModal from '../components/ui/ConfirmFinalizeModal'

function isFilled(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function getSectionProgress(sectionId, sectionData) {
  const fields = safetySectionFields?.[sectionId] ?? []
  if (!fields.length) return { total: 0, filled: 0 }
  const data = sectionData ?? {}
  const filled = fields.filter((f) => isFilled(data[f.id])).length
  return { total: fields.length, filled }
}

function isSectionComplete(sectionId, sectionData) {
  const fields = safetySectionFields?.[sectionId] ?? []
  if (!fields.length) return false
  const data = sectionData ?? {}
  const required = fields.filter((f) => f.required)
  if (required.length > 0) {
    return required.every((f) => isFilled(data[f.id]))
  }
  // If no required fields, complete when at least 1 field filled
  return fields.some((f) => isFilled(data[f.id]))
}

// Map section ids to emojis for visual consistency
const SECTION_EMOJIS = {
  datos: '📋',
  herrajes: '🔗',
  prensacables: '🔧',
  tramos: '🪜',
  platinas: '🛡️',
  certificacion: '📸',
}

// Short labels for step pills
const SHORT_LABELS = {
  datos: 'Datos',
  herrajes: 'Herrajes',
  prensacables: 'Prensacables',
  tramos: 'Tramos',
  platinas: 'Platinas',
  certificacion: 'Certificación',
}

const FORM_ID = 'sistema-ascenso'

export default function SafetyClimbingDevice() {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()
  const isFormCompleted = useAppStore((s) => s.isFormCompleted)


  const safetyData = useAppStore((s) => s.safetyClimbingData || {})
  const setSafetyField = useAppStore((s) => s.setSafetyField)
  const resetFormDraft = useAppStore((s) => s.resetFormDraft)
  const finalizeForm = useAppStore((s) => s.finalizeForm)
  const showToast = useAppStore((s) => s.showToast)
  const formMeta = useAppStore((s) => s.formMeta)

  // Step state (persisted in zustand)
  const currentStepRaw = useAppStore((s) => s.safetyClimbingStep ?? 1)
  const setStep = (step) => useAppStore.setState({ safetyClimbingStep: step })

  const totalSteps = safetyClimbingSections.length
  const currentStep = Math.max(1, Math.min(Number(currentStepRaw) || 1, totalSteps))
  const currentSection = safetyClimbingSections[currentStep - 1]
  const sectionId = currentSection?.id

  const completedSections = useMemo(() => {
    return safetyClimbingSections
      .filter((s) => isSectionComplete(s.id, safetyData?.[s.id]))
      .map((s) => s.id)
  }, [safetyData])

  const progress = useMemo(() => {
    let totalFields = 0
    let filledFields = 0
    safetyClimbingSections.forEach((s) => {
      const p = getSectionProgress(s.id, safetyData?.[s.id])
      totalFields += p.total
      filledFields += p.filled
    })
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0
  }, [safetyData])

  const currentSectionProgress = useMemo(() => {
    if (!sectionId) return { total: 0, filled: 0 }
    return getSectionProgress(sectionId, safetyData?.[sectionId])
  }, [sectionId, safetyData])

  const handleFieldChange = (fieldId, value) => {
    if (!sectionId) return
    setSafetyField(sectionId, fieldId, value)
  }

  const handlePrev = () => {
    if (currentStep > 1) setStep(currentStep - 1)
  }

  const handleNext = async () => {
    try {
      // Validate required fields for current section
      const fields = safetySectionFields?.[sectionId] ?? []
      const data = safetyData?.[sectionId] ?? {}
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
        await handleFinalize()
      }
    } catch (e) {
      console.error('[SafetyClimbing] handleNext error:', e)
      showToast('Error al avanzar. Intente de nuevo.', 'error')
    }
  }

  const handleFinalize = async () => {
    const incomplete = safetyClimbingSections.filter((s) => {
      const fields = safetySectionFields?.[s.id] ?? []
      const required = fields.filter((f) => f.required)
      const data = safetyData?.[s.id] ?? {}
      return required.some((f) => !isFilled(data[f.id]))
    })

    if (incomplete.length) {
      showToast(
        `Pendientes: ${incomplete.map((s) => s.title).join(', ')}`,
        'error'
      )
      return
    }

    setShowConfirm(true)
    return
  }

  if (!currentSection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }


  if (isFormCompleted(FORM_ID)) return <FormLockedScreen title="10 Safety Climbing Device" />

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <AutosaveIndicator />

      <AppHeader
        title="10 Safety Climbing Device"
        subtitle={safetyData?.datos?.idSitio || safetyData?.datos?.nombreSitio || 'Nuevo'}
        badge="En progreso"
        progress={progress}
      />

      {/* Step pills — matches MantenimientoPreventivo StepIndicator style */}
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {safetyClimbingSections.map((section, idx) => {
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
        {/* Meta + Reset row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0"><FormMetaBar meta={formMeta?.['sistema-ascenso']} formCode="sistema-ascenso" formRoute="/intro/sistema-ascenso" /></div>
          <button
            className="px-3 py-2 rounded-xl border border-red-200 text-red-600 font-bold text-sm active:scale-95"
            onClick={() => {
              if (confirm('¿Reiniciar formulario? Se borrarán los datos.')) {
                resetFormDraft('safety-system')
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
              <div className="text-3xl mb-1">{SECTION_EMOJIS[sectionId] || '🔧'}</div>
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
            formCode="safety-system"
            fields={safetySectionFields?.[sectionId] ?? []}
            data={safetyData?.[sectionId] ?? {}}
            onChange={handleFieldChange}
          />
        </div>
      </main>

      <BottomNav
        onPrev={handlePrev}
        onNext={handleNext}
        showPrev={currentStep > 1}
        nextLabel={currentStep === totalSteps ? 'Enviar' : 'Siguiente'}
      />

      <ConfirmFinalizeModal
        show={showConfirm}
        formName="10 Safety Climbing Device"
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          setShowConfirm(false)
          await finalizeForm('safety-system')
    showToast('¡Formulario enviado!', 'success')
    setTimeout(() => navigate('/'), 3000)
        }}
        loading={loading}
      />
    </div>
  )
}
