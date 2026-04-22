import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fetchBitcoinHistory, fetchBitcoinCurrentPrice } from '../services/cryptoService'
import type { Currency } from '../types'
import { CURRENCIES } from '../types'
import type { BitcoinPoint } from '../types'
import type { BitcoinCurrentPrice } from '../services/cryptoService'

interface Props {
  currency: Currency
}

const DAYS_OPTIONS = [
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: '180D', value: 180 },
  { label: '1Y', value: 365 },
  { label: '2Y', value: 730 },
]

function formatPrice(price: number, currency: Currency) {
  const sym = CURRENCIES.find((c) => c.value === currency)?.symbol ?? currency
  if (price >= 1000) {
    return `${sym} ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return `${sym} ${price.toFixed(2)}`
}

export default function BitcoinChart({ currency }: Props) {
  const [data, setData] = useState<BitcoinPoint[]>([])
  const [current, setCurrent] = useState<BitcoinCurrentPrice | null>(null)
  const [days, setDays] = useState(365)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [history, price] = await Promise.all([
        fetchBitcoinHistory(currency, days),
        fetchBitcoinCurrentPrice(),
      ])
      setData(history)
      setCurrent(price)
    } catch {
      setError('Could not load Bitcoin data. Check your network or try again later.')
    } finally {
      setLoading(false)
    }
  }, [currency, days])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const currencyKey = currency.toLowerCase() as 'eur' | 'usd' | 'chf'
  const currentPrice = current ? current[currencyKey] : null
  const changeKey = `${currencyKey}_24h_change` as keyof BitcoinCurrentPrice
  const change24h = current ? (current[changeKey] as number) : null

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h2 className="chart-title">
            <span className="btc-icon">₿</span> Bitcoin (BTC)
          </h2>
          <p className="chart-subtitle">Price history in {currency}</p>
        </div>
        {currentPrice !== null && (
          <div className="price-badge">
            <span className="price-value">{formatPrice(currentPrice, currency)}</span>
            {change24h !== null && (
              <span className={`price-change ${change24h >= 0 ? 'positive' : 'negative'}`}>
                {change24h >= 0 ? '+' : ''}
                {change24h.toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>

      <div className="range-selector">
        {DAYS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`range-btn ${days === opt.value ? 'active' : ''}`}
            onClick={() => setDays(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <div className="chart-loading">Loading Bitcoin data…</div>}
      {error && <div className="chart-error">{error}</div>}

      {!loading && !error && (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)
              }
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 8,
              }}
              labelStyle={{ color: '#e5e7eb', marginBottom: 4 }}
              formatter={(value: number) => [formatPrice(value, currency), 'BTC']}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#btcGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="chart-footer">
        <p>Source: CoinGecko API · Live data</p>
      </div>
    </div>
  )
}
