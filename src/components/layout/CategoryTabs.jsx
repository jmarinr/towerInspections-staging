import { maintenanceFormConfig } from '../../data/maintenanceFormConfig'

export default function CategoryTabs({ currentStep = 1, onCategoryChange, completedSteps = [] }) {
  const { categories, steps } = maintenanceFormConfig
  
  // Encontrar categoría actual basada en el step
  const currentStepData = steps.find(s => s.id === currentStep)
  const currentCategory = currentStepData?.category || 'info'
  
  // Calcular progreso por categoría
  const getCategoryProgress = (categoryId) => {
    const categorySteps = steps.filter(s => s.category === categoryId)
    const completed = categorySteps.filter(s => completedSteps.includes(s.id)).length
    return { completed, total: categorySteps.length }
  }

  return (
    <div className="flex gap-1 px-3 py-2 bg-primary/95 overflow-x-auto hide-scrollbar">
      {categories.map((cat) => {
        const isActive = currentCategory === cat.id
        const progress = getCategoryProgress(cat.id)
        const isComplete = progress.completed === progress.total && progress.total > 0
        
        return (
          <button
            key={cat.id}
            onClick={() => {
              // Ir al primer step de la categoría
              const firstStep = steps.find(s => s.category === cat.id)
              if (firstStep) onCategoryChange(firstStep.id)
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs whitespace-nowrap transition-all active:scale-95 ${
              isActive
                ? 'bg-white text-primary'
                : isComplete
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-white/10 text-white/70'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
            {isComplete && <span className="text-green-400">✓</span>}
            {!isComplete && progress.completed > 0 && (
              <span className="text-[10px] opacity-70">
                {progress.completed}/{progress.total}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
