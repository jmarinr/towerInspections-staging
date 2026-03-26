export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-primary z-[9999] flex flex-col items-center justify-center">
      <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white mb-5 animate-pulse">
        PTI
      </div>
      <div className="text-white text-lg font-semibold mb-2">PTI Inspect</div>
      <div className="text-white/60 text-sm">Sistema de Inspección v2.5.89</div>
      <div className="mt-10 w-8 h-8 border-3 border-white/20 border-t-accent rounded-full animate-spin" />
    </div>
  )
}
