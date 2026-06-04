const fs = require('fs')
const path = require('path')

// Files to skip (handled manually / intentionally always-dark)
const SKIP = ['Sidebar.jsx']

// base hex token -> semantic class
const MAP = {
  // TEXT
  'text-[#1A1814]': 'text-body',
  'text-[#555]':    'text-soft',
  'text-[#666]':    'text-soft',
  'text-[#444]':    'text-soft',
  'text-[#888]':    'text-muted',
  'text-[#AAA]':    'text-faint',
  'text-[#BBB]':    'text-faint',
  'text-[#CCC]':    'text-dim',
  'text-[#DDD]':    'text-dim',
  'text-[#E0E0E0]': 'text-dim',
  'text-[#C9A96E]': 'text-gold',
  'text-[#8B6A35]': 'text-golddk',

  // BACKGROUNDS
  'bg-[#FDFBF7]':   'bg-card',
  'bg-[#F5F0E8]':   'bg-page',
  'bg-[#F7F7F7]':   'bg-page',
  'bg-[#F0EBE1]':   'bg-subtle',
  'bg-[#EDE7DC]':   'bg-subtle',
  'bg-[#D9D9D9]':   'bg-subtle',
  'bg-[#2C2620]':   'bg-inkh',
  'bg-[#1A1814]':   'bg-ink',
  'bg-[#C9A96E]':   'bg-gold',
  'bg-[#8B6A35]':   'bg-golddk',
  'bg-[#AAAAAA]':   'bg-dot',

  // BORDERS
  'border-[#E0D9CE]': 'border-line',
  'border-[#D9D9D9]': 'border-line',
  'border-[#F5F5F5]': 'border-line',
  'border-[#F8F8F8]': 'border-line',
  'border-[#EEEEEE]': 'border-line',
  'border-[#CCC]':    'border-line',
  'border-[#888]':    'border-line',
  'border-[#1A1814]': 'border-strong',
  'border-[#C9A96E]': 'border-gold',
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const before = content

  // 1) Strip every dark: utility token (and its leading whitespace)
  content = content.replace(/\s*dark:[^\s"'`]+/g, '')

  // 2) Map remaining hardcoded hex -> semantic classes
  //    (works for prefixed variants too: hover:text-[#1A1814] -> hover:text-body)
  for (const [find, replace] of Object.entries(MAP)) {
    content = content.split(find).join(replace)
  }

  // 3) Collapse accidental double spaces inside className strings
  content = content.replace(/className="([^"]*)"/g, (m, cls) =>
    'className="' + cls.replace(/\s{2,}/g, ' ').trim() + '"'
  )

  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log('✓', path.basename(filePath))
  }
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory() && !['node_modules', '.git', 'dist'].includes(e.name)) {
      walk(full)
    } else if (e.isFile() && e.name.endsWith('.jsx') && !SKIP.includes(e.name)) {
      processFile(full)
    }
  }
}

walk(path.join(__dirname, '..', 'src'))
console.log('\nSemantic color migration done.')
