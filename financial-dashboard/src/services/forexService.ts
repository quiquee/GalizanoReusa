import axios from 'axios'
import type { ForexPoint } from '../types'

const FRANKFURTER_BASE = '/api/frankfurter'

interface FrankfurterHistoryResponse {
  rates: Record<string, Record<string, number>>
}

export async function fetchForexHistory(
  base: string,
  quote: string,
  from: string,
  to: string,
): Promise<ForexPoint[]> {
  const response = await axios.get<FrankfurterHistoryResponse>(`${FRANKFURTER_BASE}/${from}..${to}`, {
    params: { from: base, to: quote },
  })
  return Object.entries(response.data.rates)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, currencies]) => ({
      date,
      rate: Math.round((currencies[quote] ?? 0) * 100000) / 100000,
    }))
}

export async function fetchCurrentRate(base: string, quote: string): Promise<number> {
  const response = await axios.get<{ rates: Record<string, number> }>(`${FRANKFURTER_BASE}/latest`, {
    params: { from: base, to: quote },
  })
  return response.data.rates[quote] ?? 0
}
