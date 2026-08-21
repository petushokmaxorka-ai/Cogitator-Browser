// ═══ LOAN CALCULATOR ═══
// Sacred Lending Engine — calculates tithes and interest for the Machine God's treasury.
// Supports Annuity and Differentiated payment types.

import React, { useState, useCallback, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Percent, Calendar, Table, PieChart } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PaymentRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

type PaymentType = 'annuity' | 'differentiated';
type Currency = 'RUB' | 'USD' | 'EUR';

// ═══════════════════════════════════════════════════════════════════════════════
// Calculation Engine
// ═══════════════════════════════════════════════════════════════════════════════

function calculateAnnuity(amount: number, rate: number, months: number): { monthly: number; total: number; interest: number } {
  const monthlyRate = rate / 100 / 12;
  const payment =
    (amount * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
    (Math.pow(1 + monthlyRate, months) - 1);
  const total = payment * months;
  return { monthly: payment, total, interest: total - amount };
}

function calculateDifferentiated(amount: number, rate: number, months: number): PaymentRow[] {
  const monthlyRate = rate / 100 / 12;
  const principalPerMonth = amount / months;
  const schedule: PaymentRow[] = [];
  let balance = amount;

  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const payment = principalPerMonth + interest;
    balance -= principalPerMonth;
    schedule.push({
      month: i,
      payment,
      principal: principalPerMonth,
      interest,
      balance: Math.max(0, balance),
    });
  }
  return schedule;
}

function generateAnnuitySchedule(amount: number, rate: number, months: number): PaymentRow[] {
  const monthlyRate = rate / 100 / 12;
  const payment =
    (amount * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
    (Math.pow(1 + monthlyRate, months) - 1);
  const schedule: PaymentRow[] = [];
  let balance = amount;

  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const principal = payment - interest;
    balance -= principal;
    schedule.push({
      month: i,
      payment,
      principal,
      interest,
      balance: Math.max(0, balance),
    });
  }
  return schedule;
}

function formatCurrency(value: number, currency: Currency): string {
  const symbols: Record<Currency, string> = { RUB: '\u20BD', USD: '$', EUR: '\u20AC' };
  return `${symbols[currency]} ${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

const LoanCalculator: React.FC = () => {
  const [amount, setAmount] = useState<string>('1000000');
  const [rate, setRate] = useState<string>('12');
  const [term, setTerm] = useState<string>('12');
  const [termType, setTermType] = useState<'months' | 'years'>('months');
  const [paymentType, setPaymentType] = useState<PaymentType>('annuity');
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [showSchedule, setShowSchedule] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const numericRate = parseFloat(rate) || 0;
  const numericTerm = parseInt(term) || 0;
  const months = termType === 'years' ? numericTerm * 12 : numericTerm;

  // ── Calculations ──────────────────────────────────────────

  const { monthly, total, interest } = useMemo(() => {
    if (numericAmount <= 0 || numericRate <= 0 || months <= 0) {
      return { monthly: 0, total: 0, interest: 0 };
    }
    if (paymentType === 'annuity') {
      return calculateAnnuity(numericAmount, numericRate, months);
    }
    // For differentiated, first payment is the highest
    const schedule = calculateDifferentiated(numericAmount, numericRate, months);
    const firstPayment = schedule[0]?.payment || 0;
    const totalPaid = schedule.reduce((s, r) => s + r.payment, 0);
    return { monthly: firstPayment, total: totalPaid, interest: totalPaid - numericAmount };
  }, [numericAmount, numericRate, months, paymentType]);

  const schedule = useMemo(() => {
    if (numericAmount <= 0 || numericRate <= 0 || months <= 0) return [];
    if (paymentType === 'annuity') {
      return generateAnnuitySchedule(numericAmount, numericRate, months);
    }
    return calculateDifferentiated(numericAmount, numericRate, months);
  }, [numericAmount, numericRate, months, paymentType]);

  const overpaymentPercent = numericAmount > 0 ? ((interest / numericAmount) * 100).toFixed(1) : '0';

  // ── Chart Data ────────────────────────────────────────────

  const chartBars = useMemo(() => {
    if (schedule.length === 0) return [];
    const step = Math.max(1, Math.floor(schedule.length / 20));
    return schedule.filter((_, i) => i % step === 0);
  }, [schedule]);

  const maxPayment = useMemo(() => {
    if (schedule.length === 0) return 1;
    return Math.max(...schedule.map((s) => s.payment));
  }, [schedule]);

  // ── Handlers ──────────────────────────────────────────────

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*$/.test(val)) setAmount(val);
  }, []);

  const handleRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) setRate(val);
  }, []);

  const handleTermChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*$/.test(val)) setTerm(val);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
          }}
        >
          <Calculator size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          ═══ Loan Calculator ═══
        </div>
        <div style={{ color: 'var(--parchment-dim)', fontSize: '10px', marginTop: '2px' }}>
          SACRED LENDING & TITHE COMPUTATION ENGINE
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Currency */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['RUB', 'USD', 'EUR'] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              style={{
                flex: 1,
                padding: '6px',
                background: currency === c ? 'rgba(200, 168, 75, 0.1)' : 'transparent',
                border: currency === c ? '1px solid var(--cogitator-gold)' : '1px solid var(--iron-gray)',
                color: currency === c ? 'var(--cogitator-gold)' : 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {c === 'RUB' ? '\u20BD' : c === 'USD' ? '$' : '\u20AC'} {c}
            </button>
          ))}
        </div>

        {/* Loan Amount */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <DollarSign size={10} /> Loan Amount
          </label>
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            style={{
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
        </div>

        {/* Interest Rate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Percent size={10} /> Interest Rate (% per year)
          </label>
          <input
            type="text"
            value={rate}
            onChange={handleRateChange}
            style={{
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
        </div>

        {/* Term */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={10} /> Term
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={term}
              onChange={handleTermChange}
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
            <div style={{ display: 'flex', gap: '2px' }}>
              {(['months', 'years'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTermType(t)}
                  style={{
                    padding: '6px 10px',
                    background: termType === t ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
                    border: termType === t ? '1px solid var(--omnissiah-red)' : '1px solid var(--iron-gray)',
                    color: termType === t ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Payment Type
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {([
              { value: 'annuity' as const, label: 'ANNUITY' },
              { value: 'differentiated' as const, label: 'DIFFERENTIATED' },
            ]).map((t) => (
              <button
                key={t.value}
                onClick={() => setPaymentType(t.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: paymentType === t.value ? 'rgba(0, 191, 191, 0.1)' : 'transparent',
                  border: paymentType === t.value ? '1px solid var(--noosphere-cyan)' : '1px solid var(--iron-gray)',
                  color: paymentType === t.value ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {numericAmount > 0 && numericRate > 0 && months > 0 && (
          <>
            {/* Summary */}
            <div
              style={{
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  color: 'var(--cogitator-gold)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  borderBottom: '1px solid var(--iron-gray)',
                  paddingBottom: '4px',
                }}
              >
                <TrendingUp size={10} style={{ display: 'inline', marginRight: '4px' }} />
                Loan Summary
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>
                    {paymentType === 'differentiated' ? 'First Payment' : 'Monthly Payment'}
                  </div>
                  <div style={{ fontSize: '18px', color: 'var(--omnissiah-red)', fontWeight: 'bold', textShadow: '0 0 8px rgba(255, 0, 0, 0.3)' }}>
                    {formatCurrency(monthly, currency)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>
                    Total Payment
                  </div>
                  <div style={{ fontSize: '16px', color: 'var(--cogitator-gold)', fontWeight: 'bold' }}>
                    {formatCurrency(total, currency)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>
                    Total Interest
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--noosphere-cyan)' }}>
                    {formatCurrency(interest, currency)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>
                    Overpayment
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--parchment)' }}>
                    {overpaymentPercent}%
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Chart */}
            <div
              style={{
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                padding: '12px',
              }}
            >
              <div
                style={{
                  color: 'var(--cogitator-gold)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginBottom: '8px',
                }}
              >
                <PieChart size={10} style={{ display: 'inline', marginRight: '4px' }} />
                Payment Breakdown
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '20px' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(numericAmount / total) * 100}%`,
                    background: 'var(--noosphere-cyan)',
                    minWidth: '4px',
                  }}
                  title={`Principal: ${formatCurrency(numericAmount, currency)}`}
                />
                <div
                  style={{
                    height: '100%',
                    width: `${(interest / total) * 100}%`,
                    background: 'var(--omnissiah-red)',
                    minWidth: '4px',
                  }}
                  title={`Interest: ${formatCurrency(interest, currency)}`}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '10px' }}>
                <span style={{ color: 'var(--noosphere-cyan)' }}>■ Principal {((numericAmount / total) * 100).toFixed(1)}%</span>
                <span style={{ color: 'var(--omnissiah-red)' }}>■ Interest {((interest / total) * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Payment Trend Mini Chart */}
            <div
              style={{
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                padding: '12px',
              }}
            >
              <div
                style={{
                  color: 'var(--cogitator-gold)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginBottom: '8px',
                }}
              >
                <TrendingUp size={10} style={{ display: 'inline', marginRight: '4px' }} />
                Payment Trend ({schedule.length} months)
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1px', height: '60px' }}>
                {chartBars.map((row) => (
                  <div
                    key={row.month}
                    style={{
                      flex: 1,
                      height: `${(row.payment / maxPayment) * 100}%`,
                      background: 'var(--omnissiah-red)',
                      opacity: 0.7,
                      minHeight: '2px',
                    }}
                    title={`Month ${row.month}: ${formatCurrency(row.payment, currency)}`}
                  />
                ))}
              </div>
            </div>

            {/* Schedule Toggle */}
            <button
              onClick={() => setShowSchedule((prev) => !prev)}
              style={{
                padding: '8px',
                background: showSchedule ? 'rgba(200, 168, 75, 0.1)' : 'transparent',
                border: '1px solid var(--cogitator-gold)',
                color: 'var(--cogitator-gold)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Table size={12} />
              {showSchedule ? 'HIDE SCHEDULE' : 'SHOW SCHEDULE'}
            </button>

            {/* Payment Schedule Table */}
            {showSchedule && (
              <div
                style={{
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--iron-dark)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid var(--iron-gray)' }}>
                      <th style={{ padding: '6px', textAlign: 'left', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>#</th>
                      <th style={{ padding: '6px', textAlign: 'right', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payment</th>
                      <th style={{ padding: '6px', textAlign: 'right', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Principal</th>
                      <th style={{ padding: '6px', textAlign: 'right', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Interest</th>
                      <th style={{ padding: '6px', textAlign: 'right', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr
                        key={row.month}
                        style={{ borderBottom: '1px solid rgba(42,42,42,0.5)' }}
                      >
                        <td style={{ padding: '4px 6px', color: 'var(--parchment-dim)' }}>{row.month}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: 'var(--omnissiah-red)' }}>
                          {formatCurrency(row.payment, currency).split(' ')[1]}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: 'var(--noosphere-cyan)' }}>
                          {formatCurrency(row.principal, currency).split(' ')[1]}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: 'var(--cogitator-gold)' }}>
                          {formatCurrency(row.interest, currency).split(' ')[1]}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: 'var(--sacred-white)' }}>
                          {formatCurrency(row.balance, currency).split(' ')[1]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoanCalculator;
