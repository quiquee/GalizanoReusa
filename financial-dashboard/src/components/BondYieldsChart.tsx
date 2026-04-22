import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { bondYieldData } from '../data/bondData'

const COLORS = {
  us10y: '#60a5fa',
  de10y: '#34d399',
  fr10y: '#f97316',
  eu10y: '#a78bfa',
}

export default function BondYieldsChart() {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2 className="chart-title">10-Year Government Bond Yields</h2>
        <p className="chart-subtitle">Monthly yields (%) — Jan 2024 to Apr 2026</p>
      </div>
      <div className="chart-legend-badges">
        <span className="badge" style={{ color: COLORS.us10y }}>● US Treasury</span>
        <span className="badge" style={{ color: COLORS.de10y }}>● German Bund</span>
        <span className="badge" style={{ color: COLORS.fr10y }}>● French OAT</span>
        <span className="badge" style={{ color: COLORS.eu10y }}>● Euro Area</span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={bondYieldData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#374151' }}
            interval={2}
          />
          <YAxis
            domain={[1.5, 5.5]}
            tickFormatter={(v: number) => `${v.toFixed(2)}%`}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#e5e7eb', marginBottom: 4 }}
            itemStyle={{ color: '#d1d5db' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`]}
          />
          <Legend wrapperStyle={{ display: 'none' }} />
          <Line
            type="monotone"
            dataKey="us10y"
            stroke={COLORS.us10y}
            strokeWidth={2}
            dot={false}
            name="US 10Y"
          />
          <Line
            type="monotone"
            dataKey="de10y"
            stroke={COLORS.de10y}
            strokeWidth={2}
            dot={false}
            name="German Bund"
          />
          <Line
            type="monotone"
            dataKey="fr10y"
            stroke={COLORS.fr10y}
            strokeWidth={2}
            dot={false}
            name="French OAT"
          />
          <Line
            type="monotone"
            dataKey="eu10y"
            stroke={COLORS.eu10y}
            strokeWidth={2}
            dot={false}
            name="Euro Area"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-footer">
        <p>Sources: US Treasury, Bundesbank, Banque de France, ECB</p>
      </div>
    </div>
  )
}
