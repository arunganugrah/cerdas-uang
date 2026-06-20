import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { formatRupiah } from '../utils/nlp'
import { Plus, Archive, RefreshCw, ChevronRight, X, CreditCard, Wallet, Smartphone, TrendingUp, Banknote } from 'lucide-react'
import toast from 'react-hot-toast'

const ACCOUNT_TYPES = [
  { key: 'cash', label: 'Kas', icon: Wallet, color: '#f59e0b' },
  { key: 'bank', label: 'Bank', icon: Banknote, color: '#3b82f6' },
  { key: 'ewallet', label: 'E-Wallet', icon: Smartphone, color: '#8b5cf6' },
  { key: 'credit', label: 'Kartu Kredit', icon: CreditCard, color: '#ef4444' },
  { key: 'investment', label: 'Investasi', icon: TrendingUp, color: '#10b981' },
]

const ICONS = ['👛','🏦','💚','💜','💰','💳','🏧','💎','🪙','💵','🏪','📱']
const COLORS = ['#f59e0b','#3b82f6','#8b5cf6','#ef4444','#10b981','#f97316','#ec4899','#14b8a6','#64748b']

export default function AccountsPage() {
  const { accounts, addAccount, archiveAccount, updateAccountBalance } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [reconcileAcc, setReconcileAcc] = useState(null)
  const [reconcileBalance, setReconcileBalance] = useState('')
  const [form, setForm] = useState({ name: '', type: 'bank', icon: '🏦', color: '#3b82f6', balance: '', currency: 'IDR', bankName: '', creditLimit: '', dueDate: '' })

  const active = accounts.filter(a => !a.isArchived)
  const archived = accounts.filter(a => a.isArchived)
  const totalBalance = active.reduce((s, a) => s + (a.balance || 0), 0)

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error('Nama akun wajib diisi')
    await addAccount({ ...form, balance: Number(form.balance) || 0, order: accounts.length, isArchived: false, synced: false })
    toast.success('Akun berhasil ditambahkan!')
    setShowAdd(false)
    setForm({ name: '', type: 'bank', icon: '🏦', color: '#3b82f6', balance: '', currency: 'IDR', bankName: '', creditLimit: '', dueDate: '' })
  }

  const handleReconcile = async () => {
    if (!reconcileAcc || reconcileBalance === '') return
    const delta = Number(reconcileBalance) - (reconcileAcc.balance || 0)
    await updateAccountBalance(reconcileAcc.id, delta)
    toast.success(`Saldo ${reconcileAcc.name} direkonsiliasi ke ${formatRupiah(Number(reconcileBalance))}`)
    setReconcileAcc(null)
    setReconcileBalance('')
  }

  const typeGroups = ACCOUNT_TYPES.map(t => ({
    ...t,
    accounts: active.filter(a => a.type === t.key)
  })).filter(t => t.accounts.length > 0)

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      {/* Net worth header */}
      <div className="card p-5 bg-gradient-to-br from-blue-900/30 to-cu-surface border-blue-800/30">
        <div className="text-cu-subtext text-sm mb-1">Total Kekayaan Bersih</div>
        <div className={`text-3xl font-bold font-mono ${totalBalance >= 0 ? 'text-cu-text' : 'text-rose-400'}`}>{formatRupiah(totalBalance)}</div>
        <div className="text-cu-muted text-xs mt-1">{active.length} akun aktif</div>
      </div>

      {/* Account groups */}
      {typeGroups.map(({ key, label, icon: Icon, color, accounts: accs }) => (
        <div key={key}>
          <div className="flex items-center gap-2 mb-2">
            <Icon size={14} style={{ color }} />
            <span className="text-cu-subtext text-xs font-medium">{label}</span>
            <span className="text-cu-muted text-xs">({accs.length})</span>
          </div>
          <div className="space-y-2">
            {accs.map(acc => (
              <div key={acc.id} className="card p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: acc.color + '20' }}>
                  {acc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-cu-text font-semibold">{acc.name}</div>
                  {acc.bankName && <div className="text-cu-muted text-xs">{acc.bankName}</div>}
                  {acc.type === 'credit' && acc.dueDate && (
                    <div className="text-amber-400 text-xs">Jatuh tempo tgl {acc.dueDate}</div>
                  )}
                  {acc.creditLimit && (
                    <div className="text-cu-muted text-xs">Limit: {formatRupiah(acc.creditLimit, true)}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-bold font-mono text-lg ${(acc.balance || 0) >= 0 ? 'text-cu-text' : 'text-rose-400'}`}>
                    {formatRupiah(acc.balance || 0, true)}
                  </div>
                  <div className="flex gap-2 mt-1 justify-end">
                    <button onClick={() => { setReconcileAcc(acc); setReconcileBalance(String(acc.balance || 0)) }} className="text-cu-muted hover:text-emerald-400 transition-all" title="Rekonsiliasi">
                      <RefreshCw size={14} />
                    </button>
                    <button onClick={() => archiveAccount(acc.id)} className="text-cu-muted hover:text-amber-400 transition-all" title="Arsip">
                      <Archive size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add account button */}
      <button onClick={() => setShowAdd(true)} className="w-full card p-4 flex items-center justify-center gap-2 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all border-dashed">
        <Plus size={18} />
        <span className="font-medium">Tambah Akun Baru</span>
      </button>

      {/* Archived accounts */}
      {archived.length > 0 && (
        <div>
          <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 text-cu-muted text-sm">
            <Archive size={14} />
            Akun Diarsipkan ({archived.length})
            <ChevronRight size={14} className={`transition-transform ${showArchived ? 'rotate-90' : ''}`} />
          </button>
          {showArchived && (
            <div className="mt-2 space-y-2 opacity-60">
              {archived.map(acc => (
                <div key={acc.id} className="card p-3 flex items-center gap-3">
                  <span className="text-xl">{acc.icon}</span>
                  <span className="text-cu-text text-sm flex-1">{acc.name}</span>
                  <span className="text-cu-muted text-sm font-mono">{formatRupiah(acc.balance || 0, true)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reconcile Modal */}
      {reconcileAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setReconcileAcc(null)} />
          <div className="relative card p-6 w-full max-w-sm animate-scale-in">
            <h3 className="font-semibold text-cu-text mb-1">Rekonsiliasi Saldo</h3>
            <p className="text-cu-muted text-sm mb-4">{reconcileAcc.name} · Saldo saat ini: <span className="text-cu-text font-mono">{formatRupiah(reconcileAcc.balance || 0)}</span></p>
            <input
              type="number"
              value={reconcileBalance}
              onChange={e => setReconcileBalance(e.target.value)}
              placeholder="Masukkan saldo aktual"
              className="input-field mb-4"
              autoFocus
            />
            {reconcileBalance !== '' && Number(reconcileBalance) !== (reconcileAcc.balance || 0) && (
              <div className={`text-sm mb-4 p-3 rounded-xl ${Number(reconcileBalance) > (reconcileAcc.balance || 0) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                Penyesuaian: {Number(reconcileBalance) > (reconcileAcc.balance || 0) ? '+' : ''}{formatRupiah(Number(reconcileBalance) - (reconcileAcc.balance || 0))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setReconcileAcc(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleReconcile} className="btn-primary flex-1">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg bg-cu-surface rounded-t-3xl border border-cu-border p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-cu-text text-lg">Tambah Akun</h3>
              <button onClick={() => setShowAdd(false)} className="btn-ghost p-1"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-cu-subtext text-xs mb-2 block">Tipe Akun</label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map(t => (
                    <button key={t.key} onClick={() => setForm(f => ({ ...f, type: t.key }))} className={`p-3 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1 ${form.type === t.key ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-cu-border text-cu-muted hover:border-cu-muted'}`}>
                      <t.icon size={16} style={{ color: t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Nama Akun *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: BCA Utama" className="input-field" />
              </div>

              {/* Icon picker */}
              <div>
                <label className="text-cu-subtext text-xs mb-2 block">Ikon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} className={`w-10 h-10 rounded-xl text-xl transition-all ${form.icon === ic ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-cu-bg hover:bg-cu-border'}`}>{ic}</button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-cu-subtext text-xs mb-2 block">Warna</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-cu-surface ring-white scale-110' : ''}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              {/* Balance */}
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Saldo Awal (Rp)</label>
                <input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="0" className="input-field" />
              </div>

              {/* Bank name */}
              {(form.type === 'bank' || form.type === 'credit') && (
                <div>
                  <label className="text-cu-subtext text-xs mb-1 block">Nama Bank</label>
                  <input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="BCA, Mandiri, BNI..." className="input-field" />
                </div>
              )}

              {/* Credit card specific */}
              {form.type === 'credit' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-cu-subtext text-xs mb-1 block">Limit Kartu</label>
                    <input type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} placeholder="10000000" className="input-field" />
                  </div>
                  <div>
                    <label className="text-cu-subtext text-xs mb-1 block">Tanggal Jatuh Tempo</label>
                    <input type="number" min="1" max="31" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} placeholder="15" className="input-field" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleAdd} className="btn-primary flex-1">Simpan Akun</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
