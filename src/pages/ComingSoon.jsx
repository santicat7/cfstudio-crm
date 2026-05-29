export default function ComingSoon({ titulo }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-10 h-10 border border-[#D9D9D9] rounded-xl flex items-center justify-center mb-5">
        <div className="w-3 h-3 bg-[#D9D9D9] rounded-full" />
      </div>
      <h2 className="text-base font-semibold text-[#1A1814] mb-1">{titulo}</h2>
      <p className="text-sm text-[#888]">Próximamente disponible</p>
    </div>
  )
}
