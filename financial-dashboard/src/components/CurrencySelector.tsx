import type { Currency } from '../types'
import { CURRENCIES } from '../types'

interface Props {
  value: Currency
  onChange: (c: Currency) => void
}

export default function CurrencySelector({ value, onChange }: Props) {
  return (
    <div className="currency-selector">
      <span className="selector-label">Display currency:</span>
      <div className="selector-buttons">
        {CURRENCIES.map((c) => (
          <button
            key={c.value}
            className={`selector-btn ${value === c.value ? 'active' : ''}`}
            onClick={() => onChange(c.value)}
          >
            {c.symbol} {c.value}
          </button>
        ))}
      </div>
    </div>
  )
}
