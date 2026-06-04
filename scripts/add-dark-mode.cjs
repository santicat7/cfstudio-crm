const fs = require('fs')
const path = require('path')

// Replacements: [find, replace]
// Order matters — more specific first
const replacements = [
  // Backgrounds
  ['hover:bg-[#F5F0E8]',    'hover:bg-[#F5F0E8] dark:hover:bg-[#1E1B17]'],
  ['bg-[#FDFBF7]',          'bg-[#FDFBF7] dark:bg-[#1E1B17]'],
  ['bg-[#F5F0E8]',          'bg-[#F5F0E8] dark:bg-[#141210]'],

  // Borders
  ['border-[#E0D9CE]',      'border-[#E0D9CE] dark:border-[#2A2520]'],
  ['border-b border-[#E0D9CE] dark:border-[#2A2520]', 'border-b border-[#E0D9CE] dark:border-[#2A2520]'], // avoid double

  // Main text
  ['text-[#1A1814]',        'text-[#1A1814] dark:text-[#EDE7DC]'],

  // Muted text
  ['text-[#444]',           'text-[#444] dark:text-[#B8AFA8]'],
  ['text-[#555]',           'text-[#555] dark:text-[#A8A098]'],
  ['text-[#666]',           'text-[#666] dark:text-[#998E88]'],
  ['text-[#888]',           'text-[#888] dark:text-[#7A7068]'],
  ['text-[#AAA]',           'text-[#AAA] dark:text-[#5A5450]'],
  ['text-[#CCC]',           'text-[#CCC] dark:text-[#4A4440]'],
]

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let changed = false

  for (const [find, replace] of replacements) {
    // Skip if the dark: variant is already present anywhere in the file
    const darkVariant = replace.split(' ').find(c => c.startsWith('dark:'))
    if (darkVariant && content.includes(darkVariant)) continue

    if (content.includes(find)) {
      content = content.split(find).join(replace)
      changed = true
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log('✓', path.basename(filePath))
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) {
      walkDir(full)
    } else if (entry.isFile() && entry.name.endsWith('.jsx')) {
      // Skip files that are already handled structurally
      if (['Sidebar.jsx', 'Layout.jsx'].includes(entry.name)) continue
      processFile(full)
    }
  }
}

const srcDir = path.join(__dirname, '..', 'src')
walkDir(srcDir)
console.log('\nDark mode variants applied.')
