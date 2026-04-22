export type Currency = 'EUR' | 'USD' | 'CHF'

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface BondYieldPoint {
  date: string
  us10y: number
  de10y: number
  fr10y: number
  eu10y: number
}

export interface InflationPoint {
  date: string
  euHicp: number | null
  usCpi: number | null
  euForecast: number | null
  usForecast: number | null
}

export interface BitcoinPoint {
  date: string
  price: number
}

export interface ForexPoint {
  date: string
  rate: number
}

export interface ForexPair {
  base: string
  quote: string
  label: string
}

export const FOREX_PAIRS: ForexPair[] = [
  { base: 'EUR', quote: 'CHF', label: 'EUR / CHF' },
  { base: 'USD', quote: 'CHF', label: 'USD / CHF' },
  { base: 'EUR', quote: 'USD', label: 'EUR / USD' },
  { base: 'USD', quote: 'EUR', label: 'USD / EUR' },
  { base: 'CHF', quote: 'EUR', label: 'CHF / EUR' },
  { base: 'CHF', quote: 'USD', label: 'CHF / USD' },
]

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
]
