import { useState } from 'react'
import type { Currency } from './types'
import Header from './components/Header'
import BondYieldsChart from './components/BondYieldsChart'
import BitcoinChart from './components/BitcoinChart'
import InflationChart from './components/InflationChart'
import ForexChart from './components/ForexChart'

export default function App() {
  const [currency, setCurrency] = useState<Currency>('EUR')

  return (
    <div className="app">
      <Header currency={currency} onCurrencyChange={setCurrency} />
      <main className="dashboard-grid">
        <BondYieldsChart />
        <BitcoinChart currency={currency} />
        <InflationChart />
        <ForexChart />
      </main>
    </div>
  )
}
