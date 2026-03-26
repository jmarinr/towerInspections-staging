import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import StepPills from '../components/layout/StepPills'
import FormMetaBar from '../components/layout/FormMetaBar'
import BottomNav from '../components/layout/BottomNav'
import AutosaveIndicator from '../components/ui/AutosaveIndicator'
import SiteInfoForm from '../components/forms/SiteInfoForm'
import InspectionItem from '../components/forms/InspectionItem'
import { inspectionSections, getTotalInspectionItems } from '../data/inspectionItems'
import { useAppStore } from '../hooks/useAppStore'
import FormLockedScreen from '../components/ui/FormLockedScreen'
import ConfirmFinalizeModal from '../components/ui/ConfirmFinalizeModal'

const FORM_ID = 'inspeccion'

export default function InspeccionSitio() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const isFormCompleted = useAppStore((s) => s.isFormCompleted)

  const { step } = useParams()
  const { inspectionData, showToast, formMeta, resetFormDraft, finalizeForm } = useAppStore()
  const checkForceUpdate = useAppStore((s) => s.checkForceUpdateAfterFinalize)

  const currentStepId = step || inspectionSections[0].id
  const currentStepIndex = inspectionSections.findIndex(s => s.id === currentStepId)
  const currentSection = inspectionSections[currentStepIndex]

  const progress = useMemo(() => {
    const total = getTotalInspectionItems()
    const answered = Object.keys(inspectionData.items).filter(k => inspectionData.items[k]?.status).length
    return Math.round((answered / total) * 100)
  }, [inspectionData.items])

  const completedSteps = useMemo(() => {
    return inspectionSections.filter(section => {
      if (section.type === 'form') {
        const { proveedor, idSitio, nombreSitio } = inspectionData.siteInfo
        return proveedor && idSitio && nombreSitio
      }
      return section.items?.every(item => inspectionData.items[item.id]?.status)
    }).map(s => s.id)
  }, [inspectionData])

  const goToStep = (stepId) => navigate(`/inspeccion-sitio/${stepId}`)
  const goToPrev = () => currentStepIndex > 0 && goToStep(inspectionSections[currentStepIndex - 1].id)
  const goToNext = async () => {
    // Validar campos requeridos antes de avanzar/finalizar
    if (currentSection.type === 'form') {
      const missing = []
      const si = inspectionData.siteInfo || {}
      if (!String(si.proveedor || '').trim()) missing.push('Empresa proveedora')
      if (!String(si.idSitio || '').trim()) missing.push('ID del Sitio')
      if (!String(si.nombreSitio || '').trim()) missing.push('Nombre del Sitio')

      if (missing.length) {
        showToast(`Campos requeridos pendientes: ${missing.join(', ')}`, 'error')
        return
      }
    } else if (currentSection.items?.length) {
      const missingItems = currentSection.items.filter(it => !inspectionData.items[it.id]?.status)
      if (missingItems.length) {
        const preview = missingItems.slice(0, 6).map(it => it.label || it.title || it.id)
        const suffix = missingItems.length > 6 ? ` (+${missingItems.length - 6})` : ''
        showToast(`Faltan ítems por completar: ${preview.join(', ')}${suffix}`, 'error')
        return
      }
    }

    if (currentStepIndex < inspectionSections.length - 1) goToStep(inspectionSections[currentStepIndex + 1].id)
    else {
      try {
        setShowConfirm(true)
        return
      } catch (e) {
        showToast('No se pudo enviar. Revisa tu conexión e intenta de nuevo.', 'error')
        return
      }
    }
  }

  const steps = inspectionSections.map(s => ({ id: s.id, title: s.title }))


  if (isFormCompleted(FORM_ID)) return <FormLockedScreen title="Inspección General" />

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <AutosaveIndicator />
      <AppHeader title="Inspección de Sitio" subtitle={inspectionData.siteInfo.idSitio || 'Nuevo'} badge="En progreso" progress={progress} onMenuClick={() => showToast('Menú de opciones')} />
      <StepPills steps={steps} currentStep={currentStepId} completedSteps={completedSteps} onStepClick={goToStep} />
      <main className="flex-1 px-4 pb-44 pt-4 overflow-x-hidden">
        <div className="flex items-center justify-between gap-2">
          <FormMetaBar meta={formMeta?.inspeccion} />
          <button
            className="px-3 py-2 rounded-xl border border-red-200 text-red-600 font-bold text-sm active:scale-95"
            onClick={async () => {
              if (confirm('Esto borrará los datos guardados de este formulario en este dispositivo. ¿Deseas reiniciar?')) {
                resetFormDraft('inspeccion')
                showToast('Formulario reiniciado', 'info')
              }
            }}
          >
            Reiniciar
          </button>
        </div>
        <div className="mb-4">
          <div className="text-3xl mb-2">{currentSection.icon}</div>
          <h2 className="text-xl font-extrabold text-gray-900">{currentSection.title}</h2>
          <p className="text-sm text-gray-500">{currentSection.description}</p>
        </div>
        {currentSection.type === 'form' ? <SiteInfoForm type="inspection" /> : (
          <div>{currentSection.items?.map((item, idx) => <InspectionItem key={item.id} item={item} index={idx} />)}</div>
        )}
      </main>
      <BottomNav onPrev={goToPrev} onNext={goToNext} showPrev={currentStepIndex > 0} nextLabel={currentStepIndex === inspectionSections.length - 1 ? 'Finalizar' : 'Siguiente'} />

      <ConfirmFinalizeModal
        show={showConfirm}
        formName="Inspección de Sitio"
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          setShowConfirm(false)
          await finalizeForm('inspeccion')
          if (!checkForceUpdate()) {
            showToast('¡Inspección enviada!', 'success')
            setTimeout(() => navigate('/'), 3000)
          }
        }}
        loading={loading}
      />
    </div>
  )
}
