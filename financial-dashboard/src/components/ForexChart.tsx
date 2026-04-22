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
import { fetchForexHistory, fetchCurrentRate } from '../services/forexService'
import type { ForexPoint, ForexPair } from '../types'
import { FOREX_PAIRS } from '../types'

const RANGE_OPTIONS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
]

function pastDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ForexChart() {
  const [pairIndex, setPairIndex] = useState(0)
  const [data, setData] = useState<ForexPoint[]>([])
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [rangeDays, setRangeDays] = useState(365)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pair: ForexPair = FOREX_PAIRS[pairIndex]

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = pastDate(rangeDays)
      const to = today()
      const [history, rate] = await Promise.all([
        fetchForexHistory(pair.base, pair.quote, from, to),
        fetchCurrentRate(pair.base, pair.quote),
      ])
      setData(history)
      setCurrentRate(rate)
    } catch {
      setError('Could not load exchange rate data. Check your network or try again later.')
    } finally {
      setLoading(false)
    }
  }, [pair, rangeDays])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h2 className="chart-title">Forex — Exchange Rate</h2>
          <p className="chart-subtitle">{pair.label} historical rate</p>
        </div>
        {currentRate !== null && (
          <div className="price-badge">
            <span className="price-value">{currentRate.toFixed(5)}</span>
            <span className="price-label">{pair.label}</span>
          </div>
        )}
      </div>

      {/* Pair selector */}
      <div className="pair-selector">
        {FOREX_PAIRS.map((p, i) => (
          <button
            key={p.label}
            className={`range-btn ${pairIndex === i ? 'active' : ''}`}
            onClick={() => setPairIndex(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Range selector */}
      <div className="range-selector" style={{ marginTop: 8 }}>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            className={`range-btn ${rangeDays === opt.days ? 'active' : ''}`}
            onClick={() => setRangeDays(opt.days)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <div className="chart-loading">Loading exchange rate data…</div>}
      {error && <div className="chart-error">{error}</div>}

      {!loading && !error && (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="forexGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
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
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => v.toFixed(4)}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 8,
              }}
              labelStyle={{ color: '#e5e7eb', marginBottom: 4 }}
              formatter={(value: number) => [`${value.toFixed(5)}`, pair.label]}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#a78bfa"
              strokeWidth={2}
              fill="url(#forexGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="chart-footer">
        <p>Source: Frankfurter API (ECB reference rates) · Live data</p>
      </div>
    </div>
  )
}
