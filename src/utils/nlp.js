/**
 * Natural Language Parser for Cerdas Uang
 * Tanpa AI - murni regex dan rule-based
 * Support: Bahasa Indonesia + kata informal
 */

// ============================================================
// KAMUS KATA KUNCI
// ============================================================

const EXPENSE_KEYWORDS = [
  'beli', 'bayar', 'bayar', 'beli', 'beli', 'beli', 'makan', 'minum', 'jajan',
  'keluar', 'pengeluaran', 'habis', 'pakai', 'transfer ke', 'kirim ke',
  'belanja', 'beli', 'cicil', 'kredit', 'ngopi', 'nongkrong', 'nonton',
  'isi bensin', 'gojek', 'grab', 'shopee', 'tokopedia', 'ojek',
  'listrik', 'pulsa', 'internet', 'sewa', 'kos', 'parkir'
]

const INCOME_KEYWORDS = [
  'dapat', 'terima', 'masuk', 'pemasukan', 'gaji', 'bonus', 'thr',
  'dibayar', 'transfer masuk', 'hasil', 'untung', 'profit', 'jual',
  'cashback', 'refund', 'kembali', 'balik', 'freelance', 'proyek', 'fee'
]

const CATEGORY_MAP = {
  // Makanan & Minuman
  'makan': 'exp-makanan', 'minum': 'exp-makanan', 'jajan': 'exp-makanan',
  'kopi': 'exp-makan-kopi', 'ngopi': 'exp-makan-kopi', 'cafe': 'exp-makan-kopi',
  'starbucks': 'exp-makan-kopi', 'kopi kenangan': 'exp-makan-kopi',
  'gofood': 'exp-makan-grabfood', 'grabfood': 'exp-makan-grabfood', 'shopeefood': 'exp-makan-grabfood',
  'nasi': 'exp-makan-warung', 'warung': 'exp-makan-warung', 'warteg': 'exp-makan-warung',
  'restoran': 'exp-makan-resto', 'resto': 'exp-makan-resto',

  // Transportasi
  'gojek': 'exp-trans-ojek', 'grab': 'exp-trans-ojek', 'ojek': 'exp-trans-ojek',
  'bensin': 'exp-trans-bensin', 'bbm': 'exp-trans-bensin', 'premium': 'exp-trans-bensin',
  'pertamax': 'exp-trans-bensin', 'pertalite': 'exp-trans-bensin',
  'angkot': 'exp-trans-angkot', 'bus': 'exp-trans-angkot', 'transjakarta': 'exp-trans-angkot',
  'parkir': 'exp-trans-parkir',

  // Belanja
  'shopee': 'exp-belanja-online', 'tokopedia': 'exp-belanja-online', 'lazada': 'exp-belanja-online',
  'tiktok shop': 'exp-belanja-online',
  'indomaret': 'exp-belanja-grocery', 'alfamart': 'exp-belanja-grocery',
  'supermarket': 'exp-belanja-grocery', 'hypermart': 'exp-belanja-grocery',
  'baju': 'exp-belanja-fashion', 'pakaian': 'exp-belanja-fashion', 'celana': 'exp-belanja-fashion',
  'sepatu': 'exp-belanja-fashion',

  // Tagihan
  'listrik': 'exp-tagihan-listrik', 'pln': 'exp-tagihan-listrik',
  'air': 'exp-tagihan-air', 'pdam': 'exp-tagihan-air',
  'internet': 'exp-tagihan-internet', 'wifi': 'exp-tagihan-internet',
  'pulsa': 'exp-tagihan-hp', 'paket': 'exp-tagihan-hp', 'kuota': 'exp-tagihan-hp',
  'kos': 'exp-tagihan-kos', 'sewa': 'exp-tagihan-kos', 'kontrakan': 'exp-tagihan-kos',

  // Hiburan
  'netflix': 'exp-hibur-streaming', 'spotify': 'exp-hibur-streaming',
  'youtube': 'exp-hibur-streaming', 'disney': 'exp-hibur-streaming',
  'bioskop': 'exp-hibur-bioskop', 'nonton': 'exp-hibur-bioskop', 'cgv': 'exp-hibur-bioskop',
  'game': 'exp-hibur-game', 'steam': 'exp-hibur-game',

  // Kesehatan
  'dokter': 'exp-kes-dokter', 'puskesmas': 'exp-kes-dokter', 'rumah sakit': 'exp-kes-dokter',
  'obat': 'exp-kes-obat', 'apotek': 'exp-kes-obat',
  'gym': 'exp-kes-gym', 'fitness': 'exp-kes-gym',

  // Pemasukan
  'gaji': 'inc-gaji-pokok', 'salary': 'inc-gaji-pokok',
  'bonus': 'inc-gaji-bonus', 'thr': 'inc-gaji-thr',
  'freelance': 'inc-freelance',
  'dividen': 'inc-invest-dividen', 'dividen': 'inc-invest-dividen',
}

const ACCOUNT_MAP = {
  'bca': 'acc-bca', 'bank bca': 'acc-bca', 'bank': 'acc-bca',
  'gopay': 'acc-gopay', 'go-pay': 'acc-gopay',
  'ovo': 'acc-ovo',
  'dompet': 'acc-kas', 'cash': 'acc-kas', 'tunai': 'acc-kas', 'kas': 'acc-kas',
}

// ============================================================
// AMOUNT PARSER - parse "15rb", "1.5jt", "15.000", dll
// ============================================================
export function parseAmount(text) {
  const t = text.toLowerCase().replace(/\s/g, '')

  // pattern: angka + satuan (rb, ribu, jt, juta, m, miliar)
  const patterns = [
    { regex: /(\d+(?:[.,]\d+)?)\s*m(?:iliar)?/i, multiplier: 1_000_000_000 },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/i, multiplier: 1_000_000 },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)/i, multiplier: 1_000 },
    { regex: /(\d+(?:[.,]\d+)?)/, multiplier: 1 },
  ]

  for (const { regex, multiplier } of patterns) {
    const match = t.match(regex)
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'))
      if (!isNaN(num)) return Math.round(num * multiplier)
    }
  }
  return null
}

// ============================================================
// DATE PARSER - "kemarin", "tadi", "senin", tanggal relatif
// ============================================================
export function parseDate(text) {
  const t = text.toLowerCase()
  const now = new Date()

  if (t.includes('tadi') || t.includes('barusan') || t.includes('baru saja')) return now
  if (t.includes('kemarin')) {
    const d = new Date(now); d.setDate(d.getDate() - 1); return d
  }
  if (t.includes('2 hari lalu') || t.includes('dua hari lalu')) {
    const d = new Date(now); d.setDate(d.getDate() - 2); return d
  }

  // tanggal: "tanggal 5", "tgl 5", "5 juni"
  const tglMatch = t.match(/(?:tanggal|tgl)\s+(\d{1,2})/)
  if (tglMatch) {
    const d = new Date(now); d.setDate(parseInt(tglMatch[1])); return d
  }

  // hari: senin, selasa, dst
  const hariMap = { senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 0 }
  for (const [hari, day] of Object.entries(hariMap)) {
    if (t.includes(hari)) {
      const d = new Date(now)
      const diff = (d.getDay() - day + 7) % 7
      d.setDate(d.getDate() - (diff === 0 ? 7 : diff))
      return d
    }
  }

  return now
}

// ============================================================
// MAIN PARSER
// ============================================================
export function parseNaturalLanguage(input, accounts = [], categories = []) {
  if (!input || input.trim().length < 2) return null

  const text = input.trim()
  const lower = text.toLowerCase()

  // --- Deteksi tipe transaksi ---
  let type = 'expense' // default
  const incomeScore = INCOME_KEYWORDS.filter(k => lower.includes(k)).length
  const expenseScore = EXPENSE_KEYWORDS.filter(k => lower.includes(k)).length
  if (incomeScore > expenseScore) type = 'income'
  if (lower.includes('transfer') && !lower.includes('transfer ke')) type = 'transfer'

  // --- Parse nominal ---
  const amount = parseAmount(lower)

  // --- Parse tanggal ---
  const date = parseDate(lower)

  // --- Deteksi kategori ---
  let categoryId = null
  let matchedKeyword = ''
  for (const [kw, catId] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(kw)) {
      // prefer longer match
      if (kw.length > matchedKeyword.length) {
        matchedKeyword = kw
        categoryId = catId
      }
    }
  }

  // --- Deteksi akun ---
  let accountId = null
  for (const [kw, accId] of Object.entries(ACCOUNT_MAP)) {
    if (lower.includes(kw)) {
      accountId = accId
      break
    }
  }

  // Fallback ke akun user jika ada
  if (!accountId && accounts.length > 0) accountId = accounts[0].id

  // --- Buat deskripsi bersih ---
  let description = text
    .replace(/\d+(?:[.,]\d+)?\s*(?:rb|ribu|jt|juta|k|m)\b/gi, '')
    .replace(/\d{4,}/g, '')
    .replace(/(?:dari|ke|pake|pakai|via|dengan|di)\s+\w+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Capitalize
  description = description.charAt(0).toUpperCase() + description.slice(1)

  // --- Confidence score ---
  let confidence = 0
  if (amount) confidence += 40
  if (categoryId) confidence += 30
  if (accountId) confidence += 15
  if (description.length > 3) confidence += 15

  return {
    raw: text,
    type,
    amount,
    date,
    categoryId,
    accountId,
    description,
    confidence, // 0-100
    needsConfirmation: confidence < 70 || !amount
  }
}

// ============================================================
// FORMAT HELPERS
// ============================================================
export function formatRupiah(amount, short = false) {
  if (!amount && amount !== 0) return 'Rp 0'
  if (short) {
    if (Math.abs(amount) >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`
    if (Math.abs(amount) >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`
    if (Math.abs(amount) >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function formatDate(date, format = 'short') {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (format === 'short') return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d)
  if (format === 'long') return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  if (format === 'time') return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(d)
  if (format === 'datetime') return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
  return d.toISOString().split('T')[0]
}

export function relativeDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Hari ini'
  if (diffDays === 1) return 'Kemarin'
  if (diffDays < 7) return `${diffDays} hari lalu`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`
  return formatDate(d, 'short')
}
