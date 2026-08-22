// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-FILL SETTINGS — Form Autofill Cogitator
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// Settings panel component — NOT a sidebar tab
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  FormInput,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Globe,
  Plus,
  Trash2,
  Save,
  Check,
  FileText,
  Briefcase,
  Home,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  name: string;
  fields: Record<string, string>;
}

interface FieldDefinition {
  key: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_autofill';

const FIELD_DEFS: FieldDefinition[] = [
  { key: 'fullName', label: 'Full Name', icon: <User size={11} />, placeholder: 'John Doe' },
  { key: 'email', label: 'Email', icon: <Mail size={11} />, placeholder: 'john@example.com' },
  { key: 'phone', label: 'Phone', icon: <Phone size={11} />, placeholder: '+1 234 567 890' },
  { key: 'address', label: 'Address', icon: <MapPin size={11} />, placeholder: '123 Mechanicus St' },
  { key: 'city', label: 'City', icon: <Building2 size={11} />, placeholder: 'Omnissiah Prime' },
  { key: 'country', label: 'Country', icon: <Globe size={11} />, placeholder: 'Imperium' },
  { key: 'zip', label: 'ZIP Code', icon: <FileText size={11} />, placeholder: '00000' },
  { key: 'company', label: 'Company', icon: <Briefcase size={11} />, placeholder: 'Adeptus Mechanicus' },
];

const PROFILE_TEMPLATES = [
  { name: 'Personal', icon: <Home size={12} /> },
  { name: 'Work', icon: <Briefcase size={12} /> },
];

// ── Storage Helpers ──────────────────────────────────────────────────────────

function loadProfiles(): Profile[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveProfiles(profiles: Profile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch { /* ignore */ }
}

function generateId(): string {
  return `af_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AutoFillSettings() {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  // ── Persist ────────────────────────────────────────────────────────────────

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const addProfile = useCallback((name: string) => {
    if (!name.trim()) return;
    const profile: Profile = {
      id: generateId(),
      name: name.trim(),
      fields: {},
    };
    setProfiles((prev) => [...prev, profile]);
    setActiveProfileId(profile.id);
    setNewProfileName('');
    setShowAddForm(false);
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId(null);
    }
  }, [activeProfileId]);

  const updateField = useCallback((profileId: string, fieldKey: string, value: string) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? { ...p, fields: { ...p.fields, [fieldKey]: value } }
          : p
      )
    );
  }, []);

  const handleSave = useCallback(() => {
    saveProfiles(profiles);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(''), 2000);
  }, [profiles]);

  const handleTemplateSelect = useCallback((templateName: string) => {
    addProfile(templateName);
  }, [addProfile]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ═══ Header ═══ */}
      <div className="mech-header">
        <FormInput size={14} style={{ color: 'var(--noosphere-cyan)' }} />
        <span>Autofill Cogitator</span>
      </div>

      {/* ═══ Profile Selector ═══ */}
      <div
        style={{
          padding: '10px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Profiles ({profiles.length})
          </span>
          <button
            onClick={() => setShowAddForm((p) => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'rgba(200, 168, 75, 0.1)',
              border: '1px solid var(--cogitator-gold-dim)',
              color: 'var(--cogitator-gold)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
            }}
          >
            <Plus size={11} />
            New
          </button>
        </div>

        {/* Profile list */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {profiles.map((profile) => (
            <div
              key={profile.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background:
                  activeProfileId === profile.id
                    ? 'rgba(0, 191, 191, 0.15)'
                    : 'var(--void-black)',
                border: `1px solid ${
                  activeProfileId === profile.id
                    ? 'var(--noosphere-cyan)'
                    : 'var(--iron-gray)'
                }`,
                color:
                  activeProfileId === profile.id
                    ? 'var(--noosphere-cyan)'
                    : 'var(--parchment-dim)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
              }}
              onClick={() => setActiveProfileId(profile.id)}
            >
              <User size={10} />
              {profile.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProfile(profile.id);
                }}
                style={{
                  marginLeft: '4px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  background: 'transparent',
                }}
                title="Delete profile"
              >
                <Trash2 size={9} />
              </button>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addProfile(newProfileName);
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => addProfile(newProfileName)}
                disabled={!newProfileName.trim()}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(0, 191, 191, 0.15)',
                  border: '1px solid var(--noosphere-cyan)',
                  color: 'var(--noosphere-cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  cursor: newProfileName.trim() ? 'pointer' : 'not-allowed',
                  opacity: newProfileName.trim() ? 1 : 0.5,
                }}
              >
                Create
              </button>
            </div>

            {/* Quick templates */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {PROFILE_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleTemplateSelect(t.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    cursor: 'pointer',
                  }}
                >
                  {t.icon}
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Profile Fields ═══ */}
      {activeProfile ? (
        <div
          style={{
            padding: '10px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
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
                letterSpacing: '0.1em',
              }}
            >
              {activeProfile.name} Profile
            </span>
            <button
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background:
                  saveStatus === 'saved'
                    ? 'rgba(0, 191, 191, 0.15)'
                    : 'rgba(200, 168, 75, 0.1)',
                border: `1px solid ${
                  saveStatus === 'saved'
                    ? 'var(--noosphere-cyan)'
                    : 'var(--cogitator-gold-dim)'
                }`,
                color:
                  saveStatus === 'saved'
                    ? 'var(--noosphere-cyan)'
                    : 'var(--cogitator-gold)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
              }}
            >
              {saveStatus === 'saved' ? <Check size={11} /> : <Save size={11} />}
              {saveStatus === 'saved' ? 'Saved' : 'Save'}
            </button>
          </div>

          {FIELD_DEFS.map((field) => (
            <div key={field.key}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-muted)',
                  fontSize: 'var(--font-size-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '4px',
                }}
              >
                {field.icon}
                {field.label}
              </label>
              <input
                type="text"
                value={activeProfile.fields[field.key] || ''}
                onChange={(e) => updateField(activeProfile.id, field.key, e.target.value)}
                placeholder={field.placeholder}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                  e.currentTarget.style.boxShadow = '0 0 6px rgba(255, 0, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--iron-gray)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '24px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <FormInput size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <p>Select or create a profile to configure autofill fields.</p>
        </div>
      )}

      {/* ═══ Info ═══ */}
      <div
        style={{
          padding: '8px',
          fontSize: '9px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        The Machine Spirit will detect forms on pages and offer to fill them
        with the selected profile data. Right-click on any form field to access
        the &quot;Fill Form&quot; option.
      </div>
    </div>
  );
}
