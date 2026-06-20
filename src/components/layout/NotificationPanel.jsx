import { X, Target, Award, Bell } from 'lucide-react'
import { formatRupiah } from '../../utils/nlp'
import { useNavigate } from 'react-router-dom'

export default function NotificationPanel({ budgetAlerts, goalNear, categories, goals, onClose }) {
  const navigate = useNavigate()
  const total = budgetAlerts.length + goalNear.length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-cu-surface rounded-t-3xl border border-cu-border max-h-[75vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-cu-border">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-cu-text" />
            <h3 className="font-semibold text-cu-text">Notifikasi</h3>
            {total > 0 && <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">{total}</span>}
          </div>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {budgetAlerts.map(b => {
            const pct = Math.round((b.spent / b.amount) * 100)
            const cat = categories.find(c => c.id === b.categoryId)
            return (
              <div key={b.id} onClick={() => { navigate('/budget'); onClose() }} className={`card p-4 cursor-pointer hover:border-amber-500/30 transition-all border-l-4 ${pct >= 100 ? 'border-l-rose-500' : 'border-l-amber-400'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Target size={16} className={pct >= 100 ? 'text-rose-400' : 'text-amber-400'} />
                  <span className="text-cu-text text-sm font-medium">
                    {pct >= 100 ? '🔴 Budget habis!' : '⚠️ Budget hampir habis'}
                  </span>
                  <span className={`ml-auto text-xs font-bold ${pct >= 100 ? 'text-rose-400' : 'text-amber-400'}`}>{pct}%</span>
                </div>
                <p className="text-cu-subtext text-sm">
                  Kategori <strong className="text-cu-text">{cat?.icon} {cat?.name}</strong> sudah terpakai {formatRupiah(b.spent, true)} dari budget {formatRupiah(b.amount, true)}.
                </p>
              </div>
            )
          })}
          {goalNear.map(g => {
            const pct = Math.round((g.saved / g.target) * 100)
            return (
              <div key={g.id} onClick={() => { navigate('/goals'); onClose() }} className="card p-4 cursor-pointer hover:border-emerald-500/30 transition-all border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-3 mb-2">
                  <Award size={16} className="text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-medium">🎉 Goal hampir tercapai!</span>
                  <span className="ml-auto text-xs font-bold text-emerald-400">{pct}%</span>
                </div>
                <p className="text-cu-subtext text-sm">
                  <strong className="text-cu-text">{g.icon} {g.name}</strong> sudah {formatRupiah(g.saved, true)} dari target {formatRupiah(g.target, true)}.
                </p>
              </div>
            )
          })}
          {total === 0 && (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-cu-text font-medium">Semua aman!</div>
              <div className="text-cu-muted text-sm mt-1">Tidak ada notifikasi penting saat ini.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
