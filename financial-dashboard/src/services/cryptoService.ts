import axios from 'axios'
import type { BitcoinPoint } from '../types'
import type { Currency } from '../types'

const COINGECKO_BASE = '/api/coingecko'

// CoinGecko currency ids
const CURRENCY_ID: Record<Currency, string> = {
  EUR: 'eur',
  USD: 'usd',
  CHF: 'chf',
}

export interface BitcoinCurrentPrice {
  eur: number
  usd: number
  chf: number
  eur_24h_change: number
  usd_24h_change: number
  chf_24h_change: number
}

export async function fetchBitcoinHistory(currency: Currency, days = 365): Promise<BitcoinPoint[]> {
  const vs = CURRENCY_ID[currency]
  const response = await axios.get<{ prices: [number, number][] }>(
    `${COINGECKO_BASE}/coins/bitcoin/market_chart`,
    { params: { vs_currency: vs, days, interval: 'daily' } },
  )
  return response.data.prices.map(([ts, price]) => ({
    date: new Date(ts).toISOString().slice(0, 10),
    price: Math.round(price * 100) / 100,
  }))
}

export async function fetchBitcoinCurrentPrice(): Promise<BitcoinCurrentPrice> {
  const response = await axios.get<{
    bitcoin: {
      eur: number
      usd: number
      chf: number
      eur_24h_change: number
      usd_24h_change: number
      chf_24h_change: number
    }
  }>(`${COINGECKO_BASE}/simple/price`, {
    params: {
      ids: 'bitcoin',
      vs_currencies: 'eur,usd,chf',
      include_24hr_change: true,
    },
  })
  return response.data.bitcoin
}
