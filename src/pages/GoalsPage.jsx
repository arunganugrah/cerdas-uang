import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { formatRupiah, formatDate } from '../utils/nlp'
import { Plus, X, Target, Trophy, Clock, TrendingUp } from 'lucide-react'
import { differenceInDays, addDays, format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'

const GOAL_ICONS = ['🎯','🏠','🚗','✈️','💻','📱','🎓','💍','👶','🏖️','🏋️','💰','🎸','📷','⛵','🌍']
const GOAL_COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#ec4899','#14b8a6']

export default function GoalsPage() {
  const { goals, addGoal, depositToGoal } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [depositGoal, setDepositGoal] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositNote, setDepositNote] = useState('')
  const [form, setForm] = useState({ name: '', target: '', deadline: '', icon: '🎯', color: '#10b981', note: '' })

  const active = goals.filter(g => !g.isCompleted)
  const completed = goals.filter(g => g.isCompleted)

  const handleAdd = async () => {
    if (!form.name || !form.target) return toast.error('Lengkapi nama dan target')
    await addGoal({ ...form, target: Number(form.target), saved: 0, isCompleted: false, createdAt: Date.now() })
    toast.success('Goal berhasil ditambahkan! 🎯')
    setShowAdd(false)
    setForm({ name: '', target: '', deadline: '', icon: '🎯', color: '#10b981', note: '' })
  }

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount))) return toast.error('Masukkan jumlah yang valid')
    const amount = Number(depositAmount)
    await depositToGoal(depositGoal.id, amount, depositNote)

    const goal = goals.find(g => g.id === depositGoal.id)
    const newSaved = (goal?.saved || 0) + amount
    if (newSaved >= goal?.target) {
      toast.success('🏆 Selamat! Goal tercapai!')
    } else {
      toast.success(`+${formatRupiah(amount, true)} ditambahkan ke goal!`)
    }
    setDepositGoal(null)
    setDepositAmount('')
    setDepositNote('')
  }

  const estimateCompletion = (goal) => {
    if (!goal.target || goal.saved >= goal.target) return null
    const remaining = goal.target - (goal.saved || 0)
    const daysSinceStart = Math.max(1, differenceInDays(new Date(), new Date(goal.createdAt || Date.now())))
    const dailyRate = (goal.saved || 0) / daysSinceStart
    if (dailyRate <= 0) return null
    const daysLeft = Math.ceil(remaining / dailyRate)
    const estimatedDate = addDays(new Date(), daysLeft)
    return { days: daysLeft, date: estimatedDate }
  }

  const GoalCard = ({ goal }) => {
    const pct = goal.target > 0 ? Math.min(100, Math.round(((goal.saved || 0) / goal.target) * 100)) : 0
    const remaining = goal.target - (goal.saved || 0)
    const est = estimateCompletion(goal)
    const isOverdue = goal.deadline && new Date(goal.deadline) < new Date() && !goal.isCompleted
    const daysToDeadline = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null

    return (
      <div className={`card p-5 transition-all ${goal.isCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : isOverdue ? 'border-rose-500/30' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: (goal.color || '#10b981') + '20' }}>
              {goal.icon || '🎯'}
            </div>
            <div>
              <div className="text-cu-text font-semibold">{goal.name}</div>
              {goal.deadline && (
                <div className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-rose-400' : daysToDeadline < 30 ? 'text-amber-400' : 'text-cu-muted'}`}>
                  <Clock size={11} />
                  {isOverdue ? `Terlambat ${Math.abs(daysToDeadline)} hari` : `${daysToDeadline} hari lagi · ${format(new Date(goal.deadline), 'd MMM yyyy', { locale: idLocale })}`}
                </div>
              )}
            </div>
          </div>
          {goal.isCompleted && <Trophy size={20} className="text-yellow-400" />}
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-mono font-semibold" style={{ color: goal.color || '#10b981' }}>{formatRupiah(goal.saved || 0, true)}</span>
            <span className="text-cu-muted font-mono">{formatRupiah(goal.target, true)}</span>
          </div>
          <div className="h-3 bg-cu-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full progress-animated transition-all"
              style={{ width: `${pct}%`, backgroundColor: goal.color || '#10b981' }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-cu-muted">
            <span>{pct}% tercapai</span>
            <span>Sisa {formatRupiah(remaining, true)}</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="flex gap-3 mb-4">
          {[25, 50, 75, 100].map(milestone => (
            <div key={milestone} className="flex-1 text-center">
              <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-xs font-bold mb-1 transition-all ${pct >= milestone ? '' : 'bg-cu-bg text-cu-muted'}`}
                style={pct >= milestone ? { backgroundColor: (goal.color || '#10b981') + '30', color: goal.color || '#10b981' } : {}}>
                {pct >= milestone ? '✓' : milestone === 100 ? '🏆' : ''}
              </div>
              <div className={`text-[9px] ${pct >= milestone ? 'text-emerald-400' : 'text-cu-muted'}`}>{milestone}%</div>
            </div>
          ))}
        </div>

        {/* Estimation */}
        {est && !goal.isCompleted && (
          <div className="bg-cu-bg rounded-xl p-3 mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-400 flex-shrink-0" />
            <span className="text-cu-subtext text-xs">
              Estimasi tercapai: <strong className="text-cu-text">{format(est.date, 'd MMM yyyy', { locale: idLocale })}</strong> ({est.days} hari lagi)
            </span>
          </div>
        )}

        {/* Notes */}
        {goal.note && <p className="text-cu-muted text-xs mb-3 italic">{goal.note}</p>}

        {/* Action */}
        {!goal.isCompleted && (
          <button
            onClick={() => setDepositGoal(goal)}
            className="w-full btn-primary py-2.5 text-sm"
            style={{ backgroundColor: goal.color || undefined }}
          >
            + Tambah Tabungan
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      {/* Summary */}
      <div className="card p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-cu-text">{active.length}</div>
            <div className="text-cu-muted text-xs mt-0.5">Goal Aktif</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{completed.length}</div>
            <div className="text-cu-muted text-xs mt-0.5">Tercapai</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400 font-mono text-lg">
              {formatRupiah(goals.reduce((s, g) => s + (g.saved || 0), 0), true)}
            </div>
            <div className="text-cu-muted text-xs mt-0.5">Total Tersimpan</div>
          </div>
        </div>
      </div>

      {/* Active goals */}
      {active.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🎯</div>
          <div className="text-cu-text font-medium mb-1">Belum ada goal</div>
          <div className="text-cu-muted text-sm">Buat tujuan tabungan pertama kamu!</div>
        </div>
      ) : (
        <div className="space-y-4">
          {active.map(g => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}

      {/* Add goal button */}
      <button onClick={() => setShowAdd(true)} className="w-full card p-4 flex items-center justify-center gap-2 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all border-dashed">
        <Plus size={18} />
        <span className="font-medium">Buat Goal Baru</span>
      </button>

      {/* Completed goals */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-cu-subtext text-sm font-medium mb-3 flex items-center gap-2"><Trophy size={14} className="text-yellow-400" /> Goal Tercapai</h3>
          <div className="space-y-3">
            {completed.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {/* Deposit modal */}
      {depositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDepositGoal(null)} />
          <div className="relative card p-6 w-full max-w-sm animate-scale-in">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">{depositGoal.icon}</div>
              <h3 className="font-semibold text-cu-text">{depositGoal.name}</h3>
              <div className="text-cu-muted text-sm">{formatRupiah(depositGoal.saved || 0, true)} / {formatRupiah(depositGoal.target, true)}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Jumlah Tabungan (Rp)</label>
                <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0" className="input-field" autoFocus />
              </div>
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Catatan (opsional)</label>
                <input value={depositNote} onChange={e => setDepositNote(e.target.value)} placeholder="Dari gaji bulan ini..." className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDepositGoal(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleDeposit} className="btn-primary flex-1">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Add goal modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg bg-cu-surface rounded-t-3xl border border-cu-border p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-cu-text text-lg">Buat Goal Baru</h3>
              <button onClick={() => setShowAdd(false)}><X size={18} className="text-cu-muted" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-cu-subtext text-xs mb-2 block">Ikon</label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_ICONS.map(ic => (
                    <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} className={`w-10 h-10 rounded-xl text-xl transition-all ${form.icon===ic ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-cu-bg hover:bg-cu-border'}`}>{ic}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Nama Goal *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Beli Laptop Baru" className="input-field" />
              </div>
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Target (Rp) *</label>
                <input type="number" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="10000000" className="input-field" />
              </div>
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Deadline (opsional)</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-cu-subtext text-xs mb-2 block">Warna</label>
                <div className="flex gap-2">
                  {GOAL_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-8 h-8 rounded-full transition-all ${form.color===c ? 'ring-2 ring-offset-2 ring-offset-cu-surface ring-white scale-110' : ''}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-cu-subtext text-xs mb-1 block">Catatan</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Kenapa goal ini penting?" className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleAdd} className="btn-primary flex-1">Buat Goal 🎯</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
