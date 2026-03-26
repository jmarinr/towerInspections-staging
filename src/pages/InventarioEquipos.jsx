
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import StepPills from '../components/layout/StepPills'
import FormMetaBar from '../components/layout/FormMetaBar'
import BottomNav from '../components/layout/BottomNav'
import AutosaveIndicator from '../components/ui/AutosaveIndicator'

import { equipmentInventorySteps, getEquipmentStepIndex } from '../data/equipmentInventoryConfig'
import { useAppStore } from '../hooks/useAppStore'

import EquipmentInventorySiteInfoForm from '../components/forms/EquipmentInventorySiteInfoForm'
import TowerInventoryTable from '../components/forms/TowerInventoryTable'
import FloorInventoryClients from '../components/forms/FloorInventoryClients'
import FullscreenDrawingModal from '../components/drawing/FullscreenDrawingModal'
import FullscreenDistributionModal from '../components/equipment/FullscreenDistributionModal'
import Input from '../components/ui/Input'

import templateCroquis from '../assets/equipment/template_croquis_esquematico.png'
import ConfirmFinalizeModal from '../components/ui/ConfirmFinalizeModal'

export default function InventarioEquipos() {
  const navigate = useNavigate()
  const { step } = useParams()

  const { showAutosaveIndicator,
    showToast,
    formMeta,
    equipmentInventoryData,
    setDistribucionTorre,
    setDistribucionFotoTorre,
    setCroquisEsquematico,
    setCroquisNiveles,
    setPlanoPlanta, resetFormDraft, finalizeForm } = useAppStore()

  const currentStepId = useMemo(() => {
    if (step && equipmentInventorySteps.some(s => s.id === step)) return step
    return equipmentInventorySteps[0].id
  }, [step])

  const currentStepIndex = Math.max(0, getEquipmentStepIndex(currentStepId))
  const currentStep = equipmentInventorySteps[currentStepIndex]

  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState([])
  const [openCroquis, setOpenCroquis] = useState(false)
  const [openPlano, setOpenPlano] = useState(false)
  const [openDistribucion, setOpenDistribucion] = useState(false)


  useEffect(() => {
    // Marca como completado el paso anterior al avanzar (simple UX, sin validación dura)
    setCompletedSteps((prev) => {
      const ids = equipmentInventorySteps.slice(0, currentStepIndex).map(s => s.id)
      return Array.from(new Set([...prev, ...ids]))
    })
  }, [currentStepIndex])

  const goToStep = (id) => navigate(`/inventario-equipos/${id}`)
  const goNext = async () => {
    // Validación de requeridos (solo en Datos Generales)
    if (currentStep.type === 'form') {
      const si = equipmentInventoryData?.siteInfo || {}
      const missing = []
      if (!String(si.proveedor || '').trim()) missing.push('Proveedor')
      if (!String(si.tipoVisita || '').trim()) missing.push('Tipo de Visita')
      if (!String(si.idSitio || '').trim()) missing.push('ID Sitio')
      if (!String(si.nombreSitio || '').trim()) missing.push('Nombre Sitio')
      if (!String(si.direccion || '').trim()) missing.push('Dirección')

      if (missing.length) {
        showToast(`Campos requeridos pendientes: ${missing.join(', ')}`, 'error')
        return
      }
    }

    const next = equipmentInventorySteps[currentStepIndex + 1]
    if (next) goToStep(next.id)
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
  const goPrev = () => {
    const prev = equipmentInventorySteps[currentStepIndex - 1]
    if (prev) goToStep(prev.id)
    else navigate('/')
  }

  const renderStepContent = () => {
    switch (currentStep.type) {
      case 'form':
        return <EquipmentInventorySiteInfoForm />
      case 'table-torre':
        return <TowerInventoryTable />
      case 'piso':
        return <FloorInventoryClients />
      
case 'builder':
  return (
    <>
      {/* Vista previa: la edición se hace únicamente en pantalla completa */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="font-extrabold text-gray-900">Distribución de equipos en torre</div>
            <div className="text-xs text-gray-500 mt-0.5">Toca “Editar” para abrir el editor y armar el croquis.</div>
          </div>
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-sm active:scale-[0.99]"
            onClick={() => setOpenDistribucion(true)}
          >
            Editar
          </button>
        </div>

        <div className="p-3 bg-gray-50">
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {equipmentInventoryData?.distribucionTorre?.pngDataUrl ? (
              <img
                src={equipmentInventoryData.distribucionTorre.pngDataUrl}
                alt="Vista previa del croquis"
                className="w-full h-auto block"
              />
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                Aún no hay un croquis guardado. Abre el editor para comenzar.
              </div>
            )}
          </div>
        </div>
      </div>

      <FullscreenDistributionModal
        open={openDistribucion}
        onClose={() => setOpenDistribucion(false)}
        scene={equipmentInventoryData?.distribucionTorre?.scene}
        pngDataUrl={equipmentInventoryData?.distribucionTorre?.pngDataUrl}
        fotoTorreDataUrl={equipmentInventoryData?.distribucionTorre?.fotoTorreDataUrl}
        onSaveScene={(scene, png) => setDistribucionTorre(scene, png)}
        onSaveFoto={(data) => setDistribucionFotoTorre(data)}
      />
    </>
  )
case 'drawing-template':

        return (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="font-extrabold text-gray-900">Niveles (según formato)</div>
              <div className="text-xs text-gray-500 mt-1">Opcional: completa alturas para Nivel 1-3 y Banqueta.</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                <Input label="Nivel 1" placeholder="m" value={equipmentInventoryData?.croquisEsquematico?.niveles?.nivel1 || ''} onChange={(e) => setCroquisNiveles('nivel1', e.target.value)} />
                <Input label="Nivel 2" placeholder="m" value={equipmentInventoryData?.croquisEsquematico?.niveles?.nivel2 || ''} onChange={(e) => setCroquisNiveles('nivel2', e.target.value)} />
                <Input label="Nivel 3" placeholder="m" value={equipmentInventoryData?.croquisEsquematico?.niveles?.nivel3 || ''} onChange={(e) => setCroquisNiveles('nivel3', e.target.value)} />
                <Input label="Banqueta" placeholder="m" value={equipmentInventoryData?.croquisEsquematico?.niveles?.banqueta || ''} onChange={(e) => setCroquisNiveles('banqueta', e.target.value)} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <div className="font-extrabold text-gray-900">Croquis esquemático</div>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setOpenCroquis(true)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-primary text-primary bg-primary/5 active:scale-95"
                >
                  Abrir editor
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Se recomienda editar en pantalla completa. El dibujo se guarda automáticamente.
              </div>
              <div className="mt-3">
                <img
                  src={equipmentInventoryData?.croquisEsquematico?.pngDataUrl || templateCroquis}
                  alt="Croquis esquemático"
                  className="w-full rounded-xl border border-gray-200 bg-white"
                />
              </div>
            </div>

            <FullscreenDrawingModal
              open={openCroquis}
              title="Croquis esquemático"
              backgroundImage={templateCroquis}
              initialDrawing={equipmentInventoryData?.croquisEsquematico?.drawing}
              onChange={(drawing, png) => setCroquisEsquematico(drawing, png)}
              onClose={() => setOpenCroquis(false)}
            />
          </div>
        )
      case 'drawing-blank':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <div className="font-extrabold text-gray-900">Plano de planta y equipos</div>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setOpenPlano(true)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-primary text-primary bg-primary/5 active:scale-95"
                >
                  Abrir editor
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Pantalla blanca para dibujar. Si quieres más espacio, gira el teléfono a horizontal.
              </div>
              <div className="mt-3">
                {equipmentInventoryData?.planoPlanta?.pngDataUrl ? (
                  <img src={equipmentInventoryData.planoPlanta.pngDataUrl} alt="Plano de planta" className="w-full rounded-xl border border-gray-200 bg-white" />
                ) : (
                  <div className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                    Aún no hay dibujo guardado.
                  </div>
                )}
              </div>
            </div>

            <FullscreenDrawingModal
              open={openPlano}
              title="Plano de planta y equipos"
              backgroundImage={null}
              initialDrawing={equipmentInventoryData?.planoPlanta?.drawing}
              onChange={(drawing, png) => setPlanoPlanta(drawing, png)}
              onClose={() => setOpenPlano(false)}
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Inventario de Equipos" subtitle="Formulario 3 · PTI Inspect" />

      <StepPills
        steps={equipmentInventorySteps}
        currentStep={currentStepId}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      <AutosaveIndicator show={showAutosaveIndicator} />

      <div className="px-4 pb-32">
        <div className="flex items-center justify-between gap-2 mb-2">
          <FormMetaBar meta={formMeta?.equipment} />
          <button
            className="px-3 py-2 rounded-xl border border-red-200 text-red-600 font-bold text-sm active:scale-95 flex-shrink-0"
            onClick={() => {
              if (confirm('¿Reiniciar formulario? Se borrarán los datos.')) {
                resetFormDraft('inventario')
                showToast('Formulario reiniciado', 'info')
                navigate('/inventario-equipos')
              }
            }}
          >
            Reiniciar
          </button>
        </div>
        <div className="mb-4">
          <div className="text-lg font-extrabold text-gray-900">{currentStep.icon} {currentStep.title}</div>
          <div className="text-sm text-gray-600 mt-1">{currentStep.description}</div>
        </div>

        {renderStepContent()}
      </div>

      <BottomNav onBack={goPrev} onNext={goNext} nextLabel={currentStepIndex === equipmentInventorySteps.length - 1 ? 'Finalizar' : 'Siguiente'} />

      <ConfirmFinalizeModal
        show={showConfirm}
        formName="Inventario de Equipos"
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          setShowConfirm(false)
          try {
            await finalizeForm('inventario')
            showToast('¡Inventario enviado!', 'success')
            setTimeout(() => navigate('/'), 3000)
          } catch (e) {
            showToast('Error al finalizar', 'error')
          }
        }}
        loading={loading}
      />
    </div>
  )
}
