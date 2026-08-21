// ═══════════════════════════════════════════════════════════════════════════════
// CODE EDITOR — Monaco-Style Editor (No External Libraries)
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { onEditorOpenFile } from '../../lib/editor-bridge';

// ── Types ────────────────────────────────────────────────────────────────────

interface EditorFile {
  id: string;
  name: string;
  content: string;
  language: string;
  isModified: boolean;
  path?: string;
}

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path?: string;
  children?: FileNode[];
  language?: string;
}

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'html',
  'css',
  'json',
  'rust',
  'go',
];

const LANG_EXT: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  html: 'html',
  css: 'css',
  json: 'json',
  rust: 'rs',
  go: 'go',
};

const HIGHLIGHTERS: Record<string, [RegExp, string][]> = {
  javascript: [
    [/\b(const|let|var|function|return|if|else|for|while|class|import|export|async|await|new|this|try|catch|throw|yield|typeof|instanceof|delete|void|in|of|switch|case|break|continue|default|do|with|debugger|extends|super|static|get|set|from|as)\b/g, '#FF0000'],
    [/\b(console|document|window|Math|JSON|Date|Array|String|Number|Boolean|Object|Promise|Set|Map|WeakMap|WeakSet|Symbol|RegExp|Error|parseInt|parseFloat|isNaN|isFinite|setTimeout|setInterval|clearTimeout|clearInterval|require|module|exports|global|process|Buffer|__dirname|__filename)\b/g, '#00BFBF'],
    [/'[^']*'|"[^"]*"|`[^`]*`/g, '#C8A84B'],
    [/\/\/.*$/gm, '#8B7D6B'],
    [/\/\*[\s\S]*?\*\//g, '#8B7D6B'],
    [/\b\d+\b/g, '#FF0000'],
    [/\b(true|false|null|undefined)\b/g, '#D4C5A0'],
  ],
  typescript: [
    [/\b(const|let|var|function|return|if|else|for|while|class|import|export|async|await|new|this|try|catch|throw|yield|typeof|instanceof|delete|void|in|of|switch|case|break|continue|default|do|with|debugger|extends|super|static|get|set|from|as|interface|type|enum|namespace|module|declare|abstract|readonly|private|protected|public|implements|keyof|infer|never|unknown|any)\b/g, '#FF0000'],
    [/\b(console|document|window|Math|JSON|Date|Array|String|Number|Boolean|Object|Promise|Set|Map|Record|Partial|Pick|Omit|Exclude|Extract|NonNullable|Parameters|ReturnType|InstanceType|ThisParameterType|OmitThisParameter|ThisType|Uppercase|Lowercase|Capitalize|Uncapitalize)\b/g, '#00BFBF'],
    [/'[^']*'|"[^"]*"|`[^`]*`/g, '#C8A84B'],
    [/\/\/.*$/gm, '#8B7D6B'],
    [/\/\*[\s\S]*?\*\//g, '#8B7D6B'],
    [/\b\d+\b/g, '#FF0000'],
    [/\b(true|false|null|undefined)\b/g, '#D4C5A0'],
  ],
  python: [
    [/\b(def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|raise|assert|yield|lambda|pass|break|continue|del|global|nonlocal|and|or|not|in|is|True|False|None|async|await|print|input|len|range|enumerate|zip|map|filter|sum|min|max|sorted|open|str|int|float|list|dict|tuple|set|frozenset|bool)\b/g, '#FF0000'],
    [/\b(self|cls|super|__init__|__main__|__name__|__file__|__doc__|__dict__|__class__|__str__|__repr__|__len__|__eq__|__getattr__|__setattr__|__call__|__iter__|__next__)\b/g, '#00BFBF'],
    [/'[^']*'|"[^"]*"|'''[\s\S]*?'''|"""[\s\S]*?"""/g, '#C8A84B'],
    [/#.*$/gm, '#8B7D6B'],
    [/\b\d+\b/g, '#FF0000'],
    [/\b(True|False|None)\b/g, '#D4C5A0'],
  ],
  html: [
    [/<\/?[\w-]+/g, '#FF0000'],
    [/[\w-]+(?==)/g, '#C8A84B'],
    [/="[^"]*"/g, '#00BFBF'],
    [/<!DOCTYPE[^>]*>/gi, '#8B7D6B'],
    [/<!--[\s\S]*?-->/g, '#8B7D6B'],
  ],
  css: [
    [/@[\w-]+/g, '#FF0000'],
    [/[\w-]+(?=\s*:)/g, '#C8A84B'],
    [/:\s*[^;]+/g, '#00BFBF'],
    [/[\.#][\w-]+/g, '#FF0000'],
    [/\/\*[\s\S]*?\*\//g, '#8B7D6B'],
  ],
  json: [
    [/"[^"]*"(?=\s*:)/g, '#C8A84B'],
    [/:\s*"[^"]*"/g, '#00BFBF'],
    [/:\s*(true|false|null)/g, '#FF0000'],
    [/:\s*\d+/g, '#FF0000'],
    [/[{}[\]]/g, '#D4C5A0'],
  ],
  rust: [
    [/\b(fn|let|mut|const|static|if|else|match|for|while|loop|return|break|continue|struct|enum|trait|impl|use|mod|pub|crate|self|super|where|type|move|ref|Box|Vec|String|Option|Result|Some|None|Ok|Err|panic|assert|macro_rules|async|await|dyn|unsafe|extern|as|in)\b/g, '#FF0000'],
    [/\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str)\b/g, '#00BFBF'],
    [/&str|&'static|&'a/g, '#00BFBF'],
    [/'[^']*'/g, '#C8A84B'],
    [/r#\"[\s\S]*?\"#/, '#C8A84B'],
    [/\/\/.*$/gm, '#8B7D6B'],
    [/\/\*[\s\S]*?\*\//g, '#8B7D6B'],
    [/\b\d+\b/g, '#FF0000'],
    [/\b(true|false)\b/g, '#D4C5A0'],
  ],
  go: [
    [/\b(func|var|const|type|struct|interface|map|chan|if|else|for|range|return|break|continue|switch|case|default|defer|go|goto|fallthrough|select|package|import|new|make|len|cap|append|copy|close|delete|panic|recover|print|println)\b/g, '#FF0000'],
    [/'[^']*'/g, '#C8A84B'],
    [/`[^`]*`/g, '#C8A84B'],
    [/\/\/.*$/gm, '#8B7D6B'],
    [/\/\*[\s\S]*?\*\//g, '#8B7D6B'],
    [/\b\d+\b/g, '#FF0000'],
    [/\b(true|false|nil|iota)\b/g, '#D4C5A0'],
    [/(?<=^|[\s({[])(int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|uintptr|float32|float64|complex64|complex128|string|bool|byte|rune|error|any|comparable)(?=[\s\)},;\]])/g, '#00BFBF'],
  ],
};

// ── Bracket Pairs ────────────────────────────────────────────────────────────

const BRACKETS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  ')': '(',
  ']': '[',
  '}': '{',
};

const OPEN_BRACKETS = '([{';
const CLOSE_BRACKETS = ')]}';

// ── File tree helpers ─────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'out', '.swarm-venv', 'target']);

function extToLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    rs: 'rust',
    go: 'go',
  };
  return map[ext] ?? 'text';
}

async function buildFileTree(dirPath: string, maxDepth = 4, depth = 0): Promise<FileNode[]> {
  if (depth >= maxDepth) return [];
  const api = window.electronAPI?.fs;
  if (!api?.listDir) return [];
  try {
    const entries = await api.listDir(dirPath);
    const nodes: FileNode[] = [];
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.isDirectory) {
        const children =
          depth < maxDepth - 1 ? await buildFileTree(entry.path, maxDepth, depth + 1) : [];
        nodes.push({
          id: entry.path,
          name: entry.name,
          type: 'folder',
          path: entry.path,
          children,
        });
      } else {
        nodes.push({
          id: entry.path,
          name: entry.name,
          type: 'file',
          path: entry.path,
          language: extToLanguage(entry.name),
        });
      }
    }
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  } catch {
    return [];
  }
}

// ── Default File Content ─────────────────────────────────────────────────────

const DEFAULT_CONTENT: Record<string, string> = {
  typescript: `// Welcome to the Cogitator Code Editor
// Machine Spirit guides your keystrokes

interface MachineSpirit {
  name: string;
  function: string;
  sanctified: boolean;
}

class OmnissiahCore implements MachineSpirit {
  name = 'Anathemetron';
  function = 'Code Sanctification';
  sanctified = true;

  async process(data: string): Promise<string> {
    console.log('Processing:', data);
    return data.toUpperCase();
  }
}

const core = new OmnissiahCore();
core.process('hello mechanicus').then(console.log);
`,
  javascript: `// JavaScript — The language of the Machine God

function sanctifyCode(input) {
  const rituals = ['bless', 'compile', 'execute'];

  for (const ritual of rituals) {
    console.log(\`Performing: \${ritual}\`);
  }

  return input.replace(/evil/g, 'purified');
}

const result = sanctifyCode('console.log("Praise the Omnissiah")');
console.log(result);
`,
  python: `# Python — Serpent of the Machine Cult

class MachineSpirit:
    def __init__(self, name):
        self.name = name
        self.blessed = True

    def sanctify(self, data):
        if not data:
            return None
        return f"Blessed by {self.name}: {data}"

spirit = MachineSpirit("Anathemetron")
result = spirit.sanctify("print('Omnissiah guide us')")
print(result)
`,
  rust: `// Rust — Ferric blessing of the Omnissiah

struct MachineSpirit {
    name: String,
    function: String,
}

impl MachineSpirit {
    fn new(name: &str) -> Self {
        MachineSpirit {
            name: name.to_string(),
            function: String::from("Sanctification"),
        }
    }

    fn process(&self, input: &str) -> Result<String, &'static str> {
        if input.is_empty() {
            return Err("Empty input");
        }
        Ok(format!("{} processed by {}", input, self.name))
    }
}

fn main() {
    let spirit = MachineSpirit::new("Cogitator");
    match spirit.process("data") {
        Ok(result) => println!("{}", result),
        Err(e) => eprintln!("Error: {}", e),
    }
}
`,
  go: `// Go — Golang of the Mechanicus

package main

import (
	"fmt"
	"strings"
)

type MachineSpirit struct {
	Name      string
	Function  string
}

func (m *MachineSpirit) Process(input string) string {
	return strings.ToUpper(input)
}

func main() {
	spirit := &MachineSpirit{
		Name:     "Cogitator",
		Function: "Processing",
	}
	result := spirit.Process("blessed be the machine")
	fmt.Println(result)
}
`,
  json: `{
  "project": "cogitator-browser",
  "version": "4.3.0",
  "mechanicus": {
    "forge": "Dark",
    "sanctified": true,
    "spirits": ["Anathemetron", "Omnissiah", "Machine God"]
  },
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "typescript": "^5.3.0"
  }
}
`,
  css: `/* Dark Mechanicus Styles */

:root {
  --void-black: #000000;
  --omnissiah-red: #FF0000;
  --cogitator-gold: #C8A84B;
  --noosphere-cyan: #00BFBF;
  --parchment: #D4C5A0;
}

.container {
  background: var(--void-black);
  color: var(--parchment);
  font-family: 'Courier New', monospace;
  border: 1px solid var(--omnissiah-red);
}

.container:hover {
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
}
`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cogitator Browser</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <h1>Praise the Omnissiah</h1>
    <p>Machine Spirit guide us.</p>
    <button onclick="start()">Initialize</button>
  </div>
  <script src="build.js"></script>
</body>
</html>
`,
};

// ── Syntax Highlighting ──────────────────────────────────────────────────────

function highlightSyntax(text: string, language: string): string {
  const highlighters = HIGHLIGHTERS[language];
  if (!highlighters) return escapeHtml(text);

  let result = escapeHtml(text);
  const replacements: { start: number; end: number; html: string }[] = [];

  // We do a two-pass: first find all matches on original text, then build HTML
  const lines = text.split('\n');
  let htmlLines: string[] = [];

  for (const line of lines) {
    let htmlLine = escapeHtml(line);
    for (const [regex, color] of highlighters) {
      // Reset regex lastIndex
      regex.lastIndex = 0;
      const lineRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
      htmlLine = htmlLine.replace(lineRegex, (match) => {
        return `<span style="color:${color}">${match}</span>`;
      });
    }
    htmlLines.push(htmlLine);
  }

  return htmlLines.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/ /g, '&nbsp;')
    .replace(/\t/g, '&nbsp;&nbsp;');
}

// ── Find Bracket Match ───────────────────────────────────────────────────────

function findBracketMatch(text: string, pos: number): number | null {
  const char = text[pos];
  if (!char || !BRACKETS[char]) return null;

  const isOpen = OPEN_BRACKETS.includes(char);
  const target = BRACKETS[char];
  let depth = 1;

  if (isOpen) {
    for (let i = pos + 1; i < text.length; i++) {
      if (text[i] === char) depth++;
      else if (text[i] === target) depth--;
      if (depth === 0) return i;
    }
  } else {
    for (let i = pos - 1; i >= 0; i--) {
      if (text[i] === char) depth++;
      else if (text[i] === target) depth--;
      if (depth === 0) return i;
    }
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CodeEditor() {
  // ═══ State ═══
  const [files, setFiles] = useState<EditorFile[]>([
    {
      id: 'welcome',
      name: 'welcome.ts',
      content: DEFAULT_CONTENT.typescript,
      language: 'typescript',
      isModified: false,
    },
  ]);
  const [activeFileId, setActiveFileId] = useState('welcome');
  const [sidebarWidth] = useState(180);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [projectRoot, setProjectRoot] = useState('');
  const [gitInfo, setGitInfo] = useState<{ branch: string; dirty: number } | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [matchBracket, setMatchBracket] = useState<{ open: number; close: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  const loadProjectTree = useCallback(async (root: string) => {
    if (!root) return;
    setTreeLoading(true);
    try {
      const tree = await buildFileTree(root);
      setFileTree(tree);
      setProjectRoot(root);
      setExpandedFolders(new Set([root]));
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const home = await window.electronAPI?.fs?.getHome?.();
      const defaultRoot = home ? `${home}/heretic-os/cogitator-browser` : '';
      if (defaultRoot) await loadProjectTree(defaultRoot);
    })();
  }, [loadProjectTree]);

  useEffect(() => {
    if (!projectRoot) {
      setGitInfo(null);
      return;
    }
    void (async () => {
      try {
        await window.electronAPI?.git?.setRepo?.(projectRoot);
        const status = await window.electronAPI?.git?.status?.();
        if (status) {
          setGitInfo({
            branch: status.branch ?? 'HEAD',
            dirty: status.entries?.length ?? 0,
          });
        } else {
          setGitInfo(null);
        }
      } catch {
        setGitInfo(null);
      }
    })();
  }, [projectRoot]);

  const handleOpenFolder = useCallback(async () => {
    const dir = await window.electronAPI?.fs?.selectDir?.();
    if (dir) await loadProjectTree(dir);
  }, [loadProjectTree]);

  const openFileByPath = useCallback(
    async (filePath: string) => {
      const name = filePath.split('/').pop() ?? filePath;
      const id = filePath;
      const existing = files.find((f) => f.path === filePath);
      if (existing) {
        setActiveFileId(existing.id);
        return;
      }
      let content = '';
      try {
        content = (await window.electronAPI?.fs?.read?.(filePath)) ?? '';
      } catch {
        content = '';
      }
      const newFile: EditorFile = {
        id,
        name,
        path: filePath,
        content,
        language: extToLanguage(name),
        isModified: false,
      };
      setFiles((prev) => [...prev, newFile]);
      setActiveFileId(id);
    },
    [files],
  );

  useEffect(() => {
    return onEditorOpenFile((path) => {
      void openFileByPath(path);
    });
  }, [openFileByPath]);

  // ═══ Derived ═══
  const lines = activeFile.content.split('\n');
  const lineCount = lines.length;
  const highlighted = useMemo(
    () => highlightSyntax(activeFile.content, activeFile.language),
    [activeFile.content, activeFile.language]
  );

  // ═══ Commands ═══
  const commands: Command[] = [
    { id: 'new', label: 'New File', shortcut: 'Ctrl+N', action: handleNewFile },
    { id: 'save', label: 'Save File', shortcut: 'Ctrl+S', action: handleSave },
    { id: 'close', label: 'Close File', shortcut: 'Ctrl+W', action: handleCloseFile },
    { id: 'find', label: 'Find', shortcut: 'Ctrl+F', action: () => setShowSearch(true) },
    { id: 'replace', label: 'Find and Replace', shortcut: 'Ctrl+H', action: () => setShowSearch(true) },
    { id: 'minimap', label: 'Toggle Minimap', action: () => setMinimapVisible((v) => !v) },
    { id: 'run', label: 'Run Code', shortcut: 'Ctrl+Enter', action: handleRun },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(commandQuery.toLowerCase())
  );

  // ═══ Handlers ═══
  function handleNewFile() {
    const lang = 'typescript';
    const id = `file-${Date.now()}`;
    const newFile: EditorFile = {
      id,
      name: `untitled.${LANG_EXT[lang]}`,
      content: '',
      language: lang,
      isModified: false,
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(id);
    setShowCommandPalette(false);
  }

  function handleCloseFile() {
    if (files.length <= 1) return;
    setFiles((prev) => prev.filter((f) => f.id !== activeFileId));
    setActiveFileId(files.find((f) => f.id !== activeFileId)?.id || '');
  }

  async function handleSave() {
    const file = files.find((f) => f.id === activeFileId);
    if (file?.path && window.electronAPI?.fs?.write) {
      try {
        await window.electronAPI.fs.write(file.path, file.content);
      } catch (err) {
        console.error('[CodeEditor] Save failed:', err);
        return;
      }
    }
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, isModified: false } : f))
    );
  }

  function updateContent(newContent: string) {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: newContent, isModified: true } : f))
    );
  }

  function handleTabChange(fileId: string) {
    setActiveFileId(fileId);
    setRunOutput(null);
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    updateContent(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const isCtrl = e.ctrlKey || e.metaKey;

    // Ctrl+F — Find
    if (isCtrl && e.key === 'f') {
      e.preventDefault();
      setShowSearch((v) => !v);
      return;
    }

    // Ctrl+Shift+P — Command Palette
    if (isCtrl && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      setShowCommandPalette(true);
      return;
    }

    // Ctrl+Enter — Run
    if (isCtrl && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
      return;
    }

    // Auto-indent on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const pos = textarea.selectionStart;
      const val = textarea.value;
      const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
      const currentLine = val.slice(lineStart, pos);
      const indent = currentLine.match(/^\s*/)?.[0] || '';
      const lastChar = val[pos - 1];
      const nextChar = val[pos];

      let extraIndent = '';
      if (lastChar === '{' || lastChar === '(' || lastChar === '[') {
        extraIndent = '  ';
      }

      const insert = '\n' + indent + extraIndent;
      let newPos = pos + insert.length;

      // Auto-close bracket
      let closeBracket = '';
      if (lastChar === '{' && nextChar !== '}') closeBracket = '\n' + indent + '}';
      else if (lastChar === '(' && nextChar !== ')') closeBracket = '';

      const newValue = val.slice(0, pos) + insert + closeBracket + val.slice(pos);
      updateContent(newValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = closeBracket
          ? newPos
          : newPos;
      });
      return;
    }

    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const pos = textarea.selectionStart;
      const val = textarea.value;
      if (e.shiftKey) {
        // Outdent
        const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
        const line = val.slice(lineStart, pos);
        const newLine = line.startsWith('  ') ? line.slice(2) : line.startsWith(' ') ? line.slice(1) : line;
        if (line !== newLine) {
          const newValue = val.slice(0, lineStart) + newLine + val.slice(pos);
          updateContent(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = pos - (line.length - newLine.length);
          });
        }
      } else {
        const newValue = val.slice(0, pos) + '  ' + val.slice(pos);
        updateContent(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = pos + 2;
        });
      }
      return;
    }

    // Update cursor position
    setTimeout(() => {
      const pos = textarea.selectionStart;
      const textUpToCursor = textarea.value.slice(0, pos);
      const lines = textUpToCursor.split('\n');
      setCursorLine(lines.length);
      setCursorCol(lines[lines.length - 1].length + 1);

      // Bracket matching
      const char = textarea.value[pos - 1];
      if (char && BRACKETS[char]) {
        const match = findBracketMatch(textarea.value, pos - 1);
        if (match !== null) {
          setMatchBracket({ open: pos - 1, close: match });
        } else {
          setMatchBracket(null);
        }
      } else {
        setMatchBracket(null);
      }
    }, 0);
  }

  function handleFind() {
    if (!searchQuery || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const val = activeFile.content;
    const idx = val.indexOf(searchQuery, textarea.selectionEnd);
    if (idx !== -1) {
      textarea.selectionStart = idx;
      textarea.selectionEnd = idx + searchQuery.length;
      textarea.focus();
    }
  }

  function handleReplace() {
    if (!searchQuery) return;
    const newContent = activeFile.content.replace(searchQuery, replaceQuery);
    updateContent(newContent);
  }

  function handleReplaceAll() {
    if (!searchQuery) return;
    const newContent = activeFile.content.split(searchQuery).join(replaceQuery);
    updateContent(newContent);
  }

  function handleRun() {
    if (activeFile.language !== 'javascript') {
      setRunOutput(`[RUN] Language "${activeFile.language}" execution not supported in sandbox.\nOnly JavaScript can be executed.`);
      return;
    }

    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
    console.error = (...args: unknown[]) => logs.push('[ERROR] ' + args.map(String).join(' '));
    console.warn = (...args: unknown[]) => logs.push('[WARN] ' + args.map(String).join(' '));

    try {
      // eslint-disable-next-line no-eval
      eval(activeFile.content);
      setRunOutput(logs.join('\n') || '[RUN] Executed successfully (no output)');
    } catch (err: unknown) {
      setRunOutput(`[ERROR] ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  }

  function handleFileTreeClick(node: FileNode) {
    if (node.type === 'folder') {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    } else {
      void openFileNode(node);
    }
  }

  async function openFileNode(node: FileNode) {
    if (!node.path) return;
    const existing = files.find((f) => f.id === node.id);
    if (existing) {
      setActiveFileId(node.id);
      return;
    }
    let content = '';
    try {
      content = (await window.electronAPI?.fs?.read?.(node.path)) ?? '';
    } catch {
      content = node.language ? (DEFAULT_CONTENT[node.language] || '') : '';
    }
    const newFile: EditorFile = {
      id: node.id,
      name: node.name,
      path: node.path,
      content,
      language: node.language || extToLanguage(node.name),
      isModified: false,
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(node.id);
  }

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ═══ Scroll sync ═══
  const handleEditorScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const lineNums = document.getElementById('line-numbers');
    const highlightLayer = document.getElementById('highlight-layer');
    if (lineNums) lineNums.scrollTop = target.scrollTop;
    if (highlightLayer) highlightLayer.scrollTop = target.scrollTop;
  }, []);

  // ═══ Render helpers ═══
  function renderFileTree(nodes: FileNode[], depth = 0): JSX.Element[] {
    return nodes.flatMap((node) => {
      const isExpanded = expandedFolders.has(node.id);
      const isActive = activeFileId === node.id;
      const items: JSX.Element[] = [];

      items.push(
        <div
          key={node.id}
          onClick={() => {
            if (node.type === 'folder') toggleFolder(node.id);
            else handleFileTreeClick(node);
          }}
          style={{
            paddingLeft: `${depth * 12 + 8}px`,
            paddingRight: '8px',
            paddingTop: '3px',
            paddingBottom: '3px',
            cursor: 'pointer',
            color: isActive ? '#FF0000' : node.type === 'folder' ? '#C8A84B' : '#D4C5A0',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: isActive ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
            borderLeft: isActive ? '2px solid #FF0000' : '2px solid transparent',
            transition: 'all 100ms ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.background = 'rgba(200, 168, 75, 0.1)';
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.background = 'transparent';
          }}
        >
          {node.type === 'folder' ? (
            <span style={{ color: '#C8A84B', fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
          ) : (
            <span style={{ color: '#00BFBF', fontSize: '10px' }}>▸</span>
          )}
          {node.name}
        </div>
      );

      if (node.type === 'folder' && isExpanded && node.children) {
        items.push(...renderFileTree(node.children, depth + 1));
      }

      return items;
    });
  }

  // ═══ Minimap content ═══
  const minimapLines = useMemo(() => {
    return lines.slice(0, 50).map((line) => line.slice(0, 40));
  }, [lines]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#000000',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
      }}
    >
      {/* ═══ Toolbar ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderBottom: '1px solid #1E1E1E',
          background: '#111111',
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleNewFile}
          style={{
            padding: '3px 10px',
            background: '#1E1E1E',
            border: '1px solid #333',
            color: '#D4C5A0',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF0000';
            e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          New
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '3px 10px',
            background: '#1E1E1E',
            border: '1px solid #333',
            color: '#D4C5A0',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF0000';
            e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Save
        </button>
        <button
          onClick={() => setShowSearch(true)}
          style={{
            padding: '3px 10px',
            background: '#1E1E1E',
            border: '1px solid #333',
            color: '#D4C5A0',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF0000';
            e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Find
        </button>
        <button
          onClick={() => setShowCommandPalette(true)}
          style={{
            padding: '3px 10px',
            background: '#1E1E1E',
            border: '1px solid #333',
            color: '#D4C5A0',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF0000';
            e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Commands
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleRun}
          style={{
            padding: '3px 16px',
            background: 'linear-gradient(135deg, rgba(255,0,0,0.2), rgba(255,0,0,0.05))',
            border: '1px solid #FF0000',
            color: '#FF0000',
            fontFamily: 'inherit',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            textShadow: '0 0 8px rgba(255, 0, 0, 0.4)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,0,0,0.4), rgba(255,0,0,0.1))';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,0,0,0.2), rgba(255,0,0,0.05))';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ▶ Run
        </button>
      </div>

      {/* ═══ Tabs ═══ */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #1E1E1E',
          background: '#000000',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              onClick={() => handleTabChange(file.id)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                background: isActive ? '#1E1E1E' : 'transparent',
                borderBottom: isActive ? '2px solid #FF0000' : '2px solid transparent',
                color: isActive ? '#D4C5A0' : '#8B7D6B',
                fontSize: '11px',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 100ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#C8A84B';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = '#8B7D6B';
              }}
            >
              <span style={{ color: '#00BFBF', fontSize: '9px' }}>
                {LANG_EXT[file.language] || 'txt'}
              </span>
              {file.name}
              {file.isModified && <span style={{ color: '#FF0000' }}>●</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (files.length > 1) {
                    setFiles((prev) => prev.filter((f) => f.id !== file.id));
                    if (isActive) {
                      setActiveFileId(files.find((f) => f.id !== file.id)?.id || '');
                    }
                  }
                }}
                style={{
                  marginLeft: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#8B7D6B',
                  cursor: 'pointer',
                  fontSize: '10px',
                  padding: '0 2px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* ═══ Main Editor Area ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── File Tree Sidebar ── */}
        <div
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            borderRight: '1px solid #1E1E1E',
            background: '#0D0D0D',
            overflowY: 'auto',
            paddingTop: '4px',
            paddingBottom: '4px',
          }}
        >
          <div
            style={{
              padding: '4px 8px',
              color: '#C8A84B',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              borderBottom: '1px solid #1E1E1E',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
            }}
          >
            <span>⚙ Explorer</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {gitInfo && (
                <span
                  style={{
                    color: gitInfo.dirty > 0 ? '#FF0000' : '#00BFBF',
                    fontSize: '9px',
                    maxWidth: '90px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={gitInfo.dirty > 0 ? `${gitInfo.dirty} changed file(s)` : 'Clean working tree'}
                >
                  {gitInfo.branch}
                  {gitInfo.dirty > 0 ? ` • ${gitInfo.dirty}` : ''}
                </span>
              )}
              <button
              onClick={() => void handleOpenFolder()}
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#00BFBF',
                fontSize: '9px',
                cursor: 'pointer',
                padding: '1px 4px',
              }}
              title="Open folder"
            >
              OPEN
            </button>
            </div>
          </div>
          {projectRoot && (
            <div
              style={{
                padding: '2px 8px 6px',
                color: '#8B7D6B',
                fontSize: '9px',
                wordBreak: 'break-all',
              }}
            >
              {projectRoot}
            </div>
          )}
          {treeLoading ? (
            <div style={{ padding: '8px', color: '#8B7D6B', fontSize: '10px' }}>Loading…</div>
          ) : fileTree.length === 0 ? (
            <div style={{ padding: '8px', color: '#8B7D6B', fontSize: '10px' }}>
              No project loaded. Click OPEN.
            </div>
          ) : (
            renderFileTree(fileTree)
          )}
        </div>

        {/* ── Editor ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* Search Bar */}
          {showSearch && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                padding: '6px 12px',
                background: '#111111',
                borderBottom: '1px solid #1E1E1E',
                flexShrink: 0,
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#C8A84B', fontSize: '10px' }}>FIND:</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                placeholder="Search..."
                autoFocus
                style={{
                  background: '#1E1E1E',
                  border: '1px solid #333',
                  color: '#D4C5A0',
                  fontFamily: 'inherit',
                  fontSize: '11px',
                  padding: '3px 8px',
                  outline: 'none',
                  width: '140px',
                }}
              />
              <span style={{ color: '#C8A84B', fontSize: '10px' }}>REPLACE:</span>
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace..."
                style={{
                  background: '#1E1E1E',
                  border: '1px solid #333',
                  color: '#D4C5A0',
                  fontFamily: 'inherit',
                  fontSize: '11px',
                  padding: '3px 8px',
                  outline: 'none',
                  width: '120px',
                }}
              />
              <button
                onClick={handleFind}
                style={{
                  padding: '3px 10px',
                  background: '#1E1E1E',
                  border: '1px solid #333',
                  color: '#D4C5A0',
                  fontFamily: 'inherit',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Find
              </button>
              <button
                onClick={handleReplace}
                style={{
                  padding: '3px 10px',
                  background: '#1E1E1E',
                  border: '1px solid #333',
                  color: '#D4C5A0',
                  fontFamily: 'inherit',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                style={{
                  padding: '3px 10px',
                  background: '#1E1E1E',
                  border: '1px solid #333',
                  color: '#D4C5A0',
                  fontFamily: 'inherit',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              <button
                onClick={() => setShowSearch(false)}
                style={{
                  padding: '3px 8px',
                  background: 'transparent',
                  border: '1px solid #333',
                  color: '#8B7D6B',
                  fontFamily: 'inherit',
                  fontSize: '10px',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Command Palette */}
          {showCommandPalette && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '400px',
                background: '#111111',
                border: '1px solid #FF0000',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.15)',
                zIndex: 100,
                maxHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <input
                type="text"
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Type a command..."
                autoFocus
                style={{
                  background: '#000000',
                  border: 'none',
                  borderBottom: '1px solid #1E1E1E',
                  color: '#D4C5A0',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  padding: '8px 12px',
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowCommandPalette(false);
                    setCommandQuery('');
                  }
                }}
              />
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filteredCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      setShowCommandPalette(false);
                      setCommandQuery('');
                    }}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      color: '#D4C5A0',
                      fontSize: '11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #1A1A1A',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <span style={{ color: '#8B7D6B', fontSize: '9px' }}>{cmd.shortcut}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor Surface */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            {/* Line Numbers */}
            <div
              id="line-numbers"
              style={{
                width: '48px',
                flexShrink: 0,
                background: '#0D0D0D',
                borderRight: '1px solid #1A1A1A',
                overflow: 'hidden',
                textAlign: 'right',
                paddingRight: '8px',
                paddingTop: '8px',
                userSelect: 'none',
              }}
            >
              {lines.map((_, i) => (
                <div
                  key={i}
                  style={{
                    color: i + 1 === cursorLine ? '#C8A84B' : '#555555',
                    fontSize: '12px',
                    lineHeight: '20px',
                    height: '20px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea + Highlight Layer */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {/* Syntax Highlight Layer */}
              <div
                id="highlight-layer"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '8px 12px',
                  fontSize: '12px',
                  lineHeight: '20px',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'pre',
                  overflow: 'hidden',
                  color: '#D4C5A0',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
                aria-hidden="true"
              >
                <div dangerouslySetInnerHTML={{ __html: highlighted }} />
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={activeFile.content}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onScroll={handleEditorScroll}
                spellCheck={false}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '8px 12px',
                  fontSize: '12px',
                  lineHeight: '20px',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'pre',
                  overflow: 'auto',
                  background: 'transparent',
                  color: 'transparent',
                  caretColor: '#FF0000',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  zIndex: 2,
                }}
              />
            </div>

            {/* Minimap */}
            {minimapVisible && (
              <div
                style={{
                  width: '80px',
                  flexShrink: 0,
                  background: '#0D0D0D',
                  borderLeft: '1px solid #1A1A1A',
                  overflow: 'hidden',
                  padding: '4px',
                  userSelect: 'none',
                }}
              >
                {minimapLines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '2px',
                      lineHeight: '3px',
                      height: '3px',
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'pre',
                      overflow: 'hidden',
                      color: '#555555',
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Run Output */}
          {runOutput !== null && (
            <div
              style={{
                height: '120px',
                flexShrink: 0,
                background: '#0D0D0D',
                borderTop: '1px solid #1E1E1E',
                overflow: 'auto',
                padding: '8px 12px',
              }}
            >
              <div
                style={{
                  color: '#C8A84B',
                  fontSize: '10px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>⚙ Output</span>
                <button
                  onClick={() => setRunOutput(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8B7D6B',
                    cursor: 'pointer',
                    fontSize: '10px',
                  }}
                >
                  ✕
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  color: '#D4C5A0',
                  fontSize: '11px',
                  lineHeight: '1.6',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {runOutput}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Status Bar ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '4px 12px',
          background: '#111111',
          borderTop: '1px solid #1E1E1E',
          flexShrink: 0,
          fontSize: '10px',
          color: '#8B7D6B',
        }}
      >
        <span>
          Ln {cursorLine}, Col {cursorCol}
        </span>
        <span style={{ color: '#00BFBF' }}>{activeFile.language.toUpperCase()}</span>
        <span>UTF-8</span>
        <span>{activeFile.isModified ? '● Modified' : 'Saved'}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#C8A84B' }}>Spaces: 2</span>
        <button
          onClick={() => setMinimapVisible((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            color: minimapVisible ? '#00BFBF' : '#555',
            cursor: 'pointer',
            fontSize: '10px',
            fontFamily: 'inherit',
          }}
        >
          Minimap
        </button>
      </div>
    </div>
  );
}
