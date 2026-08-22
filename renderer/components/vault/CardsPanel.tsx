// ═══ PAYMENT SIGIL — CARDS PANEL ═══
// Secure vault for storing payment card data.
// Encrypted storage through the vault-crypto sanctum.

import { useState, useCallback, useEffect } from 'react';
import {
  CreditCard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  X,
  Check,
  Hash,
  Calendar,
  Shield,
  User,
  FileText,
  Sparkles,
} from 'lucide-react';
import { type CardEntry, type CardType } from '../../../shared/types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ScrollArea from '../ui/ScrollArea';

// ── Types ───────────────────────────────────────────────────

interface CardsPanelProps {
  activeTabUrl?: string;
}

interface VaultState {
  isLocked: boolean;
  password: string;
  error: string | null;
}

// ── Card Type Detection ─────────────────────────────────────

function detectCardType(number: string): CardType {
  const clean = number.replace(/\s/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^5[1-5]/.test(clean)) return 'mastercard';
  if (/^3[47]/.test(clean)) return 'amex';
  return 'unknown';
}

function formatCardNumber(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 16);
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join(' ') : clean;
}

function maskCardNumber(number: string): string {
  const clean = number.replace(/\s/g, '');
  if (clean.length <= 4) return clean;
  return '**** **** **** ' + clean.slice(-4);
}

function getCardIcon(cardType: CardType) {
  switch (cardType) {
    case 'visa':
      return (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#1A1F71',
            background: '#fff',
            padding: '1px 4px',
            borderRadius: '2px',
            letterSpacing: '0.05em',
          }}
        >
          VISA
        </span>
      );
    case 'mastercard':
      return (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#EB001B',
            background: '#fff',
            padding: '1px 4px',
            borderRadius: '2px',
            letterSpacing: '0.05em',
          }}
        >
          MC
        </span>
      );
    case 'amex':
      return (
        <span
          style={{
            fontSize: '9px',
            fontWeight: 'bold',
            color: '#006FCF',
            background: '#fff',
            padding: '1px 4px',
            borderRadius: '2px',
            letterSpacing: '0.05em',
          }}
        >
          AMEX
        </span>
      );
    default:
      return (
        <span
          style={{
            fontSize: '9px',
            fontWeight: 'bold',
            color: 'var(--iron-gray)',
            background: 'var(--steel-gray)',
            padding: '1px 4px',
            borderRadius: '2px',
          }}
        >
          ???
        </span>
      );
  }
}

// ── LocalStorage Keys ───────────────────────────────────────

const VAULT_PASSWORD_KEY = 'cogitator_vault_pw_hash';
const CARDS_STORAGE_KEY = 'cogitator_vault_cards';

// ── Simple hash for demo (in production use bcrypt/argon2) ──

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function encryptCards(cards: CardEntry[], password: string): string {
  const data = JSON.stringify(cards);
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(
      data.charCodeAt(i) ^ password.charCodeAt(i % password.length)
    );
  }
  return btoa(encrypted);
}

function decryptCards(encrypted: string, password: string): CardEntry[] {
  try {
    const data = atob(encrypted);
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(
        data.charCodeAt(i) ^ password.charCodeAt(i % password.length)
      );
    }
    return JSON.parse(decrypted) as CardEntry[];
  } catch {
    return [];
  }
}

// ── Component ───────────────────────────────────────────────

export default function CardsPanel({ activeTabUrl }: CardsPanelProps) {
  // ── State ─────────────────────────────────────────────────
  const [vault, setVault] = useState<VaultState>({
    isLocked: true,
    password: '',
    error: null,
  });
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showCvv, setShowCvv] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state
  const [formNumber, setFormNumber] = useState('');
  const [formHolder, setFormHolder] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formCvv, setFormCvv] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // ── Load cards on unlock ──────────────────────────────────
  useEffect(() => {
    if (!vault.isLocked && vault.password) {
      const stored = localStorage.getItem(CARDS_STORAGE_KEY);
      if (stored) {
        const decrypted = decryptCards(stored, vault.password);
        setCards(decrypted);
      }
    }
  }, [vault.isLocked, vault.password]);

  // ── Handlers ──────────────────────────────────────────────

  const handleUnlock = useCallback(() => {
    if (!vault.password) {
      setVault((prev) => ({ ...prev, error: 'Enter the sanctum passphrase...' }));
      return;
    }
    const hash = simpleHash(vault.password);
    const storedHash = localStorage.getItem(VAULT_PASSWORD_KEY);

    if (storedHash && storedHash !== hash) {
      setVault((prev) => ({ ...prev, error: 'INCORRECT PASSPHRASE' }));
      return;
    }

    if (!storedHash) {
      // First time — set password
      localStorage.setItem(VAULT_PASSWORD_KEY, hash);
    }

    setVault((prev) => ({ ...prev, isLocked: false, error: null }));
  }, [vault.password]);

  const handleLock = useCallback(() => {
    setVault({ isLocked: true, password: '', error: null });
    setCards([]);
    setExpandedCardId(null);
    setShowCvv(null);
    setShowAddForm(false);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setVault((prev) => ({ ...prev, password: value, error: null }));
  }, []);

  const saveCards = useCallback(
    (newCards: CardEntry[]) => {
      setCards(newCards);
      if (vault.password) {
        const encrypted = encryptCards(newCards, vault.password);
        localStorage.setItem(CARDS_STORAGE_KEY, encrypted);
      }
    },
    [vault.password]
  );

  const handleAddCard = useCallback(() => {
    const cleanNumber = formNumber.replace(/\s/g, '');
    if (cleanNumber.length < 13) {
      return;
    }
    if (!formHolder.trim()) {
      return;
    }

    const cardType = detectCardType(cleanNumber);
    const newCard: CardEntry = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      cardNumber: formNumber,
      cardHolder: formHolder.trim().toUpperCase(),
      expiryDate: formExpiry,
      cvv: formCvv,
      cardType,
      notes: formNotes,
      createdAt: Date.now(),
    };

    const updated = [...cards, newCard];
    saveCards(updated);

    // Reset form
    setFormNumber('');
    setFormHolder('');
    setFormExpiry('');
    setFormCvv('');
    setFormNotes('');
    setShowAddForm(false);
  }, [formNumber, formHolder, formExpiry, formCvv, formNotes, cards, saveCards]);

  const handleDeleteCard = useCallback(
    (id: string) => {
      const updated = cards.filter((c) => c.id !== id);
      saveCards(updated);
      if (expandedCardId === id) setExpandedCardId(null);
    },
    [cards, expandedCardId, saveCards]
  );

  const handleCopy = useCallback(
    (text: string, field: string) => {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    },
    []
  );

  const handleNumberInput = useCallback((value: string) => {
    const formatted = formatCardNumber(value);
    setFormNumber(formatted);
  }, []);

  const handleExpiryInput = useCallback((value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 2) {
      setFormExpiry(clean.slice(0, 2) + '/' + clean.slice(2));
    } else {
      setFormExpiry(clean);
    }
  }, []);

  const handleCvvInput = useCallback((value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    setFormCvv(clean);
  }, []);

  // ── Payment Form Detection ────────────────────────────────

  const handleDetectPaymentForm = useCallback(() => {
    // In a real implementation, this would use IPC to execute JS in the webview
    // to detect payment form fields and auto-fill them.
    // For now, we show a placeholder notification.
    alert(
      '[Payment Sigil] Detect payment form on: ' +
        (activeTabUrl || 'current page') +
        '\n\nTo auto-fill: select a card and click FILL.'
    );
  }, [activeTabUrl]);

  // ── Render: Locked State ──────────────────────────────────

  if (vault.isLocked) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px',
          gap: '16px',
        }}
      >
        <Lock
          size={48}
          strokeWidth={1}
          style={{ color: 'var(--omnissiah-red)', opacity: 0.5 }}
        />
        <div
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: '14px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          VAULT SEALED
        </div>
        <div
          style={{
            color: 'var(--parchment-dim)',
            fontSize: '10px',
            textAlign: 'center',
            maxWidth: '200px',
          }}
        >
          Enter the sacred passphrase to access the Payment Sigils
        </div>
        <input
          type="password"
          placeholder="Sanctum passphrase..."
          value={vault.password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          style={{
            width: '100%',
            maxWidth: '200px',
            padding: '8px 12px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
            e.currentTarget.style.boxShadow =
              '0 0 8px rgba(255,0,0,0.3), inset 0 0 4px rgba(255,0,0,0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--iron-gray)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {vault.error && (
          <div
            style={{
              color: 'var(--omnissiah-red)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {vault.error}
          </div>
        )}
        <Button variant="primary" size="md" onClick={handleUnlock}>
          <Unlock size={14} strokeWidth={1.5} />
          UNLOCK
        </Button>
      </div>
    );
  }

  // ── Render: Unlocked State ────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard
            size={14}
            strokeWidth={1.5}
            style={{ color: 'var(--cogitator-gold)' }}
          />
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            Payment Sigils ({cards.length})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleDetectPaymentForm}
            title="Detect payment form"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid var(--noosphere-cyan)',
              color: 'var(--noosphere-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0,191,191,0.1)';
              e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Sparkles size={10} />
            DETECT
          </button>
          <button
            onClick={handleLock}
            title="Lock vault"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.color = 'var(--omnissiah-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment-dim)';
            }}
          >
            <Lock size={12} />
          </button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div style={{ padding: '8px' }}>
          {/* Card List */}
          {cards.length === 0 && !showAddForm && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 16px',
                gap: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <CreditCard size={32} strokeWidth={1} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: '11px', textAlign: 'center' }}>
                No payment sigils stored.
                <br />
                Add your first card to begin.
              </div>
            </div>
          )}

          {cards.map((card) => {
            const isExpanded = expandedCardId === card.id;
            const isCvvVisible = showCvv === card.id;

            return (
              <div
                key={card.id}
                style={{
                  marginBottom: '6px',
                  border: '1px solid var(--iron-gray)',
                  background: isExpanded
                    ? 'rgba(200,168,75,0.05)'
                    : 'var(--iron-dark)',
                  transition: 'all 150ms ease',
                }}
              >
                {/* Card Summary */}
                <div
                  onClick={() =>
                    setExpandedCardId(isExpanded ? null : card.id)
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {getCardIcon(card.cardType)}
                  <span
                    style={{
                      color: 'var(--sacred-white)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      letterSpacing: '0.08em',
                      flex: 1,
                    }}
                  >
                    {maskCardNumber(card.cardNumber)}
                  </span>
                  <span
                    style={{
                      color: 'var(--parchment-dim)',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {card.cardHolder}
                  </span>
                  <span
                    style={{
                      color: 'var(--parchment-dim)',
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {card.expiryDate}
                  </span>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderTop: '1px solid var(--iron-gray)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* Full card number */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--sacred-white)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {card.cardNumber}
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(
                            card.cardNumber.replace(/\s/g, ''),
                            `num_${card.id}`
                          )
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          background: 'transparent',
                          border: '1px solid var(--iron-gray)',
                          color: 'var(--parchment-dim)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            'var(--cogitator-gold)';
                          e.currentTarget.style.color = 'var(--cogitator-gold)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--iron-gray)';
                          e.currentTarget.style.color = 'var(--parchment-dim)';
                        }}
                      >
                        {copiedField === `num_${card.id}` ? (
                          <Check size={10} />
                        ) : (
                          <Copy size={10} />
                        )}
                        {copiedField === `num_${card.id}`
                          ? 'COPIED'
                          : 'COPY'}
                      </button>
                    </div>

                    {/* Holder & Expiry */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '2px',
                          }}
                        >
                          Holder
                        </div>
                        <div
                          style={{
                            color: 'var(--parchment)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                          }}
                        >
                          {card.cardHolder}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '2px',
                          }}
                        >
                          Expiry
                        </div>
                        <div
                          style={{
                            color: 'var(--parchment)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                          }}
                        >
                          {card.expiryDate}
                        </div>
                      </div>
                    </div>

                    {/* CVV */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                          }}
                        >
                          CVV
                        </span>
                        <span
                          style={{
                            color: 'var(--sacred-white)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            letterSpacing: '0.15em',
                          }}
                        >
                          {isCvvVisible ? card.cvv : '***'}
                        </span>
                        <button
                          onClick={() =>
                            setShowCvv(isCvvVisible ? null : card.id)
                          }
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--parchment-dim)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {isCvvVisible ? (
                            <EyeOff size={12} />
                          ) : (
                            <Eye size={12} />
                          )}
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleCopy(card.cvv, `cvv_${card.id}`)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            background: 'transparent',
                            border: '1px solid var(--iron-gray)',
                            color: 'var(--parchment-dim)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--cogitator-gold)';
                            e.currentTarget.style.color =
                              'var(--cogitator-gold)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--iron-gray)';
                            e.currentTarget.style.color = 'var(--parchment-dim)';
                          }}
                        >
                          {copiedField === `cvv_${card.id}` ? (
                            <Check size={10} />
                          ) : (
                            <Copy size={10} />
                          )}
                          {copiedField === `cvv_${card.id}` ? 'COPIED' : 'CVV'}
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            background: 'transparent',
                            border: '1px solid var(--iron-gray)',
                            color: 'var(--parchment-dim)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--omnissiah-red)';
                            e.currentTarget.style.color = 'var(--omnissiah-red)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--iron-gray)';
                            e.currentTarget.style.color = 'var(--parchment-dim)';
                          }}
                        >
                          <Trash2 size={10} />
                          DELETE
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    {card.notes && (
                      <div
                        style={{
                          color: 'var(--parchment-dim)',
                          fontSize: '9px',
                          fontStyle: 'italic',
                          borderTop: '1px solid var(--iron-gray)',
                          paddingTop: '6px',
                        }}
                      >
                        {card.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Card Form */}
          {showAddForm && (
            <div
              style={{
                border: '1px solid var(--cogitator-gold)',
                background: 'rgba(200,168,75,0.03)',
                padding: '12px',
                marginTop: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <span
                  style={{
                    color: 'var(--cogitator-gold)',
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 'bold',
                  }}
                >
                  Inscribe New Sigil
                </span>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--parchment-dim)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Card Number */}
                <div>
                  <label
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Card Number
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Hash
                      size={12}
                      style={{
                        color: 'var(--cogitator-gold)',
                        flexShrink: 0,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      value={formNumber}
                      onChange={(e) => handleNumberInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        background: 'var(--void-black)',
                        border: '1px solid var(--iron-gray)',
                        color: 'var(--sacred-white)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        letterSpacing: '0.1em',
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--iron-gray)';
                      }}
                    />
                    {formNumber && (
                      <span style={{ flexShrink: 0 }}>
                        {getCardIcon(detectCardType(formNumber))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Holder */}
                <div>
                  <label
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Card Holder
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User
                      size={12}
                      style={{ color: 'var(--cogitator-gold)', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      placeholder="NAME AS ON CARD"
                      value={formHolder}
                      onChange={(e) => setFormHolder(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        background: 'var(--void-black)',
                        border: '1px solid var(--iron-gray)',
                        color: 'var(--sacred-white)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--iron-gray)';
                      }}
                    />
                  </div>
                </div>

                {/* Expiry & CVV */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Expiry (MM/YY)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar
                        size={12}
                        style={{ color: 'var(--cogitator-gold)', flexShrink: 0 }}
                      />
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={formExpiry}
                        onChange={(e) => handleExpiryInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: 'var(--void-black)',
                          border: '1px solid var(--iron-gray)',
                          color: 'var(--sacred-white)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          outline: 'none',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--iron-gray)';
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      CVV
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield
                        size={12}
                        style={{ color: 'var(--omnissiah-red)', flexShrink: 0 }}
                      />
                      <input
                        type="password"
                        placeholder="***"
                        value={formCvv}
                        onChange={(e) => handleCvvInput(e.target.value)}
                        maxLength={4}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: 'var(--void-black)',
                          border: '1px solid var(--iron-gray)',
                          color: 'var(--sacred-white)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          outline: 'none',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--iron-gray)';
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Notes
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText
                      size={12}
                      style={{ color: 'var(--cogitator-gold)', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        background: 'var(--void-black)',
                        border: '1px solid var(--iron-gray)',
                        color: 'var(--sacred-white)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--iron-gray)';
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '4px',
                  }}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddCard}
                    disabled={
                      formNumber.replace(/\s/g, '').length < 13 ||
                      !formHolder.trim()
                    }
                    style={{ flex: 1 }}
                  >
                    <Check size={12} />
                    SAVE
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                    style={{ flex: 1 }}
                  >
                    <X size={12} />
                    CANCEL
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── Add Card Button (footer) ────────────────────────── */}
      {!showAddForm && (
        <div
          style={{
            padding: '8px',
            borderTop: '1px solid var(--iron-gray)',
            flexShrink: 0,
          }}
        >
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowAddForm(true)}
            style={{ width: '100%' }}
          >
            <Plus size={14} />
            ADD CARD
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════════════════════

export { detectCardType, formatCardNumber, maskCardNumber };
