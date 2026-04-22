import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { inflationData } from '../data/inflationData'

const COLORS = {
  euHicp: '#34d399',
  usCpi: '#60a5fa',
  euForecast: '#34d399',
  usForecast: '#60a5fa',
}

export default function InflationChart() {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2 className="chart-title">Inflation — Historical & Forecasts</h2>
        <p className="chart-subtitle">Year-on-year (%) — Jan 2024 to Dec 2027</p>
      </div>

      <div className="chart-legend-badges">
        <span className="badge" style={{ color: COLORS.euHicp }}>● EU HICP (actual)</span>
        <span className="badge" style={{ color: COLORS.usCpi }}>● US CPI (actual)</span>
        <span className="badge" style={{ color: COLORS.euForecast, opacity: 0.6 }}>
          ● EU Forecast (ECB)
        </span>
        <span className="badge" style={{ color: COLORS.usForecast, opacity: 0.6 }}>
          ● US Forecast (Fed)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={inflationData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#374151' }}
            interval={3}
            minTickGap={40}
          />
          <YAxis
            domain={[0, 4]}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#e5e7eb', marginBottom: 4 }}
            itemStyle={{ color: '#d1d5db' }}
            formatter={(value: unknown) => {
              const v = value as number | null
              return v !== null ? [`${v.toFixed(1)}%`] : ['N/A']
            }}
          />
          <Legend wrapperStyle={{ display: 'none' }} />
          <ReferenceLine
            y={2}
            stroke="#6b7280"
            strokeDasharray="6 3"
            label={{ value: '2% target', fill: '#6b7280', fontSize: 11, position: 'right' }}
          />
          {/* Actual historical lines */}
          <Line
            type="monotone"
            dataKey="euHicp"
            stroke={COLORS.euHicp}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            name="EU HICP"
          />
          <Line
            type="monotone"
            dataKey="usCpi"
            stroke={COLORS.usCpi}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            name="US CPI"
          />
          {/* Forecast dashed lines */}
          <Line
            type="monotone"
            dataKey="euForecast"
            stroke={COLORS.euForecast}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls={false}
            name="EU Forecast"
          />
          <Line
            type="monotone"
            dataKey="usForecast"
            stroke={COLORS.usForecast}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls={false}
            name="US Forecast"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-footer">
        <p>Sources: Eurostat HICP, US BLS CPI, ECB Projections (Mar 2026), Fed SEP (Mar 2026)</p>
      </div>
    </div>
  )
}
