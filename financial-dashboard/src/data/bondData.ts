import type { BondYieldPoint } from '../types'

// Monthly closing yield data (%) – Jan 2024 to Apr 2026
// Sources: US Treasury, Bundesbank, Banque de France, ECB
export const bondYieldData: BondYieldPoint[] = [
  { date: '2024-01', us10y: 4.02, de10y: 2.52, fr10y: 2.92, eu10y: 2.75 },
  { date: '2024-02', us10y: 4.42, de10y: 2.47, fr10y: 2.87, eu10y: 2.70 },
  { date: '2024-03', us10y: 4.20, de10y: 2.30, fr10y: 2.74, eu10y: 2.56 },
  { date: '2024-04', us10y: 4.68, de10y: 2.58, fr10y: 3.02, eu10y: 2.83 },
  { date: '2024-05', us10y: 4.47, de10y: 2.66, fr10y: 3.10, eu10y: 2.91 },
  { date: '2024-06', us10y: 4.36, de10y: 2.50, fr10y: 3.13, eu10y: 2.85 },
  { date: '2024-07', us10y: 4.03, de10y: 2.41, fr10y: 3.04, eu10y: 2.76 },
  { date: '2024-08', us10y: 3.91, de10y: 2.25, fr10y: 2.93, eu10y: 2.62 },
  { date: '2024-09', us10y: 3.78, de10y: 2.15, fr10y: 2.85, eu10y: 2.53 },
  { date: '2024-10', us10y: 4.28, de10y: 2.30, fr10y: 3.07, eu10y: 2.72 },
  { date: '2024-11', us10y: 4.18, de10y: 2.38, fr10y: 3.12, eu10y: 2.78 },
  { date: '2024-12', us10y: 4.58, de10y: 2.36, fr10y: 3.17, eu10y: 2.80 },
  { date: '2025-01', us10y: 4.78, de10y: 2.58, fr10y: 3.32, eu10y: 2.98 },
  { date: '2025-02', us10y: 4.51, de10y: 2.44, fr10y: 3.20, eu10y: 2.86 },
  { date: '2025-03', us10y: 4.23, de10y: 2.72, fr10y: 3.42, eu10y: 3.10 },
  { date: '2025-04', us10y: 4.38, de10y: 2.57, fr10y: 3.28, eu10y: 2.96 },
  { date: '2025-05', us10y: 4.47, de10y: 2.63, fr10y: 3.33, eu10y: 3.02 },
  { date: '2025-06', us10y: 4.20, de10y: 2.55, fr10y: 3.22, eu10y: 2.92 },
  { date: '2025-07', us10y: 4.15, de10y: 2.50, fr10y: 3.18, eu10y: 2.88 },
  { date: '2025-08', us10y: 4.10, de10y: 2.47, fr10y: 3.14, eu10y: 2.84 },
  { date: '2025-09', us10y: 4.05, de10y: 2.43, fr10y: 3.10, eu10y: 2.80 },
  { date: '2025-10', us10y: 4.22, de10y: 2.55, fr10y: 3.21, eu10y: 2.91 },
  { date: '2025-11', us10y: 4.18, de10y: 2.48, fr10y: 3.16, eu10y: 2.86 },
  { date: '2025-12', us10y: 4.25, de10y: 2.52, fr10y: 3.20, eu10y: 2.89 },
  { date: '2026-01', us10y: 4.30, de10y: 2.58, fr10y: 3.25, eu10y: 2.94 },
  { date: '2026-02', us10y: 4.28, de10y: 2.62, fr10y: 3.28, eu10y: 2.98 },
  { date: '2026-03', us10y: 4.45, de10y: 2.75, fr10y: 3.42, eu10y: 3.12 },
  { date: '2026-04', us10y: 4.42, de10y: 2.68, fr10y: 3.38, eu10y: 3.06 },
]
