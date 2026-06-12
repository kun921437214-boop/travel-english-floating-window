import rawTravelData from '../data/travel-english.json';

export function normalizeTravelData(data = rawTravelData) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item) => item && typeof item === 'object' && String(item.english || '').trim())
    .map((item, index) => ({
      id: String(item.id || `item-${index}`),
      type: item.type === 'word' ? 'word' : 'sentence',
      category: String(item.category || '未分类'),
      english: String(item.english || ''),
      chinese: String(item.chinese || ''),
      priority: String(item.priority || 'B 常用'),
      note: String(item.note || ''),
      reviewStatus: String(item.reviewStatus || '未学'),
      sourceSheet: String(item.sourceSheet || '')
    }));
}

export const travelData = normalizeTravelData();
