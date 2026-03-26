import { maintenanceFormConfig } from '../../data/maintenanceFormConfig'

export default function StepIndicator({ currentStep = 1, completedSteps = [], onStepChange }) {
  const { steps } = maintenanceFormConfig
  
  // Encontrar categoría actual
  const currentStepData = steps.find(s => s.id === currentStep)
  const currentCategory = currentStepData?.category || 'info'
  
  // Obtener steps de la categoría actual
  const categorySteps = steps.filter(s => s.category === currentCategory)

  if (categorySteps.length === 0) {
    return null
  }

  return (
    <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
      <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
        {categorySteps.map((step, idx) => {
          const isActive = step.id === currentStep
          const isCompleted = completedSteps.includes(step.id)
          const isPast = categorySteps.findIndex(s => s.id === currentStep) > idx
          
          return (
            <div key={step.id} className="flex items-center">
              {idx > 0 && (
                <div className={`w-4 h-0.5 ${isPast || isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
              <button
                onClick={() => onStepChange(step.id)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  isActive
                    ? 'bg-primary text-white'
                    : isCompleted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                {isCompleted && !isActive ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[9px]">
                    {step.id}
                  </span>
                )}
                <span className="hidden sm:inline max-w-[80px] truncate">{step.title.replace('Inspección - ', '')}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
