import { X } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { formatRupiah } from '../../utils/nlp'

const ACCOUNT_TYPE_LABEL = {
  cash: 'Kas', bank: 'Bank', ewallet: 'E-Wallet',
  credit: 'Kartu Kredit', investment: 'Investasi'
}

export default function AccountPicker({ selected, exclude, onSelect, onClose }) {
  const { accounts } = useStore()
  const visible = accounts.filter(a => !a.isArchived && a.id !== exclude)

  const grouped = visible.reduce((g, a) => {
    const t = ACCOUNT_TYPE_LABEL[a.type] || 'Lainnya'
    if (!g[t]) g[t] = []
    g[t].push(a)
    return g
  }, {})

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-cu-surface rounded-t-3xl border border-cu-border max-h-[60vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-cu-border">
          <h3 className="font-semibold text-cu-text">Pilih Akun</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-4">
          {Object.entries(grouped).map(([type, accs]) => (
            <div key={type}>
              <div className="text-cu-muted text-xs font-medium mb-2 px-1">{type}</div>
              <div className="space-y-1">
                {accs.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => onSelect(acc.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-cu-bg ${selected === acc.id ? 'bg-emerald-500/10 border border-emerald-500/30' : 'border border-transparent'}`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: acc.color + '20' }}>
                      {acc.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-cu-text text-sm font-medium">{acc.name}</div>
                      <div className={`text-xs font-mono ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatRupiah(acc.balance || 0, true)}
                      </div>
                    </div>
                    {selected === acc.id && <span className="text-emerald-400 text-lg">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
