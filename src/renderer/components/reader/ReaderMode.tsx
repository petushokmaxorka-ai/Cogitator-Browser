// ═══ READER MODE ═══
// Distraction-free article reading interface.
// Extracts the sacred text from the noise of the Noosphere.
// Prayers of silence for the Machine God's content.

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, BookOpen, Clock, User, Loader2 } from 'lucide-react';
import { type ArticleData } from '../../../shared/types';

// ── Types ───────────────────────────────────────────────────

interface ReaderModeProps {
  html?: string | null;
  url: string;
  onClose: () => void;
}

// ── Constants ───────────────────────────────────────────────

const SELECTORS_REMOVE = [
  'nav',
  'aside',
  'footer',
  'header',
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'canvas',
  'audio',
  'video',
  '[role="banner"]',
  '[role="navigation"]',
  '[role="complementary"]',
  '[role="contentinfo"]',
  '.ads',
  '.advertisement',
  '.ad',
  '.comments',
  '.comment',
  '.social-share',
  '.share-buttons',
  '.sidebar',
  '.widget',
  '.popup',
  '.modal',
  '.newsletter',
  '.subscribe',
  '.related-posts',
  '.breadcrumb',
  '.pagination',
  '#cookie-banner',
  '#gdpr',
  '.cookie',
];

const SELECTORS_ARTICLE = [
  'article',
  '[role="main"]',
  'main',
  '.post',
  '.entry',
  '.content',
  '.article',
  '.post-content',
  '.entry-content',
  '.article-body',
  '.story-body',
  '.blog-post',
];

const SELECTORS_TITLE = [
  'h1',
  '.entry-title',
  '.post-title',
  '.article-title',
  '.headline',
  '[data-testid="title"]',
];

const SELECTORS_AUTHOR = [
  '[rel="author"]',
  '.author',
  '.byline',
  '.writer',
  '[data-testid="author"]',
  'a[href*="author"]',
];

const SELECTORS_DATE = [
  'time',
  '.date',
  '.published',
  '.post-date',
  '.entry-date',
  '[datetime]',
  '[data-testid="date"]',
  '.timestamp',
];

// ── Utility: Check if page is an article ────────────────────

function isArticlePage(doc: Document): boolean {
  // Check for article tag
  if (doc.querySelector('article')) return true;

  // Check for schema.org Article markup
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');
      const types = ['Article', 'NewsArticle', 'BlogPosting', 'TechArticle'];
      if (
        types.includes(data['@type']) ||
        types.includes(data?.headline ? 'Article' : '')
      )
        return true;
      if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (types.includes(item['@type'])) return true;
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  // Check Open Graph type
  const ogType = doc.querySelector('meta[property="og:type"]');
  if (
    ogType?.getAttribute('content') === 'article'
  )
    return true;

  // Check paragraph density
  const paragraphs = doc.querySelectorAll('p');
  if (paragraphs.length >= 5) {
    let textLength = 0;
    paragraphs.forEach((p) => {
      textLength += p.textContent?.length || 0;
    });
    if (textLength > 500) return true;
  }

  return false;
}

// ── Core: Extract article data ──────────────────────────────

function extractArticle(html: string): ArticleData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Check if this is an article page
  const articleDetected = isArticlePage(doc);

  // Remove non-content elements
  SELECTORS_REMOVE.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((el) => {
      // Don't remove if it's inside the main article
      const closestArticle = el.closest('article');
      if (!closestArticle) {
        el.remove();
      }
    });
  });

  // Find title
  let title = '';
  for (const selector of SELECTORS_TITLE) {
    const el = doc.querySelector(selector);
    if (el?.textContent?.trim()) {
      title = el.textContent.trim();
      break;
    }
  }
  if (!title) {
    title = doc.querySelector('title')?.textContent || '';
  }

  // Find author
  let author = '';
  for (const selector of SELECTORS_AUTHOR) {
    const el = doc.querySelector(selector);
    if (el?.textContent?.trim()) {
      author = el.textContent.trim();
      break;
    }
  }

  // Find date
  let date = '';
  for (const selector of SELECTORS_DATE) {
    const el = doc.querySelector(selector);
    if (el) {
      date =
        el.getAttribute('datetime') ||
        el.textContent?.trim() ||
        '';
      if (date) break;
    }
  }

  // Find main content
  let contentEl: Element | null = null;
  for (const selector of SELECTORS_ARTICLE) {
    const el = doc.querySelector(selector);
    if (el) {
      contentEl = el;
      break;
    }
  }

  // Fallback: find element with most paragraphs
  if (!contentEl) {
    const candidates = doc.querySelectorAll('div, section');
    let maxP = 0;
    candidates.forEach((el) => {
      const pCount = el.querySelectorAll('p').length;
      if (pCount > maxP) {
        maxP = pCount;
        contentEl = el;
      }
    });
  }

  // Clean content: remove empty elements, style attributes
  if (contentEl) {
    const walker = doc.createTreeWalker(
      contentEl,
      NodeFilter.SHOW_ELEMENT,
      null
    );
    const toRemove: Element[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const el = node as Element;
      // Remove style attributes
      el.removeAttribute('style');
      el.removeAttribute('class');
      el.removeAttribute('id');
      el.removeAttribute('onclick');
      el.removeAttribute('onload');

      // Mark empty elements for removal
      if (
        el.textContent?.trim() === '' &&
        el.tagName !== 'BR' &&
        el.tagName !== 'IMG' &&
        el.children.length === 0
      ) {
        toRemove.push(el);
      }
    }
    toRemove.forEach((el) => el.remove());
  }

  return {
    title,
    author,
    date,
    content: contentEl?.innerHTML || '',
    isArticle: articleDetected,
  };
}

// ── Public: Detect if page is readable ──────────────────────

export function detectReadablePage(html: string): boolean {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return isArticlePage(doc);
}

// ── Component ───────────────────────────────────────────────

export default function ReaderMode({ html, url, onClose }: ReaderModeProps) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string | null>(html ?? null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Fetch HTML via IPC if not provided as prop ────────────

  useEffect(() => {
    if (html) {
      setHtmlContent(html);
      return;
    }

    // Fetch real HTML from the active tab via IPC
    if (window.electronAPI?.reader?.getHTML) {
      window.electronAPI.reader.getHTML().then((fetchedHtml: string) => {
        setHtmlContent(fetchedHtml);
      }).catch(() => {
        setHtmlContent(null);
      });
    } else {
      setHtmlContent(null);
    }
  }, [html]);

  // ── Extract article on mount ──────────────────────────────

  useEffect(() => {
    if (!htmlContent) {
      setLoading(false);
      return;
    }

    // Small delay to allow overlay animation
    const timer = setTimeout(() => {
      const data = extractArticle(htmlContent);
      setArticle(data);
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [htmlContent]);

  // ── Keyboard shortcut: ESC to close ───────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ── Handle close ──────────────────────────────────────────

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // ── Render: Loading ───────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--void-black)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: 'var(--cogitator-gold)' }}
        />
        <div
          style={{
            color: 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          Extracting Sacred Text...
        </div>
      </div>
    );
  }

  // ── Render: No article found ──────────────────────────────

  if (!article || !article.isArticle || !article.content) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--void-black)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
        }}
      >
        <BookOpen size={48} strokeWidth={1} style={{ color: 'var(--iron-gray)' }} />
        <div
          style={{
            color: 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textAlign: 'center',
            maxWidth: '300px',
            lineHeight: 1.6,
          }}
        >
          The Machine Spirit could not detect article content on this page.
          <br />
          Reader Mode requires article-type content.
        </div>
        <button
          onClick={handleClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid var(--omnissiah-red)',
            color: 'var(--omnissiah-red)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,0,0,0.1)';
            e.currentTarget.style.boxShadow = 'var(--glow-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <X size={14} />
          CLOSE
        </button>
      </div>
    );
  }

  // ── Render: Article ───────────────────────────────────────

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--void-black)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Reader Header ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'rgba(10,10,10,0.95)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen
            size={14}
            strokeWidth={1.5}
            style={{ color: 'var(--cogitator-gold)' }}
          />
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Lectio Divina
          </span>
        </div>
        <button
          onClick={handleClose}
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
          <X size={14} />
        </button>
      </div>

      {/* ── Article Content ───────────────────────────────── */}
      <div
        ref={contentRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px max(24px, calc(50% - 380px))',
          scrollBehavior: 'smooth',
        }}
      >
        {/* Title */}
        {article.title && (
          <h1
            style={{
              color: 'var(--cogitator-gold)',
              fontFamily: 'Georgia, serif',
              fontSize: '28px',
              fontWeight: 'bold',
              lineHeight: 1.3,
              marginBottom: '12px',
              textShadow: '0 0 20px rgba(200,168,75,0.2)',
              wordBreak: 'break-word',
            }}
          >
            {article.title}
          </h1>
        )}

        {/* Meta: Author & Date */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          {article.author && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User
                size={12}
                strokeWidth={1.5}
                style={{ color: 'var(--parchment-dim)' }}
              />
              <span
                style={{
                  color: 'var(--parchment)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                }}
              >
                {article.author}
              </span>
            </div>
          )}
          {article.date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock
                size={12}
                strokeWidth={1.5}
                style={{ color: 'var(--parchment-dim)' }}
              />
              <span
                style={{
                  color: 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                }}
              >
                {article.date}
              </span>
            </div>
          )}
          {url && (
            <span
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '200px',
              }}
              title={url}
            >
              {url}
            </span>
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background:
              'linear-gradient(90deg, var(--cogitator-gold) 0%, transparent 100%)',
            marginBottom: '24px',
            opacity: 0.4,
          }}
        />

        {/* Article Body */}
        <div
          className="reader-article-body"
          dangerouslySetInnerHTML={{ __html: article.content }}
          style={{
            color: 'var(--sacred-white)',
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            lineHeight: 1.8,
            wordBreak: 'break-word',
          }}
        />

        {/* Bottom spacing */}
        <div style={{ height: '60px' }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CSS-in-JSX for reader article body styling
// ═══════════════════════════════════════════════════════════

const readerStyles = `
  .reader-article-body p {
    margin-bottom: 1.2em;
    color: var(--sacred-white);
  }
  .reader-article-body h1,
  .reader-article-body h2,
  .reader-article-body h3,
  .reader-article-body h4 {
    color: var(--cogitator-gold);
    font-family: Georgia, serif;
    margin-top: 1.5em;
    margin-bottom: 0.6em;
    line-height: 1.3;
  }
  .reader-article-body h1 { font-size: 24px; }
  .reader-article-body h2 { font-size: 20px; }
  .reader-article-body h3 { font-size: 17px; }
  .reader-article-body h4 { font-size: 15px; }
  .reader-article-body img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1.5em auto;
    border: 1px solid var(--iron-gray);
    box-shadow: 0 0 15px rgba(200, 168, 75, 0.15);
  }
  .reader-article-body a {
    color: var(--noosphere-cyan);
    text-decoration: underline;
    text-decoration-color: var(--noosphere-cyan-dim);
    transition: all 150ms ease;
  }
  .reader-article-body a:hover {
    color: var(--cogitator-gold);
    text-decoration-color: var(--cogitator-gold);
  }
  .reader-article-body blockquote {
    border-left: 2px solid var(--cogitator-gold);
    padding-left: 1em;
    margin-left: 0;
    margin-bottom: 1.2em;
    color: var(--parchment);
    font-style: italic;
  }
  .reader-article-body ul,
  .reader-article-body ol {
    margin-bottom: 1.2em;
    padding-left: 1.8em;
  }
  .reader-article-body li {
    margin-bottom: 0.4em;
  }
  .reader-article-body code {
    background: var(--iron-dark);
    padding: 2px 6px;
    font-family: var(--font-mono);
    font-size: 0.85em;
    color: var(--noosphere-cyan);
    border: 1px solid var(--iron-gray);
  }
  .reader-article-body pre {
    background: var(--iron-dark);
    padding: 12px 16px;
    overflow-x: auto;
    border: 1px solid var(--iron-gray);
    margin-bottom: 1.2em;
  }
  .reader-article-body pre code {
    background: none;
    border: none;
    padding: 0;
  }
  .reader-article-body strong {
    color: var(--cogitator-gold);
    font-weight: bold;
  }
  .reader-article-body em {
    color: var(--parchment);
    font-style: italic;
  }
  .reader-article-body table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.2em;
    font-size: 14px;
  }
  .reader-article-body th,
  .reader-article-body td {
    border: 1px solid var(--iron-gray);
    padding: 8px 12px;
    text-align: left;
  }
  .reader-article-body th {
    background: var(--iron-dark);
    color: var(--cogitator-gold);
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .reader-article-body figure {
    margin: 1.5em 0;
  }
  .reader-article-body figcaption {
    color: var(--parchment-dim);
    font-size: 13px;
    text-align: center;
    margin-top: 8px;
    font-style: italic;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'reader-mode-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = readerStyles;
    document.head.appendChild(styleEl);
  }
}

// ═══════════════════════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════════════════════

export { extractArticle, isArticlePage };
