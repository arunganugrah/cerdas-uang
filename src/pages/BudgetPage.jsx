import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { formatRupiah } from '../utils/nlp'
import { Plus, X, Target, Edit3, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function BudgetPage() {
  const { budgets, categories, addBudget, updateBudget, deleteBudget } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [period, setPeriod] = useState('monthly')
  const [form, setForm] = useState({ categoryId: '', amount: '', period: 'monthly', rollover: false })
  const [editBudget, setEditBudget] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const activeBudgets = budgets.filter(b => b.period === period)
  const totalBudgeted = activeBudgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = activeBudgets.reduce((s, b) => s + (b.spent || 0), 0)

  const parentCategories = categories.filter(c => c.type === 'expense' && !c.parentId)

  const handleAdd = async () => {
    if (!form.categoryId || !form.amount) return toast.error('Lengkapi data budget')
    await addBudget({ ...form, amount: Number(form.amount), spent: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() })
    toast.success('Budget berhasil ditambahkan!')
    setShowAdd(false)
    setForm({ categoryId: '', amount: '', period: 'monthly', rollover: false })
  }
  const handleEdit = async () => {
    if (!editForm.amount) return toast.error('Masukkan batas budget')
    await updateBudget(editBudget.id, {
      amount: Number(editForm.amount),
      period: editForm.period,
      rollover: editForm.rollover
    })
    toast.success('Budget berhasil diperbarui!')
    setEditBudget(null)
    setEditForm(null)
  }

  const handleDelete = async (budget) => {
    const cat = categories.find(c => c.id === budget.categoryId)
    if (!confirm(`Hapus budget "${cat?.name || 'ini'}"?`)) return
    await deleteBudget(budget.id)
    toast.success('Budget dihapus')
  }

  const getStatus = (pct) => {
    if (pct >= 100) return { color: 'bg-rose-500', text: 'text-rose-400', label: 'Habis' }
    if (pct >= 80) return { color: 'bg-amber-400', text: 'text-amber-400', label: 'Hampir habis' }
    return { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Aman' }
  }

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      {/* Summary */}
      <div className="card p-5">
        <div className="text-cu-subtext text-sm mb-3">{format(new Date(), 'MMMM yyyy', { locale: idLocale })}</div>
        <div className="flex justify-between mb-3">
          <div>
            <div className="text-cu-muted text-xs">Total Budget</div>
            <div className="text-cu-text font-bold font-mono text-xl">{formatRupiah(totalBudgeted, true)}</div>
          </div>
          <div className="text-right">
            <div className="text-cu-muted text-xs">Terpakai</div>
            <div className="text-rose-400 font-bold font-mono text-xl">{formatRupiah(totalSpent, true)}</div>
          </div>
          <div className="text-right">
            <div className="text-cu-muted text-xs">Sisa</div>
            <div className={`font-bold font-mono text-xl ${totalBudgeted - totalSpent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatRupiah(totalBudgeted - totalSpent, true)}</div>
          </div>
        </div>
        {/* Overall progress */}
        <div className="h-2 bg-cu-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all progress-animated ${totalSpent / totalBudgeted >= 1 ? 'bg-rose-500' : totalSpent / totalBudgeted >= 0.8 ? 'bg-amber-400' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, (totalSpent / totalBudgeted) * 100 || 0)}%` }}
          />
        </div>
        <div className="text-cu-muted text-xs mt-1 text-right">{totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% terpakai</div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-cu-surface border border-cu-border rounded-xl p-1">
        {[{v:'monthly',l:'Bulanan'},{v:'yearly',l:'Tahunan'}].map(({v,l}) => (
          <button key={v} onClick={() => setPeriod(v)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${period===v ? 'bg-emerald-500 text-white shadow' : 'text-cu-muted hover:text-cu-text'}`}>{l}</button>
        ))}
      </div>

      {/* Budget list */}
      <div className="space-y-3">
        {activeBudgets.length === 0 ? (
          <div className="text-center py-12">
            <Target size={40} className="text-cu-muted mx-auto mb-3" />
            <div className="text-cu-text font-medium mb-1">Belum ada budget</div>
            <div className="text-cu-muted text-sm">Buat budget untuk mengontrol pengeluaran</div>
          </div>
        ) : activeBudgets.map(b => {
          const cat = categories.find(c => c.id === b.categoryId)
          const pct = b.amount > 0 ? Math.min(100, Math.round(((b.spent || 0) / b.amount) * 100)) : 0
          const remaining = b.amount - (b.spent || 0)
          const status = getStatus(pct)
          const rolloverAmount = b.rollover && b.previousRemaining ? b.previousRemaining : 0
          const effectiveAmount = b.amount + rolloverAmount

          return (
            <div key={b.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat?.icon || '📂'}</span>
                  <div>
                    <div className="text-cu-text font-medium text-sm">{cat?.name || b.categoryId}</div>
                    {b.rollover && rolloverAmount > 0 && (
                      <div className="text-emerald-400 text-xs">+{formatRupiah(rolloverAmount, true)} sisa bulan lalu</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${pct >= 100 ? 'bg-rose-500/15 text-rose-400' : pct >= 80 ? 'bg-amber-400/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {status.label}
                  </div>
                </div>
              </div>

              <div className="h-2 bg-cu-bg rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full ${status.color} progress-animated`} style={{ width: `${pct}%` }} />
              </div>

              <div className="flex justify-between text-xs text-cu-muted">
                <span><span className={status.text + ' font-medium'}>{formatRupiah(b.spent || 0, true)}</span> terpakai</span>
                <span>{pct}%</span>
                <span>dari <span className="text-cu-text font-medium">{formatRupiah(effectiveAmount, true)}</span></span>
              </div>

              {remaining < 0 && (
                <>
                  <div className="mt-2 text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">
                    ⚠️ Melebihi budget sebesar {formatRupiah(Math.abs(remaining), true)}
                  </div>
                </>
              )}
              {/* Tombol edit dan hapus */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-cu-border">
                <button
                  onClick={() => { setEditBudget(b); setEditForm({ amount: String(b.amount), period: b.period, rollover: b.rollover || false }) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-blue-500 bg-blue-50 hover:bg-blue-100 transition-all">
                  <Edit3 size={13} /> Edit Budget
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-rose-500 bg-rose-50 hover:bg-rose-100 transition-all">
                  <Trash2 size={13} /> Hapus
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add budget button */}
      <button onClick={() => setShowAdd(true)} className="w-full card p-4 flex items-center justify-center gap-2 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all border-dashed">
        <Plus size={18} />
        <span className="font-medium">Tambah Budget</span>
      </button>

      {/* Add budget modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg bg-cu-surface rounded-t-3xl border border-cu-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-cu-text text-lg">Tambah Budget</h3>
              <button onClick={() => setShowAdd(false)}><X size={18} className="text-cu-muted" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Kategori</label>
                <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className="input-field">
                  <option value="">Pilih kategori...</option>
                  {parentCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Batas Budget (Rp)</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="1000000" className="input-field" />
              </div>
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Periode</label>
                <div className="flex gap-2">
                  {[{v:'monthly',l:'Bulanan'},{v:'yearly',l:'Tahunan'}].map(({v,l}) => (
                    <button key={v} onClick={() => setForm(f => ({ ...f, period: v }))} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${form.period===v ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-cu-border text-cu-muted'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, rollover: !f.rollover }))} className={`w-11 h-6 rounded-full transition-all relative ${form.rollover ? 'bg-emerald-500' : 'bg-cu-border'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.rollover ? 'left-6' : 'left-1'}`} />
                </div>
                <div>
                  <div className="text-cu-text text-sm">Rollover sisa budget</div>
                  <div className="text-cu-muted text-xs">Sisa budget dilanjutkan ke bulan berikut</div>
                </div>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleAdd} className="btn-primary flex-1">Simpan Budget</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  {/* Edit Budget Modal */}
{editBudget && editForm && (
  <div className="fixed inset-0 z-50 flex items-end justify-center">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onClick={() => { setEditBudget(null); setEditForm(null) }} />
    <div className="relative w-full max-w-lg bg-cu-surface rounded-t-3xl border border-cu-border p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-cu-text text-lg">Edit Budget</h3>
        <button onClick={() => { setEditBudget(null); setEditForm(null) }}>
          <X size={18} className="text-cu-muted" />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-cu-subtext text-xs mb-1 block">
            Kategori: <strong className="text-cu-text">
              {categories.find(c => c.id === editBudget.categoryId)?.name}
            </strong>
          </label>
        </div>
        <div>
          <label className="text-cu-subtext text-xs mb-1 block">Batas Budget Baru (Rp)</label>
          <input type="number"
            value={editForm.amount}
            onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
            className="input-field"
            autoFocus />
        </div>
        <div>
          <label className="text-cu-subtext text-xs mb-1 block">Periode</label>
          <div className="flex gap-2">
            {[{v:'monthly',l:'Bulanan'},{v:'yearly',l:'Tahunan'}].map(({v,l}) => (
              <button key={v}
                onClick={() => setEditForm(f => ({ ...f, period: v }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${editForm.period===v ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-cu-border text-cu-muted'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setEditForm(f => ({ ...f, rollover: !f.rollover }))}
            className={`w-11 h-6 rounded-full transition-all relative ${editForm.rollover ? 'bg-emerald-500' : 'bg-cu-border'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editForm.rollover ? 'left-6' : 'left-1'}`} />
          </div>
          <span className="text-cu-text text-sm">Rollover sisa budget</span>
        </label>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={() => { setEditBudget(null); setEditForm(null) }}
          className="btn-secondary flex-1">Batal</button>
        <button onClick={handleEdit}
          className="btn-primary flex-1">Simpan Perubahan</button>
      </div>
    </div>
  </div>
)}
}
