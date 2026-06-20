import { useState } from 'react'
import { X, Search, Plus } from 'lucide-react'
import { useStore } from '../../stores/useStore'

export default function CategoryPicker({ type, selected, onSelect, onClose }) {
  const { categories } = useStore()
  const [search, setSearch] = useState('')
  const [expandedParent, setExpandedParent] = useState(null)

  const filtered = categories.filter(c =>
    c.type === type &&
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const parents = filtered.filter(c => !c.parentId)
  const children = (parentId) => filtered.filter(c => c.parentId === parentId)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-cu-surface rounded-t-3xl border border-cu-border max-h-[75vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-cu-border">
          <h3 className="font-semibold text-cu-text">Pilih Kategori</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 bg-cu-bg rounded-xl px-3 py-2">
            <Search size={16} className="text-cu-muted" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kategori..."
              className="bg-transparent text-sm text-cu-text placeholder:text-cu-muted outline-none flex-1"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-3 pb-4 space-y-1">
          {parents.map(cat => (
            <div key={cat.id}>
              <button
                onClick={() => {
                  const subs = children(cat.id)
                  if (subs.length > 0) {
                    setExpandedParent(expandedParent === cat.id ? null : cat.id)
                  } else {
                    onSelect(cat.id)
                  }
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-cu-bg ${selected === cat.id ? 'bg-emerald-500/10 border border-emerald-500/30' : ''}`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-cu-text text-sm font-medium">{cat.name}</div>
                  {children(cat.id).length > 0 && (
                    <div className="text-cu-muted text-xs">{children(cat.id).length} sub-kategori</div>
                  )}
                </div>
                {selected === cat.id && <span className="text-emerald-400 text-lg">✓</span>}
              </button>

              {/* Sub-categories */}
              {expandedParent === cat.id && (
                <div className="ml-4 mt-1 space-y-1 pl-4 border-l border-cu-border animate-fade-in">
                  {children(cat.id).map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => onSelect(sub.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-cu-bg ${selected === sub.id ? 'bg-emerald-500/10 border border-emerald-500/30' : ''}`}
                    >
                      <span className="text-lg">{sub.icon}</span>
                      <span className="text-sm text-cu-text flex-1 text-left">{sub.name}</span>
                      {selected === sub.id && <span className="text-emerald-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {parents.length === 0 && (
            <div className="text-center py-8 text-cu-muted text-sm">
              Tidak ada kategori ditemukan
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
