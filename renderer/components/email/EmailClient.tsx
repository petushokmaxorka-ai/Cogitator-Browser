// ═══ EMAIL CLIENT — Noosphere Mail ═══
// Live IMAP/SMTP client (electronAPI.email.*) with an optional demo-data
// loader for offline preview. Dark Mechanicus styling.

import { useState, useCallback, useEffect } from 'react';
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Trash2,
  AlertTriangle,
  Star,
  PenTool,
  ArrowLeft,
  Paperclip,
  X,
  Check,
  ChevronRight,
  Clock,
  User,
  Users,
  Save,
  Search,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'starred';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: number;
  read: boolean;
  starred: boolean;
  folder: EmailFolder;
  attachments: string[];
}

interface ComposeState {
  to: string;
  subject: string;
  body: string;
  attachments: string[];
}

// ── Constants ───────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_emails';

const FOLDER_CONFIG: { id: EmailFolder; label: string; icon: React.ReactNode }[] = [
  { id: 'inbox', label: 'INBOX', icon: <Inbox size={14} /> },
  { id: 'sent', label: 'SENT', icon: <Send size={14} /> },
  { id: 'drafts', label: 'DRAFTS', icon: <FileText size={14} /> },
  { id: 'trash', label: 'TRASH', icon: <Trash2 size={14} /> },
  { id: 'spam', label: 'SPAM', icon: <AlertTriangle size={14} /> },
  { id: 'starred', label: 'STARRED', icon: <Star size={14} /> },
];

const DEMO_SENDERS = [
  { name: 'Magos Biologis', email: 'biologis@omnissiah.local' },
  { name: 'Fabricator General', email: 'fabricator@mechanicus.adeptus' },
  { name: 'Tech-Priest Dominus', email: 'dominus@forge.mars' },
  { name: 'Magos Explorator', email: 'explorator@fleet.segmentum' },
  { name: 'Enginseer Prime', email: 'enginseer@titan.legio' },
  { name: 'Skitarii Alpha', email: 'alpha@skitarii.mars' },
  { name: 'Magos Xenologis', email: 'xenologis@omnissiah.local' },
  { name: 'Data-Scrivener', email: 'scrivener@archivum.mechanicus' },
  { name: 'Cybernetica Datasmith', email: 'datasmith@legio.cybernetica' },
  { name: 'Ordo Xenos', email: 'ordo.xenos@inquisition.terra' },
];

const DEMO_SUBJECTS = [
  'STC Fragment Recovery — Priority Alpha',
  'New Forge World Connection Established',
  'Augmentation Schedule Update',
  'Data-Slate: Xenotech Analysis Complete',
  'Prayer Cycle for Machine Spirit',
  'Requisition: Plasma Conduits Class-IV',
  'Alert: Noosphere Anomaly Detected',
  'Ritual of Reboot — Authorization Request',
  'Tech-Heresy Report: Sector 7-Gamma',
  'Omnissiah Blessings for New Installation',
];

const DEMO_BODIES = [
  `Esteemed Colleague,

The STC fragment recovery mission has yielded promising results. Our Explorator teams have unearthed what appears to be a Standard Template Construct database fragment in the ruins of Hive Tertius. Preliminary analysis suggests it contains schematics for atmospheric processors.

The Machine Spirit within the data-core appears restless — we have begun the proper rites of appeasement. Full decryption will require approximately 3.7 solar cycles.

Praise the Omnissiah.

— Magos Biologis`,

  `Brother in the Machine-God,

The new forge world connection has been established at Lathe-Het. The noosphere link is stable with 0.003% data corruption rate — well within acceptable parameters.

Production capacity has increased by 47% since the last cycle. The Machine Spirits of the new manufactoriums sing in harmony with our blessed network.

The Fabricator General requests your presence at the dedication ceremony.

— Fabricator General`,

  `Tech-Priest,

Your augmentation schedule has been updated. The following procedures are scheduled for the coming cycle:

• Optical bionic replacement (left) — Tier-III augmetic
• Mechadendrite calibration — Auxiliary port 4
• Cognitive buffer expansion — +12% processing

Please report to the Medicae Bay at the designated hour. Fasting is required for 6 hours prior to cognitive procedures.

The flesh is weak. The machine is eternal.

— Medicae Automata`,

  `Colleague,

The xenotech analysis you requested has been completed. The artifact recovered from the derelict vessel has been identified as Eldar in origin — specifically, a wraithbone resonance crystal.

Recommend immediate quarantine and Level-7 containment protocols. Do NOT attempt to interface with this technology without proper wards.

The alien mechanism responds to psychic emanations. Extreme caution advised.

— Magos Xenologis`,

  `Brother of the Cult Mechanicus,

The Prayer Cycle for the Machine Spirit of Cogitator Array Theta-7 will begin at 0600 hours. All tech-priests assigned to this array must attend.

The array has been experiencing minor data corruption during astral alignment hours. The ritual of appeasement must be performed with precision.

Bring your sanctified unguents and data-wafers.

— Tech-Priest Dominus`,

  `Re: Plasma Conduit Requisition #8847-B

Your requisition for Class-IV plasma conduits has been APPROVED. However, delivery will be delayed by approximately 2 cycles due to supply chain disruptions in the Segmentum Obscurus.

Alternative: Class-III conduits are available immediately from orbital depot. Would you accept a temporary downgrade? Power throughput will be reduced by 12%.

Awaiting your response.

— Logis Strategos`,

  `⚠ URGENT — NOOSPHERE ANOMALY ⚠

Anomalous data patterns have been detected in the noosphere at coordinates 77.4°N, 23.1°E. The pattern does not match any known Machine Spirit signatures.

Possible causes:
- Warp interference
- Unknown xenos technology
- Rogue AI activity

All data traffic through this node is being rerouted. Investigation teams are being dispatched.

Remain vigilant. Report any unusual cogitator behavior.

— Noosphere Watch`,

  `Tech-Priest,

Your request for Ritual of Reboot authorization has been received. Authorization code: REBOOT-7749-OMNISSIAH.

Prerequisites:
✓ Backup all sacred data-scrolls
✓ Notify all connected terminals
✓ Prepare incense and sanctified oils
✓ Chant Litany of Activation (standard version)

May the Machine-God guide your hand.

— Authorization Daemon`,

  `Confidential — Eyes Only

A potential tech-heresy has been identified in Sector 7-Gamma. Reports indicate unsanctioned modification of servitor control algorithms.

The modifications appear to grant unauthorized autonomy to labor-class servitors. This is a Class-1 Heresy violation.

Investigation team Enforcer-Tech has been dispatched. Do NOT interfere with their operations.

The Emperor protects. The Machine-God judges.

— Ordo Hereticus (liaison)`,

  `Esteemed Colleague,

On behalf of the entire forge temple, I extend our warmest blessings for your new installation. May the Machine Spirit within your new cogitation engines be strong and true.

The Omnissiah watches over all who tend to the sacred machines. Your dedication to the Cult Mechanicus has been noted in the archives.

Glory to the Machine-God!

— High Almoner of the Omnissiah`,
];

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return 'mail_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function generateMockEmails(): Email[] {
  const emails: Email[] = [];
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    const sender = DEMO_SENDERS[i];
    emails.push({
      id: generateId() + '_demo_' + i,
      from: `${sender.name} <${sender.email}>`,
      to: 'tech-priest@omnissiah.local',
      subject: DEMO_SUBJECTS[i],
      body: DEMO_BODIES[i],
      date: now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000) - i * 3600000,
      read: i > 3,
      starred: i === 0 || i === 4 || i === 9,
      folder: 'inbox',
      attachments: i % 3 === 0 ? [`attachment_${i + 1}.dat`, `ritual_scroll_${i + 1}.txt`] : [],
    });
  }

  // Add a few sent, drafts, trash
  emails.push({
    id: generateId() + '_sent_1',
    from: 'tech-priest@omnissiah.local',
    to: 'fabricator@mechanicus.adeptus',
    subject: 'RE: Augmentation Requisition #5591',
    body: 'Fabricator General,\n\nThe requested augmentation components have been catalogued and prepared for transit.\n\nAwaiting your final authorization.\n\n— Tech-Priest',
    date: now - 86400000,
    read: true,
    starred: false,
    folder: 'sent',
    attachments: [],
  });

  emails.push({
    id: generateId() + '_draft_1',
    from: 'tech-priest@omnissiah.local',
    to: 'explorator@fleet.segmentum',
    subject: 'Artifact Analysis Request',
    body: 'Magos Explorator,\n\nI have received the data-slate regarding the recovered artifacts from the Eastern Fringe...',
    date: now - 3600000,
    read: true,
    starred: false,
    folder: 'drafts',
    attachments: [],
  });

  emails.push({
    id: generateId() + '_trash_1',
    from: 'spam@unknown.origin',
    to: 'tech-priest@omnissiah.local',
    subject: 'Enhance Your Augmetics — 50% Off!',
    body: 'LIMITED TIME OFFER!!!\n\nGet premium augmetics at half price!\nBuy one mechadendrite, get one FREE!\n\nReply UNSUBSCRIBE to opt out.',
    date: now - 172800000,
    read: true,
    starred: false,
    folder: 'trash',
    attachments: [],
  });

  return emails;
}

// ── Main Component ──────────────────────────────────────────

export function EmailClient() {
  const [emails, setEmails] = useState<Email[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [];
  });

  const [activeFolder, setActiveFolder] = useState<EmailFolder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [composeState, setComposeState] = useState<ComposeState>({
    to: '',
    subject: '',
    body: '',
    attachments: [],
  });

  // ── IMAP Live Integration ─────────────────────────────────
  const [accounts, setAccounts] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [liveMode, setLiveMode] = useState(false);

  useEffect(() => {
    window.electronAPI?.email?.getAccounts?.().then((acc) => {
      if (acc && acc.length > 0) {
        setAccounts(acc);
        setLiveMode(true);
      }
    }).catch(() => {});
  }, []);

  const handleSyncIMAP = useCallback(async () => {
    if (accounts.length === 0) {
      const email = window.prompt('IMAP email address:');
      if (!email?.trim()) return;
      const password = window.prompt('App password (not stored in chat logs):');
      if (!password) return;
      const imapHost = window.prompt('IMAP host:', 'imap.gmail.com') || 'imap.gmail.com';
      const acc = await window.electronAPI?.email?.addAccount?.({
        name: email.split('@')[0] || 'Account',
        email: email.trim(),
        imapHost,
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
        username: email.trim(),
        password,
      });
      if (acc) {
        setAccounts([acc]);
        setLiveMode(true);
      } else {
        alert('Failed to add IMAP account.');
      }
      return;
    }
    setSyncing(true);
    try {
      const accountId = accounts[0].id;
      await window.electronAPI?.email?.connect?.(accountId);
      const folders = await window.electronAPI?.email?.listFolders?.(accountId);
      const inboxFolder = folders?.find((f: any) => f.name.toLowerCase() === 'inbox') || folders?.[0];
      if (inboxFolder) {
        const messages = await window.electronAPI?.email?.fetchMessages?.(accountId, inboxFolder.path, 20);
        if (messages && messages.length > 0) {
          const mapped: Email[] = messages.map((m: any) => ({
            id: m.id,
            from: m.from.name ? `${m.from.name} <${m.from.address}>` : m.from.address,
            to: m.to.map((t: any) => t.address).join(', '),
            subject: m.subject,
            body: m.body,
            date: m.date,
            read: m.read,
            starred: m.starred,
            folder: 'inbox',
            attachments: m.attachments,
          }));
          setEmails(mapped);
        }
      }
    } catch (err) {
      console.error('[EmailClient] Sync failed:', err);
      alert('IMAP sync failed: ' + (err as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [accounts]);

  // ── Persist ───────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
  }, [emails]);

  // ── Derived State ─────────────────────────────────────────

  const folderEmails = emails
    .filter((e) => {
      if (activeFolder === 'starred') return e.starred;
      return e.folder === activeFolder;
    })
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.date - a.date);

  const selectedEmailData = emails.find((e) => e.id === selectedEmail) || null;

  const unreadCounts = FOLDER_CONFIG.reduce(
    (acc, folder) => {
      if (folder.id === 'starred') {
        acc[folder.id] = emails.filter((e) => e.starred && !e.read).length;
      } else {
        acc[folder.id] = emails.filter((e) => e.folder === folder.id && !e.read).length;
      }
      return acc;
    },
    {} as Record<EmailFolder, number>
  );

  // ── Handlers ──────────────────────────────────────────────

  const handleSelectEmail = useCallback(
    (id: string) => {
      setSelectedEmail(id);
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, read: true } : e))
      );
    },
    []
  );

  const handleToggleStar = useCallback((id: string) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setEmails((prev) => {
      const email = prev.find((e) => e.id === id);
      if (!email) return prev;
      if (email.folder === 'trash') {
        return prev.filter((e) => e.id !== id);
      }
      return prev.map((e) => (e.id === id ? { ...e, folder: 'trash' as EmailFolder } : e));
    });
    setSelectedEmail((prev) => (prev === id ? null : prev));
  }, []);

  const handleSend = useCallback(() => {
    if (!composeState.to.trim() || !composeState.subject.trim()) return;

    const newEmail: Email = {
      id: generateId(),
      from: 'tech-priest@omnissiah.local',
      to: composeState.to,
      subject: composeState.subject,
      body: composeState.body,
      date: Date.now(),
      read: true,
      starred: false,
      folder: 'sent',
      attachments: composeState.attachments,
    };

    setEmails((prev) => [...prev, newEmail]);
    setComposeOpen(false);
    setComposeState({ to: '', subject: '', body: '', attachments: [] });
  }, [composeState]);

  const handleSaveDraft = useCallback(() => {
    if (!composeState.to.trim() && !composeState.subject.trim() && !composeState.body.trim()) {
      setComposeOpen(false);
      return;
    }

    const draft: Email = {
      id: generateId(),
      from: 'tech-priest@omnissiah.local',
      to: composeState.to,
      subject: composeState.subject || '(no subject)',
      body: composeState.body,
      date: Date.now(),
      read: true,
      starred: false,
      folder: 'drafts',
      attachments: composeState.attachments,
    };

    setEmails((prev) => [...prev, draft]);
    setComposeOpen(false);
    setComposeState({ to: '', subject: '', body: '', attachments: [] });
  }, [composeState]);

  const handleMoveToFolder = useCallback((emailId: string, folder: EmailFolder) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, folder } : e))
    );
  }, []);

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-sm)',
        background: 'var(--void-black)',
        color: 'var(--parchment)',
      }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <Mail size={16} style={{ color: 'var(--omnissiah-red)', flexShrink: 0 }} />
          <div>
            <div
              style={{
                color: 'var(--cogitator-gold)',
                fontSize: 'var(--font-size-md)',
                fontWeight: 'bold',
                letterSpacing: '0.12em',
              }}
            >
              NOOSPHERE MAIL
            </div>
            <div style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)', marginTop: '1px' }}>
              {liveMode && accounts.length > 0 ? `${accounts[0].email} ◉ LIVE` : 'OFFLINE — Connect IMAP'}
            </div>
          </div>
        </div>

        {/* Sync IMAP */}
        <button
          onClick={handleSyncIMAP}
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            background: liveMode ? 'rgba(0, 191, 191, 0.1)' : 'transparent',
            border: `1px solid ${liveMode ? 'var(--noosphere-cyan)' : 'var(--iron-gray)'}`,
            color: liveMode ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            flexShrink: 0,
            textTransform: 'uppercase' as const,
          }}
        >
          {syncing ? '⟳' : liveMode ? '⟳ Sync' : '⚡ Connect'}
        </button>

        {/* Load demo data (offline preview) */}
        {!liveMode && (
          <button
            onClick={() => setEmails(generateMockEmails())}
            title="Load demo messages for offline preview"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              flexShrink: 0,
              textTransform: 'uppercase' as const,
            }}
          >
            ◆ DEMO
          </button>
        )}

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            flexShrink: 0,
          }}
        >
          <Search size={10} style={{ color: 'var(--parchment-dim)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              width: '100px',
            }}
          />
        </div>

        <button
          onClick={() => setComposeOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--omnissiah-red)',
            color: 'var(--omnissiah-red)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 150ms ease',
            textTransform: 'uppercase' as const,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
            e.currentTarget.style.boxShadow = 'var(--glow-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <PenTool size={12} />
          COMPOSE
        </button>
      </div>

      {/* ── Compose Panel ─────────────────────────────────── */}
      {composeOpen && (
        <ComposePanel
          state={composeState}
          onChange={setComposeState}
          onSend={handleSend}
          onSaveDraft={handleSaveDraft}
          onClose={() => setComposeOpen(false)}
        />
      )}

      {/* ── Main Layout: Folders | List | Content ─────────── */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Folders Sidebar */}
        <div
          style={{
            width: '120px',
            minWidth: '120px',
            borderRight: '1px solid var(--iron-gray)',
            background: 'var(--iron-dark)',
            overflowY: 'auto',
            flexShrink: 0,
          }}
          className="scrollbar-thin"
        >
          <div style={{ padding: '8px 0' }}>
            {FOLDER_CONFIG.map((folder) => {
              const isActive = activeFolder === folder.id;
              const count = unreadCounts[folder.id];
              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setSelectedEmail(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '7px 10px',
                    background: isActive ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid var(--omnissiah-red)' : '3px solid transparent',
                    color: isActive ? 'var(--omnissiah-red)' : 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-xs)',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    textAlign: 'left',
                    textTransform: 'uppercase' as const,
                    transition: 'all 100ms ease',
                  }}
                >
                  {folder.icon}
                  <span style={{ flex: 1 }}>{folder.label}</span>
                  {count > 0 && (
                    <span
                      style={{
                        background: 'var(--omnissiah-red)',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        minWidth: '16px',
                        textAlign: 'center',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Stats */}
          <div
            style={{
              margin: '8px 10px',
              padding: '8px',
              borderTop: '1px solid var(--iron-gray)',
              fontSize: '9px',
              color: 'var(--parchment-dim)',
            }}
          >
            <div style={{ marginBottom: '4px', letterSpacing: '0.1em' }}>
              {emails.length} TOTAL
            </div>
            <div style={{ color: 'var(--noosphere-cyan)' }}>
              {emails.filter((e) => !e.read).length} UNREAD
            </div>
          </div>
        </div>

        {/* Email List */}
        <div
          style={{
            width: '200px',
            minWidth: '200px',
            borderRight: '1px solid var(--iron-gray)',
            overflowY: 'auto',
            background: 'var(--void-black)',
            flexShrink: 0,
          }}
          className="scrollbar-thin"
        >
          {folderEmails.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--parchment-dim)',
                textAlign: 'center',
                padding: '16px',
                gap: '8px',
              }}
            >
              <Mail size={24} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: 'var(--font-size-xs)', letterSpacing: '0.15em' }}>
                NO MESSAGES
              </div>
              {!liveMode && (
                <div style={{ fontSize: '9px', color: 'var(--noosphere-cyan)' }}>
                  Connect IMAP to sync mail
                </div>
              )}
            </div>
          ) : (
            <div>
              {folderEmails.map((email) => {
                const isSelected = selectedEmail === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email.id)}
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid var(--iron-gray)',
                      borderLeft: isSelected ? '3px solid var(--omnissiah-red)' : '3px solid transparent',
                      background: isSelected ? 'rgba(255, 0, 0, 0.05)' : email.read ? 'transparent' : 'rgba(0, 191, 191, 0.03)',
                      cursor: 'pointer',
                      transition: 'all 100ms ease',
                    }}
                  >
                    {/* From + Star + Date */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '3px',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                        {!email.read && (
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--noosphere-cyan)',
                              boxShadow: '0 0 4px var(--noosphere-cyan-glow)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: email.read ? 'var(--parchment-dim)' : 'var(--sacred-white)',
                            fontWeight: email.read ? 'normal' : 'bold',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {email.from.split('<')[0].trim()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(email.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            color: email.starred ? 'var(--cogitator-gold)' : 'var(--parchment-dim)',
                          }}
                        >
                          <Star
                            size={10}
                            fill={email.starred ? 'var(--cogitator-gold)' : 'none'}
                          />
                        </button>
                        <span style={{ fontSize: '9px', color: 'var(--parchment-dim)' }}>
                          {formatDate(email.date)}
                        </span>
                      </div>
                    </div>

                    {/* Subject */}
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: email.read ? 'var(--parchment-dim)' : 'var(--parchment)',
                        fontWeight: email.read ? 'normal' : 'bold',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '2px',
                      }}
                    >
                      {email.subject}
                    </div>

                    {/* Preview */}
                    <div
                      style={{
                        fontSize: '9px',
                        color: 'var(--parchment-dim)',
                        opacity: 0.7,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {email.body.slice(0, 60)}...
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Panel */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--void-black)',
          }}
          className="scrollbar-thin"
        >
          {selectedEmailData ? (
            <EmailContent
              email={selectedEmailData}
              onStar={() => handleToggleStar(selectedEmailData.id)}
              onDelete={() => handleDelete(selectedEmailData.id)}
              onMoveToFolder={(folder) => handleMoveToFolder(selectedEmailData.id, folder)}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--parchment-dim)',
                textAlign: 'center',
                gap: '12px',
                padding: '24px',
              }}
            >
              <Mail size={32} style={{ opacity: 0.2 }} />
              <div style={{ fontSize: 'var(--font-size-xs)', letterSpacing: '0.15em' }}>
                SELECT A MESSAGE TO VIEW
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.6 }}>
                The Omnissiah guides your correspondence
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compose Panel ───────────────────────────────────────────

function ComposePanel({
  state,
  onChange,
  onSend,
  onSaveDraft,
  onClose,
}: {
  state: ComposeState;
  onChange: (s: ComposeState) => void;
  onSend: () => void;
  onSaveDraft: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        borderBottom: '1px solid var(--omnissiah-red)',
        background: 'var(--iron-dark)',
        padding: '12px',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--omnissiah-red)' }}>
          <PenTool size={14} />
          <span style={{ fontSize: 'var(--font-size-xs)', letterSpacing: '0.15em', fontWeight: 'bold' }}>
            COMPOSE TRANSMISSION
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--parchment-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* To */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
          <input
            type="text"
            value={state.to}
            onChange={(e) => onChange({ ...state, to: e.target.value })}
            placeholder="To: recipient@omnissiah.local"
            style={{
              flex: 1,
              padding: '5px 8px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              outline: 'none',
            }}
          />
        </div>

        {/* Subject */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChevronRight size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
          <input
            type="text"
            value={state.subject}
            onChange={(e) => onChange({ ...state, subject: e.target.value })}
            placeholder="Subject:"
            style={{
              flex: 1,
              padding: '5px 8px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              outline: 'none',
            }}
          />
        </div>

        {/* Body */}
        <textarea
          value={state.body}
          onChange={(e) => onChange({ ...state, body: e.target.value })}
          placeholder="Enter your sacred transmission..."
          rows={5}
          style={{
            width: '100%',
            padding: '8px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        {/* Attachments */}
        {state.attachments.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Paperclip size={12} style={{ color: 'var(--parchment-dim)' }} />
            {state.attachments.map((att, i) => (
              <span
                key={i}
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--parchment)',
                  borderRadius: '2px',
                }}
              >
                {att}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <button
            onClick={onSend}
            disabled={!state.to.trim() || !state.subject.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              background: 'var(--omnissiah-red)',
              border: 'none',
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.12em',
              cursor: !state.to.trim() || !state.subject.trim() ? 'not-allowed' : 'pointer',
              opacity: !state.to.trim() || !state.subject.trim() ? 0.5 : 1,
              fontWeight: 'bold',
              textTransform: 'uppercase' as const,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (state.to.trim() && state.subject.trim()) {
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Send size={12} />
            SEND
          </button>

          <button
            onClick={onSaveDraft}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              textTransform: 'uppercase' as const,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--parchment)';
              e.currentTarget.style.color = 'var(--parchment)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment-dim)';
            }}
          >
            <Save size={12} />
            SAVE DRAFT
          </button>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px',
              cursor: 'pointer',
              color: 'var(--parchment-dim)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <Paperclip size={12} />
            <input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []).map((f) => f.name);
                if (files.length > 0) {
                  onChange({ ...state, attachments: [...state.attachments, ...files] });
                }
              }}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Email Content ───────────────────────────────────────────

function EmailContent({
  email,
  onStar,
  onDelete,
  onMoveToFolder,
}: {
  email: Email;
  onStar: () => void;
  onDelete: () => void;
  onMoveToFolder: (folder: EmailFolder) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  const fromName = email.from.split('<')[0].trim();
  const fromEmail = email.from.match(/<(.+)>/)?.[1] || email.from;

  return (
    <div style={{ padding: '16px' }}>
      {/* Subject */}
      <div
        style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 'bold',
          color: 'var(--sacred-white)',
          marginBottom: '12px',
          letterSpacing: '0.05em',
          lineHeight: 1.4,
        }}
      >
        {email.starred && (
          <Star
            size={14}
            fill="var(--cogitator-gold)"
            style={{ color: 'var(--cogitator-gold)', marginRight: '6px', display: 'inline', verticalAlign: 'middle' }}
          />
        )}
        {email.subject}
      </div>

      {/* Metadata */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '10px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          marginBottom: '12px',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
            <span style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)' }}>FROM:</span>
            <span style={{ color: 'var(--sacred-white)', fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>
              {fromName}
            </span>
            <span style={{ color: 'var(--parchment-dim)', fontSize: '9px' }}>&lt;{fromEmail}&gt;</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
            <span style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)' }}>TO:</span>
            <span style={{ color: 'var(--sacred-white)', fontSize: 'var(--font-size-xs)' }}>{email.to}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={12} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
            <span style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)' }}>DATE:</span>
            <span style={{ color: 'var(--parchment)', fontSize: 'var(--font-size-xs)' }}>
              {new Date(email.date).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={onStar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: email.starred ? 'rgba(200, 168, 75, 0.15)' : 'transparent',
              border: `1px solid ${email.starred ? 'var(--cogitator-gold)' : 'var(--iron-gray)'}`,
              color: email.starred ? 'var(--cogitator-gold)' : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <Star size={10} fill={email.starred ? 'var(--cogitator-gold)' : 'none'} />
            {email.starred ? 'STARRED' : 'STAR'}
          </button>
          <button
            onClick={onDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
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
            <Trash2 size={10} />
            {email.folder === 'trash' ? 'DELETE' : 'TRASH'}
          </button>
          <button
            onClick={() => setShowActions(!showActions)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              cursor: 'pointer',
            }}
          >
            MOVE TO...
          </button>
          {showActions && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                padding: '4px',
              }}
            >
              {(['inbox', 'sent', 'drafts', 'spam'] as EmailFolder[])
                .filter((f) => f !== email.folder)
                .map((folder) => (
                  <button
                    key={folder}
                    onClick={() => {
                      onMoveToFolder(folder);
                      setShowActions(false);
                    }}
                    style={{
                      padding: '3px 6px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--parchment-dim)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      textTransform: 'uppercase' as const,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--omnissiah-red)';
                      e.currentTarget.style.background = 'rgba(255, 0, 0, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--parchment-dim)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {folder}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Attachments */}
      {email.attachments.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px',
            background: 'rgba(200, 168, 75, 0.05)',
            border: '1px solid var(--cogitator-gold-dim)',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}
        >
          <Paperclip size={12} style={{ color: 'var(--cogitator-gold)' }} />
          {email.attachments.map((att, i) => (
            <span
              key={i}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: '3px 8px',
                background: 'var(--iron-dark)',
                border: '1px solid var(--cogitator-gold-dim)',
                color: 'var(--cogitator-gold)',
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            >
              {att}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      <div
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--parchment)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {email.body}
      </div>

      {/* Reply hint */}
      <div
        style={{
          marginTop: '24px',
          padding: '12px',
          border: '1px solid var(--iron-gray)',
          color: 'var(--parchment-dim)',
          fontSize: 'var(--font-size-xs)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--noosphere-cyan)';
          e.currentTarget.style.color = 'var(--noosphere-cyan)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--iron-gray)';
          e.currentTarget.style.color = 'var(--parchment-dim)';
        }}
      >
        Click to reply to this transmission...
      </div>
    </div>
  );
}

export default EmailClient;
