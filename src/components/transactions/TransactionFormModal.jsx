import { useState, useEffect, useRef } from 'react'
import { X, Camera, MapPin, Tag, FileText, ChevronDown, Repeat, BookmarkPlus, Clock } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { formatRupiah } from '../../utils/nlp'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import CategoryPicker from './CategoryPicker'
import AccountPicker from './AccountPicker'
import AmountInput from './AmountInput'
import ImageUploader from './ImageUploader'

const TYPES = [
  { key: 'expense', label: 'Keluar', color: 'text-rose-400', bg: 'bg-rose-500' },
  { key: 'income', label: 'Masuk', color: 'text-emerald-400', bg: 'bg-emerald-500' },
  { key: 'transfer', label: 'Transfer', color: 'text-blue-400', bg: 'bg-blue-500' },
]

export default function TransactionFormModal({ onClose, prefill = null }) {
  const { accounts, categories, addTransaction, saveDraft, loadDraft, clearDraft, saveAsTemplate, templates } = useStore()

  const [type, setType] = useState(prefill?.type || 'expense')
  const [amount, setAmount] = useState(prefill?.amount || '')
  const [categoryId, setCategoryId] = useState(prefill?.categoryId || null)
  const [accountId, setAccountId] = useState(prefill?.accountId || accounts[0]?.id || null)
  const [toAccountId, setToAccountId] = useState(null)
  const [note, setNote] = useState(prefill?.description || '')
  const [date, setDate] = useState(prefill?.date ? format(new Date(prefill.date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [imageUrl, setImageUrl] = useState(null)
  const [location, setLocation] = useState(null)
  const [showMore, setShowMore] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const amountRef = useRef(null)

  // Load draft on open
  useEffect(() => {
    loadDraft().then(draft => {
      if (draft && !prefill) {
        setType(draft.type || 'expense')
        setAmount(draft.amount || '')
        setNote(draft.note || '')
        setCategoryId(draft.categoryId || null)
        toast('Draft tersimpan dimuat', { icon: '📝' })
      }
    })
    setTimeout(() => amountRef.current?.focus(), 100)
  }, [])

  // Auto-save draft
  useEffect(() => {
    const t = setTimeout(() => {
      if (amount || note) saveDraft({ type, amount, note, categoryId, accountId })
    }, 1000)
    return () => clearTimeout(t)
  }, [type, amount, note, categoryId, accountId])

  const handleGetLocation = () => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      toast.success('Lokasi ditambahkan')
    }, () => toast.error('Gagal mendapatkan lokasi'))
  }

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount))) return toast.error('Masukkan nominal yang valid')
    if (!accountId) return toast.error('Pilih akun')
    if (type === 'transfer' && !toAccountId) return toast.error('Pilih akun tujuan')

    setSaving(true)
    try {
      const txnData = {
        type,
        amount: Number(amount),
        categoryId,
        accountId: type === 'transfer' ? null : accountId,
        fromAccountId: type === 'transfer' ? accountId : null,
        toAccountId: type === 'transfer' ? toAccountId : null,
        note,
        tags,
        date: new Date(date).toISOString(),
        imageUrl,
        location,
        createdAt: Date.now()
      }
      await addTransaction(txnData)
      await clearDraft()
      toast.success(`Transaksi ${type === 'expense' ? 'pengeluaran' : type === 'income' ? 'pemasukan' : 'transfer'} berhasil disimpan!`)
      onClose()
    } catch (e) {
      toast.error('Gagal menyimpan transaksi')
    } finally {
      setSaving(false)
    }
  }

  const activeType = TYPES.find(t => t.key === type)
  const selectedCategory = categories.find(c => c.id === categoryId)
  const selectedAccount = accounts.find(a => a.id === accountId)
  const selectedToAccount = accounts.find(a => a.id === toAccountId)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-cu-surface rounded-t-3xl sm:rounded-3xl border border-cu-border overflow-hidden max-h-[92vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cu-border flex-shrink-0">
          <div className="flex gap-1 bg-cu-bg rounded-xl p-1">
            {TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${type === t.key ? `${t.bg} text-white shadow` : 'text-cu-muted hover:text-cu-text'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-4">
            {/* Amount */}
            <div className="card p-4 text-center">
              <div className="text-cu-subtext text-sm mb-1">Nominal</div>
              <AmountInput
                ref={amountRef}
                value={amount}
                onChange={setAmount}
                type={type}
                className="amount-display text-center w-full bg-transparent"
              />
              {amount && <div className="text-cu-subtext text-xs mt-1">{formatRupiah(Number(amount))}</div>}
            </div>

            {/* Templates */}
            {templates.length > 0 && (
              <div>
                <div className="text-cu-subtext text-xs mb-2">Template cepat</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {templates.slice(0, 5).map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setType(t.type); setAmount(String(t.amount)); setCategoryId(t.categoryId); setNote(t.note || '')
                        toast('Template dimuat', { icon: '⚡' })
                      }}
                      className="flex-shrink-0 bg-cu-bg border border-cu-border rounded-xl px-3 py-2 text-xs text-cu-text"
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="text-cu-subtext">{formatRupiah(t.amount, true)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category */}
            {type !== 'transfer' && (
              <button
                onClick={() => setShowCategoryPicker(true)}
                className="w-full flex items-center gap-3 card p-3 hover:border-emerald-500/50 transition-all"
              >
                <span className="text-2xl">{selectedCategory?.icon || '📂'}</span>
                <div className="flex-1 text-left">
                  <div className="text-cu-subtext text-xs">Kategori</div>
                  <div className="text-cu-text text-sm font-medium">{selectedCategory?.name || 'Pilih kategori'}</div>
                </div>
                <ChevronDown size={16} className="text-cu-muted" />
              </button>
            )}

            {/* Account */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAccountPicker('from')}
                className="flex items-center gap-2 card p-3 hover:border-emerald-500/50 transition-all"
              >
                <span className="text-xl">{selectedAccount?.icon || '💳'}</span>
                <div className="text-left overflow-hidden">
                  <div className="text-cu-subtext text-xs">{type === 'transfer' ? 'Dari' : 'Akun'}</div>
                  <div className="text-cu-text text-sm font-medium truncate">{selectedAccount?.name || 'Pilih'}</div>
                </div>
              </button>
              {type === 'transfer' && (
                <button
                  onClick={() => setShowAccountPicker('to')}
                  className="flex items-center gap-2 card p-3 hover:border-emerald-500/50 transition-all"
                >
                  <span className="text-xl">{selectedToAccount?.icon || '💳'}</span>
                  <div className="text-left overflow-hidden">
                    <div className="text-cu-subtext text-xs">Ke</div>
                    <div className="text-cu-text text-sm font-medium truncate">{selectedToAccount?.name || 'Pilih'}</div>
                  </div>
                </button>
              )}
            </div>

            {/* Note */}
            <div className="flex items-start gap-3 card p-3">
              <FileText size={18} className="text-cu-muted mt-0.5 flex-shrink-0" />
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Catatan (opsional)"
                rows={2}
                className="bg-transparent text-cu-text text-sm placeholder:text-cu-muted flex-1 resize-none outline-none"
              />
            </div>

            {/* Date */}
            <div className="flex items-center gap-3 card p-3">
              <Clock size={18} className="text-cu-muted flex-shrink-0" />
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-transparent text-cu-text text-sm flex-1 outline-none"
              />
            </div>

            {/* More options toggle */}
            <button onClick={() => setShowMore(!showMore)} className="w-full text-cu-subtext text-sm flex items-center justify-center gap-2 py-1">
              <ChevronDown size={14} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
              {showMore ? 'Sembunyikan' : 'Opsi tambahan (foto, lokasi, tag)'}
            </button>

            {showMore && (
              <div className="space-y-3 animate-fade-in">
                {/* Tags */}
                <div className="card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag size={16} className="text-cu-muted" />
                    <span className="text-cu-subtext text-sm">Tag</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span key={tag} className="bg-cu-bg border border-cu-border text-cu-text text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        {tag}
                        <button onClick={() => setTags(tags.filter(t => t !== tag))} className="text-cu-muted hover:text-rose-400">×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        if (tagInput.trim()) { setTags([...tags, tagInput.trim()]); setTagInput('') }
                      }
                    }}
                    placeholder="Tambah tag (Enter)"
                    className="bg-transparent text-cu-text text-sm placeholder:text-cu-muted outline-none w-full"
                  />
                </div>

                {/* Image upload */}
                <ImageUploader value={imageUrl} onChange={setImageUrl} />

                {/* Location */}
                <button
                  onClick={handleGetLocation}
                  className={`w-full flex items-center gap-3 card p-3 hover:border-emerald-500/50 transition-all ${location ? 'border-emerald-500/50' : ''}`}
                >
                  <MapPin size={18} className={location ? 'text-emerald-400' : 'text-cu-muted'} />
                  <span className="text-sm text-cu-text">
                    {location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Tambah lokasi'}
                  </span>
                </button>

                {/* Save as template */}
                <div className="card p-3 space-y-2">
                  <button onClick={() => setShowSaveTemplate(!showSaveTemplate)} className="flex items-center gap-2 text-cu-subtext text-sm w-full">
                    <BookmarkPlus size={16} />
                    Simpan sebagai template
                  </button>
                  {showSaveTemplate && (
                    <div className="flex gap-2">
                      <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Nama template" className="input-field py-2 text-sm" />
                      <button
                        onClick={() => {
                          if (templateName) { saveAsTemplate({ type, amount: Number(amount), categoryId, note }, templateName); toast.success('Template disimpan!'); setShowSaveTemplate(false) }
                        }}
                        className="btn-primary px-3 py-2 text-sm whitespace-nowrap"
                      >Simpan</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cu-border flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSubmit} disabled={saving || !amount} className="btn-primary flex-1 disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {showCategoryPicker && (
        <CategoryPicker
          type={type}
          selected={categoryId}
          onSelect={id => { setCategoryId(id); setShowCategoryPicker(false) }}
          onClose={() => setShowCategoryPicker(false)}
        />
      )}
      {showAccountPicker && (
        <AccountPicker
          selected={showAccountPicker === 'from' ? accountId : toAccountId}
          exclude={showAccountPicker === 'to' ? accountId : null}
          onSelect={id => { showAccountPicker === 'from' ? setAccountId(id) : setToAccountId(id); setShowAccountPicker(false) }}
          onClose={() => setShowAccountPicker(false)}
        />
      )}
    </div>
  )
}
