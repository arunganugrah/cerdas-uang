import { useState, useRef, useEffect } from 'react'
import { X, Send, Zap, CheckCircle, Edit3 } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { parseNaturalLanguage, formatRupiah } from '../../utils/nlp'
import TransactionFormModal from '../transactions/TransactionFormModal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const SUGGESTIONS = [
  'Makan siang 35rb gopay',
  'Gojek ke kantor 25rb',
  'Kopi kenangan 28rb BCA',
  'Bensin 100rb tunai',
  'Listrik 300rb BCA',
  'Gaji 5jt BCA',
  'Grabfood 45rb OVO',
  'Netflix 54rb BCA',
]

export default function QuickInputModal() {
  const { setShowQuickInput, accounts, categories, addTransaction } = useStore()
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState(null)
  const [messages, setMessages] = useState([
    { type: 'bot', text: '👋 Halo! Ketik transaksi kamu dalam bahasa natural.\n\nContoh: "Makan siang 35rb gopay" atau "Gaji 5 juta BCA"' }
  ])
  const [showFullForm, setShowFullForm] = useState(false)
  const [prefill, setPrefill] = useState(null)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleParse = (text) => {
    if (!text.trim()) return
    const result = parseNaturalLanguage(text, accounts, categories)
    setParsed(result)

    const category = categories.find(c => c.id === result?.categoryId)
    const account = accounts.find(a => a.id === result?.accountId)

    let botReply = ''
    if (!result || !result.amount) {
      botReply = '❓ Hmm, aku tidak bisa memparse nominal. Coba format seperti "Makan 15rb" atau "Beli baju 150000".'
    } else {
      const typeLabel = result.type === 'expense' ? '💸 Pengeluaran' : result.type === 'income' ? '💰 Pemasukan' : '🔄 Transfer'
      botReply = `${typeLabel} terdeteksi:\n\n💵 **${formatRupiah(result.amount)}**\n📂 ${category?.name || 'Kategori tidak dikenali'}\n🏦 ${account?.name || 'Akun tidak dikenali'}\n📅 ${format(result.date, 'd MMMM yyyy, HH:mm', { locale: idLocale })}\n\n${result.confidence >= 70 ? '✅ Konfidensialitas tinggi. Simpan?' : '⚠️ Mohon cek detail sebelum menyimpan.'}`
    }

    setMessages(prev => [
      ...prev,
      { type: 'user', text },
      { type: 'bot', text: botReply, hasParsed: !!result?.amount, parsed: result }
    ])
    setInput('')
  }

  const handleConfirm = async (parsedData) => {
    try {
      await addTransaction({
        type: parsedData.type,
        amount: parsedData.amount,
        categoryId: parsedData.categoryId,
        accountId: parsedData.accountId,
        note: parsedData.description,
        date: parsedData.date.toISOString(),
        createdAt: Date.now()
      })
      setMessages(prev => [...prev, { type: 'bot', text: `✅ Tersimpan! ${formatRupiah(parsedData.amount)} berhasil dicatat.\n\nMau tambah transaksi lain?` }])
      setParsed(null)
      toast.success('Transaksi disimpan!')
    } catch {
      toast.error('Gagal menyimpan')
    }
  }

  const handleEditFull = (parsedData) => {
    setPrefill(parsedData ? {
      type: parsedData.type,
      amount: parsedData.amount,
      categoryId: parsedData.categoryId,
      accountId: parsedData.accountId,
      description: parsedData.description,
      date: parsedData.date
    } : null)
    setShowFullForm(true)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickInput(false)} />

        <div className="relative w-full max-w-lg bg-cu-surface rounded-t-3xl sm:rounded-3xl border border-cu-border overflow-hidden h-[85vh] sm:h-[600px] flex flex-col animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-cu-border bg-cu-surface flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                <Zap size={16} className="text-emerald-400" />
              </div>
              <div>
                <div className="font-semibold text-cu-text text-sm">Input Cepat</div>
                <div className="text-cu-muted text-xs">Natural Language · Tanpa AI</div>
              </div>
            </div>
            <button onClick={() => setShowQuickInput(false)} className="btn-ghost p-2">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.type === 'user' ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-cu-bg border border-cu-border rounded-bl-sm'}`}>
                  <p className="text-sm whitespace-pre-line leading-relaxed">
                    {msg.text.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                  {msg.hasParsed && msg.parsed?.amount && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleConfirm(msg.parsed)}
                        className="flex items-center gap-1.5 bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl font-medium hover:bg-emerald-600 transition-all"
                      >
                        <CheckCircle size={13} />
                        Simpan
                      </button>
                      <button
                        onClick={() => handleEditFull(msg.parsed)}
                        className="flex items-center gap-1.5 bg-cu-surface border border-cu-border text-cu-text text-xs px-3 py-1.5 rounded-xl font-medium hover:bg-cu-border transition-all"
                      >
                        <Edit3 size={13} />
                        Edit dulu
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleParse(s)}
                  className="flex-shrink-0 bg-cu-bg border border-cu-border text-cu-subtext text-xs px-3 py-1.5 rounded-full hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-cu-border flex gap-3 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleParse(input)}
              placeholder='Contoh: "Makan 35rb gopay"'
              className="flex-1 bg-cu-bg border border-cu-border rounded-xl px-4 py-3 text-sm text-cu-text placeholder:text-cu-muted outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              onClick={() => handleParse(input)}
              disabled={!input.trim()}
              className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
            >
              <Send size={18} className="text-white" />
            </button>
          </div>

          <div className="text-center pb-3 text-cu-muted text-[10px]">
            Tekan <kbd className="bg-cu-bg border border-cu-border px-1.5 py-0.5 rounded text-[10px]">Ctrl+N</kbd> untuk buka cepat
          </div>
        </div>
      </div>

      {showFullForm && (
        <TransactionFormModal prefill={prefill} onClose={() => { setShowFullForm(false); setShowQuickInput(false) }} />
      )}
    </>
  )
}
