import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const excelPath = path.join(projectRoot, 'data', '澳新旅行英语_340句_915词.xlsx');
const outputPath = path.join(projectRoot, 'src', 'data', 'travel-english.json');

const aliases = {
  category: ['场景', '分类', 'category', '场景分类'],
  sentenceEnglish: ['英文句子', '英语句子', '旅行句子', '句子', '英文', 'English', 'english', '英语'],
  wordEnglish: ['单词/短语', '单词短语', '单词', '短语', '词汇', 'Word', 'word', 'Phrase', 'phrase'],
  englishAny: ['英文', 'English', 'english', '句子', '英语', '单词', '短语', 'Word', 'word', 'Phrase', 'phrase', '单词/短语'],
  chinese: ['中文', '中文意思', '含义', '释义', 'Chinese', 'chinese', 'meaning', 'Meaning'],
  priority: ['优先级', 'Priority', 'priority'],
  note: ['使用提示', '提示', 'Note', 'note', '备注'],
  reviewStatus: ['复习状态', '学习状态', 'reviewStatus', 'status', 'Status']
};

function normalizeHeader(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）_\-:：/\\]/g, '');
}

function findColumn(headers, candidates) {
  const normalized = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header)
  }));
  const normalizedCandidates = candidates.map(normalizeHeader);

  for (const candidate of normalizedCandidates) {
    const exact = normalized.find((header) => header.normalized === candidate);
    if (exact) return exact.original;
  }

  for (const candidate of normalizedCandidates) {
    const fuzzy = normalized.find((header) => {
      if (!header.normalized || !candidate) return false;
      return header.normalized.includes(candidate) || candidate.includes(header.normalized);
    });
    if (fuzzy) return fuzzy.original;
  }

  return '';
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePriority(value) {
  const text = cleanText(value);
  if (!text) return 'B 常用';
  if (/^a\b|a\s*必背|必背/i.test(text)) return 'A 必背';
  if (/^b\b|b\s*常用|常用/i.test(text)) return 'B 常用';
  if (/^c\b|c\s*备用|备用/i.test(text)) return 'C 备用';
  return text;
}

function normalizeReviewStatus(value) {
  const text = cleanText(value);
  if (!text) return '未学';
  if (/掌握|完成|done|master/i.test(text)) return '已掌握';
  if (/学习|复习|进行|中|learning|review/i.test(text)) return '学习中';
  if (/未学|未开始|new|todo/i.test(text)) return '未学';
  return text;
}

function inferType(english, preferredType = '') {
  if (preferredType === 'sentence' || preferredType === 'word') return preferredType;
  const text = cleanText(english);
  const words = text.split(/\s+/).filter(Boolean);
  const hasSentencePunctuation = /[.!?。！？]/.test(text);
  if (hasSentencePunctuation || words.length >= 4 || text.length >= 36) return 'sentence';
  return 'word';
}

function looksLikeEnglishContent(value) {
  return /[A-Za-z]/.test(cleanText(value));
}

function hashText(value) {
  let hash = 5381;
  for (const char of String(value)) {
    hash = (hash * 33) ^ char.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}

function makeItem({ sheetName, rowIndex, english, chinese, category, priority, note, reviewStatus, preferredType }) {
  const type = inferType(english, preferredType);
  const cleanedEnglish = cleanText(english);
  return {
    id: `${hashText(sheetName)}-${rowIndex + 1}-${type}-${hashText(cleanedEnglish)}`,
    type,
    category: cleanText(category) || '未分类',
    english: cleanedEnglish,
    chinese: cleanText(chinese),
    priority: normalizePriority(priority),
    note: cleanText(note),
    reviewStatus: normalizeReviewStatus(reviewStatus),
    sourceSheet: sheetName
  };
}

function writeOutput(data) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

if (!fs.existsSync(excelPath)) {
  writeOutput([]);
  console.warn(`未找到 Excel 文件：${excelPath}`);
  console.log('请把 Excel 文件放到 data 文件夹中，然后运行 npm run convert:data');
  console.log('共读取了 0 个工作表');
  console.log('共转换了 0 条句子');
  console.log('共转换了 0 个单词/短语');
  console.log(`输出文件路径：${outputPath}`);
  process.exit(0);
}

const { default: XLSX } = await import('xlsx');
const workbook = XLSX.readFile(excelPath, {
  cellDates: false,
  raw: false
});

const items = [];
let sentenceCount = 0;
let wordCount = 0;

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
    blankrows: false
  });

  for (const [rowIndex, row] of rows.entries()) {
    const headers = Object.keys(row);
    if (headers.length === 0) continue;

    const categoryColumn = findColumn(headers, aliases.category);
    const sentenceColumn = findColumn(headers, aliases.sentenceEnglish);
    const wordColumn = findColumn(headers, aliases.wordEnglish);
    const anyEnglishColumn = findColumn(headers, aliases.englishAny);
    const chineseColumn = findColumn(headers, aliases.chinese);
    const priorityColumn = findColumn(headers, aliases.priority);
    const noteColumn = findColumn(headers, aliases.note);
    const reviewStatusColumn = findColumn(headers, aliases.reviewStatus);

    const sharedFields = {
      sheetName,
      rowIndex,
      chinese: chineseColumn ? row[chineseColumn] : '',
      category: categoryColumn ? row[categoryColumn] : '',
      priority: priorityColumn ? row[priorityColumn] : '',
      note: noteColumn ? row[noteColumn] : '',
      reviewStatus: reviewStatusColumn ? row[reviewStatusColumn] : ''
    };

    const rowItems = [];
    const sentenceEnglish = sentenceColumn ? cleanText(row[sentenceColumn]) : '';
    const wordEnglish = wordColumn ? cleanText(row[wordColumn]) : '';
    const anyEnglish = anyEnglishColumn ? cleanText(row[anyEnglishColumn]) : '';

    if (sentenceEnglish) {
      rowItems.push(makeItem({ ...sharedFields, english: sentenceEnglish, preferredType: inferType(sentenceEnglish) }));
    }

    if (wordEnglish && wordEnglish !== sentenceEnglish) {
      rowItems.push(makeItem({ ...sharedFields, english: wordEnglish, preferredType: 'word' }));
    }

    if (rowItems.length === 0 && anyEnglish) {
      rowItems.push(makeItem({ ...sharedFields, english: anyEnglish }));
    }

    for (const item of rowItems) {
      if (!item.english) continue;
      if (!looksLikeEnglishContent(item.english)) continue;
      items.push(item);
      if (item.type === 'sentence') sentenceCount += 1;
      if (item.type === 'word') wordCount += 1;
    }
  }
}

writeOutput(items);

console.log(`共读取了 ${workbook.SheetNames.length} 个工作表`);
console.log(`共转换了 ${sentenceCount} 条句子`);
console.log(`共转换了 ${wordCount} 个单词/短语`);
console.log(`输出文件路径：${outputPath}`);
