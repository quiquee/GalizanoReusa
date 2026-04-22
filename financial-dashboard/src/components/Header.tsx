import type { Currency } from '../types'
import { CURRENCIES } from '../types'
import CurrencySelector from './CurrencySelector'

interface Props {
  currency: Currency
  onCurrencyChange: (c: Currency) => void
}

export default function Header({ currency, onCurrencyChange }: Props) {
  const sym = CURRENCIES.find((c) => c.value === currency)?.symbol ?? ''
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo">📈</div>
        <div>
          <h1 className="header-title">Financial Dashboard</h1>
          <p className="header-subtitle">
            Bonds · Bitcoin · Inflation · Forex &nbsp;|&nbsp; All prices in {sym} {currency}
          </p>
        </div>
      </div>
      <CurrencySelector value={currency} onChange={onCurrencyChange} />
    </header>
  )
}
