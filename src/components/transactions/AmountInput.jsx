import { forwardRef, useState } from 'react'
import { Delete } from 'lucide-react'

const NUMPAD = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
  ['.','0','⌫'],
]

const AmountInput = forwardRef(function AmountInput({ value, onChange, type, className }, ref) {
  const [useNumpad, setUseNumpad] = useState(true)

  const color = type === 'expense' ? 'text-rose-400' : type === 'income' ? 'text-emerald-400' : 'text-blue-400'

  const handleNumpad = (key) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1) || '')
      return
    }
    if (key === '.' && value.includes('.')) return
    if (value === '0' && key !== '.') { onChange(key); return }
    if (value.length >= 15) return
    onChange(value + key)
  }

  if (useNumpad) return (
    <div>
      <div
        className={`${className} ${color} cursor-text min-h-[52px] flex items-center justify-center`}
        onClick={() => setUseNumpad(false)}
      >
        {value || <span className="text-cu-muted">0</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {NUMPAD.flat().map(k => (
          <button
            key={k}
            type="button"
            onPointerDown={e => { e.preventDefault(); handleNumpad(k) }}
            className={`h-12 rounded-xl font-medium text-lg transition-all active:scale-95 ${
              k === '⌫'
                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                : 'bg-cu-bg hover:bg-cu-border text-cu-text'
            }`}
          >
            {k === '⌫' ? <Delete size={18} className="mx-auto" /> : k}
          </button>
        ))}
      </div>
      <button onClick={() => setUseNumpad(false)} className="w-full text-cu-muted text-xs mt-2 py-1">
        Ketik manual
      </button>
    </div>
  )

  return (
    <div>
      <input
        ref={ref}
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        inputMode="decimal"
        className={`${className} ${color} bg-transparent outline-none border-b-2 border-cu-border focus:border-emerald-500 pb-1 transition-colors`}
        autoFocus
      />
      <button onClick={() => setUseNumpad(true)} className="w-full text-cu-muted text-xs mt-2 py-1">
        Gunakan numpad
      </button>
    </div>
  )
})

export default AmountInput
