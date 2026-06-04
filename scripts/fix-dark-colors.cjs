const fs = require('fs')
const path = require('path')

// Replace old harsh dark colors with softer warm palette
const replacements = [
  // Page backgrounds
  ['dark:bg-[#141210]',       'dark:bg-[#1C1916]'],
  ['dark:hover:bg-[#141210]', 'dark:hover:bg-[#1C1916]'],

  // Card/surface backgrounds
  ['dark:bg-[#1E1B17]',       'dark:bg-[#232019]'],
  ['dark:hover:bg-[#1E1B17]', 'dark:hover:bg-[#2A2620]'],

  // Borders
  ['dark:border-[#2A2520]',   'dark:border-[#2E2923]'],

  // Main text — softer warm gray instead of near-white
  ['dark:text-[#EDE7DC]',     'dark:text-[#C8C0B4]'],

  // Muted text — slightly adjusted
  ['dark:text-[#7A7068]',     'dark:text-[#7A7068]'], // keep
  ['dark:text-[#998E88]',     'dark:text-[#998E88]'], // keep
  ['dark:text-[#B8AFA8]',     'dark:text-[#B8AFA8]'], // keep
  ['dark:text-[#5A5450]',     'dark:text-[#5A5450]'], // keep
  ['dark:text-[#4A4440]',     'dark:text-[#4A4440]'], // keep
]

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let changed = false

  for (const [find, replace] of replacements) {
    if (find === replace) continue
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
    } else if (entry.isFile() && (entry.name.endsWith('.jsx') || entry.name.endsWith('.js'))) {
      processFile(full)
    }
  }
}

const srcDir = path.join(__dirname, '..', 'src')
walkDir(srcDir)
console.log('\nDark palette softened.')
