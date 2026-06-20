import { useState, useMemo } from 'react'
import { useStore } from '../stores/useStore'
import { formatRupiah, formatDate, relativeDate } from '../utils/nlp'
import { Search, Filter, List, Calendar, Grid, ChevronDown, X, Trash2, Edit3 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import TransactionFormModal from '../components/transactions/TransactionFormModal'
import toast from 'react-hot-toast'

const VIEWS = [
  { key: 'list', icon: List, label: 'Daftar' },
  { key: 'calendar', icon: Calendar, label: 'Kalender' },
  { key: 'gallery', icon: Grid, label: 'Galeri' },
]

export default function TransactionsPage() {
  const { transactions, categories, accounts, removeTransaction } = useStore()
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [filterAcc, setFilterAcc] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [showFilter, setShowFilter] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calMonth, setCalMonth] = useState(new Date())
  const [editTxn, setEditTxn] = useState(null)

  const filtered = useMemo(() => {
    let list = [...transactions]
    if (search) list = list.filter(t =>
      (t.note || '').toLowerCase().includes(search.toLowerCase()) ||
      categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(search.toLowerCase())
    )
    if (filterType !== 'all') list = list.filter(t => t.type === filterType)
    if (filterCat !== 'all') list = list.filter(t => t.categoryId === filterCat)
    if (filterAcc !== 'all') list = list.filter(t => t.accountId === filterAcc)
    if (sortBy === 'date') list.sort((a, b) => new Date(b.date) - new Date(a.date))
    else if (sortBy === 'amount-desc') list.sort((a, b) => b.amount - a.amount)
    else if (sortBy === 'amount-asc') list.sort((a, b) => a.amount - b.amount)
    return list
  }, [transactions, search, filterType, filterCat, filterAcc, sortBy])

  // Group by date for list view
  const grouped = useMemo(() => {
    const g = {}
    filtered.forEach(t => {
      const key = format(new Date(t.date), 'yyyy-MM-dd')
      if (!g[key]) g[key] = []
      g[key].push(t)
    })
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  // Calendar data
  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) })
  const txnByDay = (day) => transactions.filter(t => isSameDay(new Date(t.date), day))
  const dayTotals = (day) => {
    const txns = txnByDay(day)
    return {
      exp: txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      inc: txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      count: txns.length
    }
  }

  const handleDelete = async (txn) => {
    if (!confirm(`Hapus transaksi "${txn.note || 'ini'}"?`)) return
    await removeTransaction(txn.id)
    toast.success('Transaksi dihapus')
  }

  const TxnCard = ({ txn, compact = false }) => {
    const cat = categories.find(c => c.id === txn.categoryId)
    const acc = accounts.find(a => a.id === txn.accountId)
    return (
      <div className={`card flex items-center gap-3 hover:border-cu-muted/50 transition-all group ${compact ? 'p-2.5' : 'p-3'}`}>
        <div className={`${compact ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'} rounded-xl bg-cu-bg flex items-center justify-center flex-shrink-0`}>
          {cat?.icon || (txn.type === 'income' ? '💰' : txn.type === 'transfer' ? '🔄' : '💸')}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-cu-text font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {txn.note || cat?.name || 'Transaksi'}
          </div>
          {!compact && (
            <div className="text-cu-muted text-xs flex items-center gap-1.5 mt-0.5">
              <span>{formatDate(txn.date, 'time')}</span>
              {acc && <><span>·</span><span>{acc.name}</span></>}
              {txn.tags?.length > 0 && <><span>·</span><span className="text-emerald-400">{txn.tags[0]}</span></>}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`font-semibold font-mono ${compact ? 'text-xs' : 'text-sm'} ${txn.type === 'income' ? 'text-emerald-400' : txn.type === 'transfer' ? 'text-blue-400' : 'text-rose-400'}`}>
            {txn.type === 'income' ? '+' : txn.type === 'transfer' ? '→' : '-'}{formatRupiah(txn.amount, true)}
          </div>
        </div>
        <div className="hidden group-hover:flex gap-1 ml-1">
          <button onClick={() => setEditTxn(txn)} className="p-1.5 hover:bg-cu-bg rounded-lg text-cu-muted hover:text-emerald-400 transition-all">
            <Edit3 size={13} />
          </button>
          <button onClick={() => handleDelete(txn)} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-cu-muted hover:text-rose-400 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 pt-4 pb-3 space-y-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-cu-surface border border-cu-border rounded-xl px-3 py-2.5">
            <Search size={16} className="text-cu-muted flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari transaksi..."
              className="bg-transparent text-sm text-cu-text placeholder:text-cu-muted outline-none flex-1"
            />
            {search && <button onClick={() => setSearch('')}><X size={14} className="text-cu-muted" /></button>}
          </div>
          <button onClick={() => setShowFilter(!showFilter)} className={`p-2.5 rounded-xl border transition-all ${showFilter ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-cu-surface border-cu-border text-cu-muted'}`}>
            <Filter size={18} />
          </button>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="card p-3 space-y-3 animate-fade-in">
            <div className="grid grid-cols-3 gap-2">
              {[{v:'all',l:'Semua'},{v:'expense',l:'Keluar'},{v:'income',l:'Masuk'},{v:'transfer',l:'Transfer'}].map(({v,l}) => (
                <button key={v} onClick={() => setFilterType(v)} className={`py-1.5 rounded-xl text-xs font-medium transition-all ${filterType === v ? 'bg-emerald-500 text-white' : 'bg-cu-bg text-cu-muted hover:text-cu-text'}`}>{l}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={filterAcc} onChange={e => setFilterAcc(e.target.value)} className="bg-cu-bg border border-cu-border rounded-xl px-3 py-2 text-xs text-cu-text outline-none">
                <option value="all">Semua Akun</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-cu-bg border border-cu-border rounded-xl px-3 py-2 text-xs text-cu-text outline-none">
                <option value="date">Terbaru</option>
                <option value="amount-desc">Terbesar</option>
                <option value="amount-asc">Terkecil</option>
              </select>
            </div>
          </div>
        )}

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-cu-surface border border-cu-border rounded-xl p-1">
          {VIEWS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setView(key)} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${view === key ? 'bg-emerald-500 text-white shadow' : 'text-cu-muted hover:text-cu-text'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-4 pb-3 flex gap-4 text-xs text-cu-muted flex-shrink-0">
        <span>{filtered.length} transaksi</span>
        <span className="text-rose-400">-{formatRupiah(filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),true)}</span>
        <span className="text-emerald-400">+{formatRupiah(filtered.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),true)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="px-4 pb-6 space-y-5">
            {grouped.length === 0 ? (
              <div className="text-center py-16 text-cu-muted">
                <div className="text-4xl mb-3">🔍</div>
                <div>Tidak ada transaksi ditemukan</div>
              </div>
            ) : grouped.map(([dateKey, txns]) => {
              const d = new Date(dateKey)
              const dayTotal = txns.reduce((s, t) => t.type === 'expense' ? s - t.amount : t.type === 'income' ? s + t.amount : s, 0)
              return (
                <div key={dateKey}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-cu-subtext text-xs font-medium">{formatDate(d, 'long').split(',')[0]}, {format(d, 'd MMM yyyy', { locale: idLocale })}</div>
                    <div className={`text-xs font-mono font-medium ${dayTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {dayTotal >= 0 ? '+' : ''}{formatRupiah(dayTotal, true)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {txns.map(txn => <TxnCard key={txn.id} txn={txn} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <div className="px-4 pb-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth()-1); return d })} className="btn-ghost px-3 py-1.5 text-sm">‹</button>
              <span className="text-cu-text font-semibold">{format(calMonth, 'MMMM yyyy', { locale: idLocale })}</span>
              <button onClick={() => setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth()+1); return d })} className="btn-ghost px-3 py-1.5 text-sm">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
                <div key={d} className="text-center text-cu-muted text-[10px] font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOfMonth(calMonth).getDay() }).map((_, i) => <div key={`e${i}`} />)}
              {calDays.map(day => {
                const totals = dayTotals(day)
                const isSelected = isSameDay(day, selectedDate)
                const isToday = isSameDay(day, new Date())
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all relative ${isSelected ? 'bg-emerald-500 text-white' : isToday ? 'bg-cu-surface border border-emerald-500/50 text-cu-text' : 'hover:bg-cu-surface text-cu-subtext'}`}
                  >
                    <span className="font-medium">{format(day, 'd')}</span>
                    {totals.count > 0 && (
                      <span className={`text-[8px] mt-0.5 ${isSelected ? 'text-white/80' : totals.exp > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {totals.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {/* Selected day transactions */}
            <div className="mt-4 space-y-2">
              <div className="text-cu-subtext text-xs font-medium">{format(selectedDate, 'd MMMM yyyy', { locale: idLocale })}</div>
              {txnByDay(selectedDate).length === 0
                ? <div className="text-cu-muted text-sm text-center py-4">Tidak ada transaksi</div>
                : txnByDay(selectedDate).map(txn => <TxnCard key={txn.id} txn={txn} />)
              }
            </div>
          </div>
        )}

        {/* GALLERY VIEW */}
        {view === 'gallery' && (
          <div className="px-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {filtered.filter(t => t.imageUrl).length === 0
                ? <div className="col-span-2 text-center py-16 text-cu-muted"><div className="text-4xl mb-3">🖼️</div><div>Belum ada foto struk</div></div>
                : filtered.filter(t => t.imageUrl).map(txn => {
                  const cat = categories.find(c => c.id === txn.categoryId)
                  return (
                    <div key={txn.id} className="card overflow-hidden">
                      <img src={txn.imageUrl} alt="struk" className="w-full h-32 object-cover" />
                      <div className="p-2">
                        <div className="text-cu-text text-xs font-medium truncate">{txn.note || cat?.name}</div>
                        <div className={`text-xs font-mono font-semibold ${txn.type==='income'?'text-emerald-400':'text-rose-400'}`}>{formatRupiah(txn.amount, true)}</div>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        )}
      </div>

      {editTxn && <TransactionFormModal prefill={editTxn} onClose={() => setEditTxn(null)} />}
    </div>
  )
}
