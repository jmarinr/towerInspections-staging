import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import StepPills from '../components/layout/StepPills'
import FormMetaBar from '../components/layout/FormMetaBar'
import BottomNav from '../components/layout/BottomNav'
import AutosaveIndicator from '../components/ui/AutosaveIndicator'

import { equipmentInventoryV2Steps, getEquipmentV2StepIndex } from '../data/equipmentInventoryV2Config'
import { useAppStore } from '../hooks/useAppStore'
import FormLockedScreen from '../components/ui/FormLockedScreen'

import EquipmentInventorySiteInfoForm from '../components/forms/EquipmentInventorySiteInfoForm'
import TowerInventoryTableV2 from '../components/forms/TowerInventoryTableV2'
import FloorInventoryClientsV2 from '../components/forms/FloorInventoryClientsV2'
import CarrierSection from '../components/forms/CarrierSection'
import ConfirmFinalizeModal from '../components/ui/ConfirmFinalizeModal'

const FORM_ID = 'equipment-v2'

export default function InventarioEquiposV2() {
  const navigate = useNavigate()
  const isFormCompleted = useAppStore((s) => s.isFormCompleted)

  const { step } = useParams()

  const {
    showAutosaveIndicator,
    showToast,
    formMeta,
    equipmentInventoryV2Data,
    updateEquipmentV2SiteField,
    resetFormDraft,
    finalizeForm,
    checkForceUpdateAfterFinalize: checkForceUpdate,
  } = useAppStore()

  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState([])

  const currentStepId = useMemo(() => {
    if (step && equipmentInventoryV2Steps.some(s => s.id === step)) return step
    return equipmentInventoryV2Steps[0].id
  }, [step])

  const stepIndex = getEquipmentV2StepIndex(currentStepId)
  const currentStep = equipmentInventoryV2Steps[stepIndex] || equipmentInventoryV2Steps[0]
  const totalSteps = equipmentInventoryV2Steps.length

  useEffect(() => {
    setCompletedSteps((prev) => {
      const ids = equipmentInventoryV2Steps.slice(0, stepIndex).map(s => s.id)
      return Array.from(new Set([...prev, ...ids]))
    })
  }, [stepIndex])

  const navigateToStep = (id) => navigate(`/inventario-equipos-v2/${id}`, { replace: true })

  const handlePrev = () => {
    if (stepIndex > 0) navigateToStep(equipmentInventoryV2Steps[stepIndex - 1].id)
  }

  const handleNext = async () => {
    if (stepIndex < totalSteps - 1) {
      navigateToStep(equipmentInventoryV2Steps[stepIndex + 1].id)
    } else {
      try {
        setShowConfirm(true)
        return
      } catch (e) {
        console.error('[InventarioV2] finalize error:', e)
        showToast('Error al enviar. Intente de nuevo.', 'error')
      }
    }
  }

  const meta = formMeta?.['equipment-v2']
  const siteInfo = equipmentInventoryV2Data?.siteInfo || {}

  const renderStepContent = () => {
    switch (currentStep.type) {
      case 'form':
        return <EquipmentInventorySiteInfoForm siteInfo={siteInfo} onChange={updateEquipmentV2SiteField} />
      case 'table-torre-v2':
        return <TowerInventoryTableV2 />
      case 'piso':
        return <FloorInventoryClientsV2 />
      case 'carriers':
        return <CarrierSection />
      default:
        return <div className="text-gray-500 text-center py-8">Sección no implementada</div>
    }
  }


  if (isFormCompleted(FORM_ID)) return <FormLockedScreen title="Inventario de Equipos v2" />

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <AutosaveIndicator />
      <AppHeader
        title="Inventario de Equipos v2"
        subtitle={siteInfo.idSitio || siteInfo.nombreSitio || 'Nuevo'}
        badge="En progreso"
        onBack={() => navigate('/')}
      />
      <StepPills
        steps={equipmentInventoryV2Steps}
        currentStep={currentStepId}
        completedSteps={completedSteps}
        onStepClick={navigateToStep}
      />

      <main className="flex-1 px-4 pb-44 pt-4 overflow-x-hidden">
        {/* Meta bar + reset */}
        <div className="flex items-start justify-between gap-2">
          <FormMetaBar meta={meta} />
          <button
            className="px-3 py-2 rounded-xl border border-red-200 text-red-600 font-bold text-sm active:scale-95 flex-shrink-0"
            onClick={() => {
              if (confirm('Esto borrará los datos guardados de este formulario en este dispositivo. ¿Deseas reiniciar?')) {
                resetFormDraft('inventario-v2')
                showToast('Formulario reiniciado', 'info')
              }
            }}
          >
            Reiniciar
          </button>
        </div>

        {/* Step header */}
        <div className="mb-4">
          <div className="text-3xl mb-1">{currentStep.icon}</div>
          <h2 className="text-xl font-extrabold text-gray-900">{currentStep.title}</h2>
          <p className="text-sm text-gray-500">{currentStep.description}</p>
        </div>

        {renderStepContent()}
      </main>

      <BottomNav
        onPrev={handlePrev}
        onNext={handleNext}
        showPrev={stepIndex > 0}
        nextLabel={stepIndex === totalSteps - 1 ? 'Finalizar' : 'Siguiente'}
      />

      <ConfirmFinalizeModal
        show={showConfirm}
        formName="Inventario de Equipos v2"
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          setShowConfirm(false)
          try {
            await finalizeForm('inventario-v2')
            if (!checkForceUpdate()) {
              showToast('¡Inventario v2 enviado!', 'success')
              setTimeout(() => navigate('/'), 3000)
            }
          } catch (e) {
            showToast('Error al finalizar', 'error')
          }
        }}
        loading={loading}
      />
    </div>
  )
}
