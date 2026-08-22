// ═══ CURRENCY WIDGET ═══
// Sacred currency converter — converts between currencies of the Imperium.
// Live rates from open.er-api.com (fiat) + CoinGecko (crypto), with
// offline fallback rates and "last updated" timestamp. Dark Mechanicus styling.

import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

export interface CurrencyWidgetProps {
  /** Initial amount */
  initialAmount?: number;
  /** Initial source currency */
  initialFrom?: string;
  /** Initial target currency */
  initialTo?: string;
  /** Called when conversion result changes */
  onResultChange?: (result: string) => void;
}

// ── Constants ──────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'RUB', name: 'Ruble', symbol: '\u20BD' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'Pound', symbol: '\u00A3' },
  { code: 'JPY', name: 'Yen', symbol: '\u00A5' },
  { code: 'CNY', name: 'Yuan', symbol: '\u00A5' },
  { code: 'BTC', name: 'Bitcoin', symbol: '\u20BF' },
  { code: 'ETH', name: 'Ethereum', symbol: '\u039E' },
];

// Fallback exchange rates (USD base) — used when APIs are unreachable
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  RUB: 92.5,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 150.2,
  CNY: 7.2,
  BTC: 0.000015,
  ETH: 0.00038,
};

async function fetchLiveRates(): Promise<Record<string, number>> {
  const rates: Record<string, number> = { USD: 1 };

  try {
    const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD');
    if (fiatRes.ok) {
      const data = await fiatRes.json();
      for (const c of ['RUB', 'EUR', 'GBP', 'JPY', 'CNY']) {
        if (data.rates?.[c]) rates[c] = data.rates[c];
      }
    }
  } catch {
    // fiat API failed
  }

  try {
    const cryptoRes = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'
    );
    if (cryptoRes.ok) {
      const data = await cryptoRes.json();
      if (data.bitcoin?.usd) rates.BTC = 1 / data.bitcoin.usd;
      if (data.ethereum?.usd) rates.ETH = 1 / data.ethereum.usd;
    }
  } catch {
    // crypto API failed
  }

  // Fill missing from fallback
  for (const [code, rate] of Object.entries(FALLBACK_RATES)) {
    if (!rates[code]) rates[code] = rate;
  }

  return rates;
}

// ── Helpers ────────────────────────────────────────────────

function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return 0;
  return amount * (toRate / fromRate);
}

function formatResult(value: number): string {
  if (value < 0.0001) return value.toExponential(4);
  if (value < 1) return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  if (value < 1000) return value.toFixed(2);
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ──────────────────────────────────────────────

const CurrencyWidget: React.FC<CurrencyWidgetProps> = ({
  initialAmount = 1,
  initialFrom = 'USD',
  initialTo = 'RUB',
  onResultChange,
}) => {
  const [amount, setAmount] = useState<string>(String(initialAmount));
  const [from, setFrom] = useState<string>(initialFrom);
  const [to, setTo] = useState<string>(initialTo);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Load live rates on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchLiveRates()
      .then((live) => {
        if (!mounted) return;
        setRates(live);
        setLastUpdated(new Date());
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const numericAmount = parseFloat(amount) || 0;
  const result = convert(numericAmount, from, to, rates);

  useEffect(() => {
    onResultChange?.(`${formatResult(result)} ${to}`);
  }, [result, to, onResultChange]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchLiveRates()
      .then((live) => {
        setRates(live);
        setLastUpdated(new Date());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSwap = useCallback(() => {
    setFrom((prev) => {
      setTo(prev);
      return to;
    });
  }, [to]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
    }
  }, []);

  const fromCurrency = CURRENCIES.find((c) => c.code === from);
  const toCurrency = CURRENCIES.find((c) => c.code === to);

  return (
    <div
      style={{
        background: 'var(--iron-dark)',
        border: '1px solid var(--iron-gray)',
        padding: '16px',
        fontFamily: 'var(--font-mono)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          \u2550\u2550\u2550 Currency Converter \u2550\u2550\u2550
        </span>
        <RefreshCw
          size={12}
          onClick={handleRefresh}
          style={{
            color: loading ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
            opacity: loading ? 1 : 0.5,
            cursor: 'pointer',
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }}
        />
      </div>

      {/* From row */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          value={amount}
          onChange={handleAmountChange}
          style={{
            flex: 1,
            padding: '8px 10px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-base)',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
            e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--iron-gray)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{
            padding: '8px 10px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '80px',
          }}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code}
            </option>
          ))}
        </select>
      </div>

      {/* Swap button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleSwap}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment-dim)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
            e.currentTarget.style.color = 'var(--cogitator-gold)';
            e.currentTarget.style.boxShadow = 'var(--glow-gold)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--iron-gray)';
            e.currentTarget.style.color = 'var(--parchment-dim)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          title="Swap currencies"
        >
          <ArrowLeftRight size={14} />
        </button>
      </div>

      {/* To row */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div
          style={{
            flex: 1,
            padding: '8px 10px',
            background: 'var(--void-black)',
            border: '1px solid var(--steel-gray)',
            color: 'var(--cogitator-gold)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 'bold',
            minHeight: '36px',
            display: 'flex',
            alignItems: 'center',
            textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
          }}
        >
          {formatResult(result)}
        </div>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{
            padding: '8px 10px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '80px',
          }}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code}
            </option>
          ))}
        </select>
      </div>

      {/* Rate info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--parchment-dim)',
          borderTop: '1px solid var(--iron-gray)',
          paddingTop: '8px',
          marginTop: '4px',
        }}
      >
        <span>
          1 {from} ={' '}
          <span style={{ color: 'var(--noosphere-cyan)' }}>
            {formatResult(rates[to] / rates[from])} {to}
          </span>
        </span>
        <span style={{ opacity: 0.6 }}>
          {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : 'Using fallback rates'}
        </span>
      </div>
    </div>
  );
};

export default CurrencyWidget;
