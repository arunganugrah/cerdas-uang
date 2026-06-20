import { useState, useMemo } from 'react'
import { useStore } from '../stores/useStore'
import { formatRupiah } from '../utils/nlp'
import { format, eachDayOfInterval, subDays, startOfYear } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { Download } from 'lucide-react'

const METRICS = [
  { key: 'total', label: 'Total' },
  { key: 'count', label: 'Jumlah' },
  { key: 'avg', label: 'Rata-rata' },
  { key: 'median', label: 'Median' },
]

function median(arr) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2
}

function stddev(arr) {
  if (arr.length < 2) return 0
  const avg = arr.reduce((s, v) => s + v, 0) / arr.length
  return Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length)
}

// Heatmap color scale
function heatColor(value, max) {
  if (!value || !max) return '#1e293b'
  const intensity = value / max
  if (intensity > 0.8) return '#065f46'
  if (intensity > 0.6) return '#047857'
  if (intensity > 0.4) return '#059669'
  if (intensity > 0.2) return '#10b981'
  return '#6ee7b7'
}

export default function InsightsPage() {
  const { transactions, categories } = useStore()
  const [activeTab, setActiveTab] = useState('heatmap')
  const [filterType, setFilterType] = useState('expense')
  const [filterCat, setFilterCat] = useState('all')
  const [metric, setMetric] = useState('total')

  // --- HEATMAP DATA (last 365 days) ---
  const heatmapData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 364), end: new Date() })
    return days.map(day => {
      const dayTxns = transactions.filter(t =>
        t.type === filterType &&
        format(new Date(t.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') &&
        (filterCat === 'all' || t.categoryId === filterCat)
      )
      return {
        date: day,
        label: format(day, 'd MMM', { locale: idLocale }),
        value: dayTxns.reduce((s, t) => s + t.amount, 0),
        count: dayTxns.length
      }
    })
  }, [transactions, filterType, filterCat])

  const maxHeat = Math.max(...heatmapData.map(d => d.value))

  // Group heatmap by week
  const heatWeeks = useMemo(() => {
    const weeks = []
    for (let i = 0; i < heatmapData.length; i += 7) {
      weeks.push(heatmapData.slice(i, i + 7))
    }
    return weeks.slice(-26) // last 26 weeks
  }, [heatmapData])

  // --- TREEMAP DATA ---
  const treemapData = useMemo(() => {
    const parentCats = categories.filter(c => !c.parentId && c.type === filterType)
    return parentCats.map(cat => {
      const children = categories.filter(c => c.parentId === cat.id)
      const catTxns = transactions.filter(t => t.type === filterType && (t.categoryId === cat.id || children.some(ch => ch.id === t.categoryId)))
      const total = catTxns.reduce((s, t) => s + t.amount, 0)
      if (total === 0) return null
      return {
        name: `${cat.icon} ${cat.name}`,
        size: total,
        fill: cat.color || '#10b981'
      }
    }).filter(Boolean).sort((a, b) => b.size - a.size)
  }, [transactions, categories, filterType])

  // --- STATS / QUERY EXPLORER ---
  const stats = useMemo(() => {
    const filtered = transactions.filter(t =>
      t.type === filterType &&
      (filterCat === 'all' || t.categoryId === filterCat)
    )
    const amounts = filtered.map(t => t.amount)
    const total = amounts.reduce((s, v) => s + v, 0)
    const avg = amounts.length ? total / amounts.length : 0
    const med = median(amounts)
    const std = stddev(amounts)
    const q1 = amounts.length ? amounts.sort((a,b)=>a-b)[Math.floor(amounts.length*0.25)] : 0
    const q3 = amounts.length ? amounts.sort((a,b)=>a-b)[Math.floor(amounts.length*0.75)] : 0
    const max = Math.max(...amounts, 0)
    const min = amounts.length ? Math.min(...amounts) : 0
    const savingsRate = (() => {
      const income = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
      const expense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
      return income > 0 ? ((income-expense)/income*100).toFixed(1) : 0
    })()
    return { total, count: amounts.length, avg, med, std, q1, q3, max, min, savingsRate }
  }, [transactions, filterType, filterCat])

  // --- EXPORT ---
  const exportCSV = () => {
    const filtered = transactions.filter(t =>
      t.type === filterType &&
      (filterCat === 'all' || t.categoryId === filterCat)
    )
    const header = 'Tanggal,Tipe,Jumlah,Kategori,Akun,Catatan'
    const rows = filtered.map(t => {
      const cat = categories.find(c => c.id === t.categoryId)?.name || ''
      return `${format(new Date(t.date),'yyyy-MM-dd')},${t.type},${t.amount},"${cat}","${t.accountId}","${t.note||''}"`
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `cerdas-uang-export-${format(new Date(),'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const parentCats = categories.filter(c => !c.parentId && c.type === filterType)

  return (
    <div className="px-4 py-4 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cu-text font-bold text-lg">Insights Explorer</h2>
          <p className="text-cu-muted text-xs">Analisis mendalam keuangan kamu</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 bg-cu-surface border border-cu-border rounded-xl px-3 py-2 text-cu-subtext text-xs hover:border-emerald-500/50 hover:text-emerald-400 transition-all">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 bg-cu-surface border border-cu-border rounded-xl p-1">
          {[{v:'expense',l:'Keluar'},{v:'income',l:'Masuk'}].map(({v,l}) => (
            <button key={v} onClick={() => setFilterType(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType===v ? (v==='expense'?'bg-rose-500':'bg-emerald-500')+' text-white' : 'text-cu-muted'}`}>{l}</button>
          ))}
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-cu-surface border border-cu-border rounded-xl px-3 py-2 text-xs text-cu-text outline-none flex-1">
          <option value="all">Semua Kategori</option>
          {parentCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-cu-surface border border-cu-border rounded-xl p-1">
        {[{k:'heatmap',l:'Heatmap'},{k:'treemap',l:'Treemap'},{k:'stats',l:'Statistik'}].map(({k,l}) => (
          <button key={k} onClick={() => setActiveTab(k)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab===k ? 'bg-emerald-500 text-white' : 'text-cu-muted'}`}>{l}</button>
        ))}
      </div>

      {/* HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="card p-4">
          <h3 className="text-cu-text font-semibold text-sm mb-4">Calendar Heatmap · 6 Bulan Terakhir</h3>
          <div className="flex gap-0.5 overflow-x-auto pb-2">
            {heatWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="w-4 h-4 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-white/30"
                    style={{ backgroundColor: heatColor(day.value, maxHeat) }}
                    title={`${day.label}: ${formatRupiah(day.value, true)} (${day.count} transaksi)`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-cu-muted text-xs">Rendah</span>
            {['#1e293b','#6ee7b7','#10b981','#059669','#065f46'].map(c => (
              <div key={c} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
            ))}
            <span className="text-cu-muted text-xs">Tinggi</span>
          </div>
          {/* Monthly totals */}
          <div className="mt-4 space-y-2">
            {Array.from({length:6},(_,i) => {
              const d = new Date(); d.setMonth(d.getMonth()-i)
              const mLabel = format(d,'MMMM yyyy',{locale:idLocale})
              const total = heatmapData.filter(h => format(h.date,'MM-yyyy')===format(d,'MM-yyyy')).reduce((s,h)=>s+h.value,0)
              return total > 0 ? (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-cu-subtext capitalize">{mLabel}</span>
                  <span className={`font-mono font-medium ${filterType==='expense'?'text-rose-400':'text-emerald-400'}`}>{formatRupiah(total,true)}</span>
                </div>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* TREEMAP */}
      {activeTab === 'treemap' && (
        <div className="card p-4">
          <h3 className="text-cu-text font-semibold text-sm mb-4">Treemap Pengeluaran per Kategori</h3>
          {treemapData.length === 0 ? (
            <div className="text-center py-12 text-cu-muted">Belum ada data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  stroke="#0f172a"
                  content={({ x, y, width, height, name, size }) => (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={treemapData.find(d=>d.name===name)?.fill || '#10b981'} stroke="#0f172a" strokeWidth={2} rx={4} />
                      {width > 60 && height > 30 && (
                        <>
                          <text x={x+8} y={y+16} fill="white" fontSize={10} fontWeight={500}>{name.length > 12 ? name.slice(0,12)+'…' : name}</text>
                          {height > 45 && <text x={x+8} y={y+30} fill="rgba(255,255,255,0.7)" fontSize={9}>{formatRupiah(size,true)}</text>}
                        </>
                      )}
                    </g>
                  )}
                />
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {treemapData.map((item, i) => {
                  const total = treemapData.reduce((s,d) => s+d.size,0)
                  const pct = Math.round((item.size/total)*100)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.fill }} />
                      <div className="flex-1 text-cu-text text-xs truncate">{item.name}</div>
                      <div className="text-cu-muted text-xs">{pct}%</div>
                      <div className="text-cu-text text-xs font-mono">{formatRupiah(item.size,true)}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total', value: formatRupiah(stats.total), color: filterType==='expense'?'text-rose-400':'text-emerald-400' },
              { label: 'Jumlah Transaksi', value: stats.count, color: 'text-cu-text' },
              { label: 'Rata-rata', value: formatRupiah(stats.avg, true), color: 'text-blue-400' },
              { label: 'Median', value: formatRupiah(stats.med, true), color: 'text-purple-400' },
              { label: 'Q1 (25%)', value: formatRupiah(stats.q1, true), color: 'text-cu-subtext' },
              { label: 'Q3 (75%)', value: formatRupiah(stats.q3, true), color: 'text-cu-subtext' },
              { label: 'Standar Deviasi', value: formatRupiah(stats.std, true), color: 'text-amber-400' },
              { label: 'Savings Rate', value: `${stats.savingsRate}%`, color: 'text-emerald-400' },
            ].map(({label, value, color}) => (
              <div key={label} className="card p-3">
                <div className="text-cu-muted text-xs mb-1">{label}</div>
                <div className={`font-bold font-mono text-base ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Min / Max */}
          <div className="card p-4">
            <h4 className="text-cu-subtext text-xs font-medium mb-3">Range Transaksi</h4>
            <div className="flex items-center gap-3">
              <div className="text-center flex-1">
                <div className="text-cu-muted text-xs mb-1">Terkecil</div>
                <div className="text-blue-400 font-mono font-bold">{formatRupiah(stats.min, true)}</div>
              </div>
              <div className="flex-1 h-1 bg-cu-bg rounded-full" />
              <div className="text-center flex-1">
                <div className="text-cu-muted text-xs mb-1">Terbesar</div>
                <div className="text-rose-400 font-mono font-bold">{formatRupiah(stats.max, true)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
