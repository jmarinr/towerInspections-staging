import { Check } from 'lucide-react'

export default function StepPills({ steps, currentStep, completedSteps = [], onStepClick, showIndex = true }) {
  return (
    <div className="flex gap-2 px-4 pb-4 bg-primary overflow-x-auto hide-scrollbar">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep
        const isCompleted = completedSteps.includes(step.id)
        return (
          <button key={step.id} onClick={() => onStepClick(step.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${isActive ? 'bg-white text-primary' : isCompleted ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/70'}`}>
            {showIndex && (
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${isActive ? 'bg-primary text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-white/20'}`}>
                {isCompleted ? <Check size={12} strokeWidth={3} /> : index + 1}
              </span>
            )}
            {!showIndex && isCompleted && (
              <span className="w-4 h-4 flex items-center justify-center">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
            {step.title}
          </button>
        )
      })}
    </div>
  )
}
