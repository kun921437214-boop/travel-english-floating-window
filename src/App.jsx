import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rawTravelData from './data/travel-english.json';

const APP_TITLE = '澳新旅行英语';
const STORAGE_KEY = 'travel-english-floating-window:v1';
const REVIEW_STATUSES = ['未学', '学习中', '已掌握'];
const SPEEDS = [
  { label: '慢速', value: 0.7 },
  { label: '正常', value: 1 },
  { label: '快速', value: 1.2 }
];

const DEFAULT_FILTERS = {
  category: '全部',
  priority: '全部',
  type: 'all',
  search: ''
};

const DEFAULT_SETTINGS = {
  reviewStatuses: {},
  hideChinese: false,
  miniMode: false,
  filters: DEFAULT_FILTERS,
  speechRate: 1,
  alwaysOnTop: true
};

function safeParseSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      reviewStatuses:
        saved && typeof saved.reviewStatuses === 'object' && !Array.isArray(saved.reviewStatuses)
          ? saved.reviewStatuses
          : {},
      filters: {
        ...DEFAULT_FILTERS,
        ...(saved && typeof saved.filters === 'object' && !Array.isArray(saved.filters) ? saved.filters : {})
      },
      speechRate: [0.7, 1, 1.2].includes(Number(saved?.speechRate)) ? Number(saved.speechRate) : 1,
      alwaysOnTop: typeof saved?.alwaysOnTop === 'boolean' ? saved.alwaysOnTop : true
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function normalizeData(data) {
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

function typeLabel(type) {
  return type === 'word' ? '单词' : '句子';
}

function getSpeechEngine() {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis || null;
}

function chooseEnglishVoice(voices) {
  const priorities = ['en-NZ', 'en-AU', 'en-GB', 'en-US'];
  for (const lang of priorities) {
    const exact = voices.find((voice) => voice.lang === lang);
    if (exact) return exact;
  }
  return voices.find((voice) => /^en/i.test(voice.lang)) || voices[0] || null;
}

export default function App() {
  const initialSettings = useMemo(() => safeParseSettings(), []);
  const baseData = useMemo(() => normalizeData(rawTravelData), []);
  const [reviewStatuses, setReviewStatuses] = useState(initialSettings.reviewStatuses);
  const [hideChinese, setHideChinese] = useState(initialSettings.hideChinese);
  const [miniMode, setMiniMode] = useState(initialSettings.miniMode);
  const [filters, setFilters] = useState(initialSettings.filters);
  const [speechRate, setSpeechRate] = useState(initialSettings.speechRate);
  const [alwaysOnTop, setAlwaysOnTopState] = useState(initialSettings.alwaysOnTop);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [voices, setVoices] = useState([]);
  const [speechWarning, setSpeechWarning] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const utteranceRef = useRef(null);

  const data = useMemo(
    () =>
      baseData.map((item) => ({
        ...item,
        reviewStatus: reviewStatuses[item.id] || item.reviewStatus || '未学'
      })),
    [baseData, reviewStatuses]
  );

  const categories = useMemo(() => ['全部', ...Array.from(new Set(data.map((item) => item.category))).sort()], [data]);
  const priorities = useMemo(() => ['全部', ...Array.from(new Set(data.map((item) => item.priority))).sort()], [data]);

  const filteredData = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesCategory = filters.category === '全部' || item.category === filters.category;
      const matchesPriority = filters.priority === '全部' || item.priority === filters.priority;
      const matchesType = filters.type === 'all' || item.type === filters.type;
      const matchesKeyword =
        !keyword ||
        item.english.toLowerCase().includes(keyword) ||
        item.chinese.toLowerCase().includes(keyword) ||
        item.note.toLowerCase().includes(keyword);
      return matchesCategory && matchesPriority && matchesType && matchesKeyword;
    });
  }, [data, filters]);

  const currentItem = filteredData[currentIndex] || null;

  const stopSpeech = useCallback(() => {
    const speech = getSpeechEngine();
    if (speech) speech.cancel();
    utteranceRef.current = null;
  }, []);

  const goToIndex = useCallback(
    (nextIndex) => {
      stopSpeech();
      if (filteredData.length === 0) {
        setCurrentIndex(0);
        return;
      }
      const safeIndex = ((nextIndex % filteredData.length) + filteredData.length) % filteredData.length;
      setCurrentIndex(safeIndex);
    },
    [filteredData.length, stopSpeech]
  );

  const goPrev = useCallback(() => goToIndex(currentIndex - 1), [currentIndex, goToIndex]);
  const goNext = useCallback(() => goToIndex(currentIndex + 1), [currentIndex, goToIndex]);

  const goRandom = useCallback(() => {
    stopSpeech();
    if (filteredData.length <= 1) {
      setCurrentIndex(0);
      return;
    }
    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * filteredData.length);
    }
    setCurrentIndex(nextIndex);
  }, [currentIndex, filteredData.length, stopSpeech]);

  const speakCurrent = useCallback(() => {
    if (!currentItem) return;
    const speech = getSpeechEngine();
    if (!speech || typeof SpeechSynthesisUtterance === 'undefined') {
      setSpeechWarning('当前系统不支持朗读或未找到可用语音');
      return;
    }

    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(currentItem.english);
    const availableVoices = speech.getVoices();
    const selectedVoice = chooseEnglishVoice(availableVoices);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || 'en-US';
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = speechRate;
    utteranceRef.current = utterance;
    utterance.onend = () => {
      if (utteranceRef.current === utterance) utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setSpeechWarning('当前系统不支持朗读或未找到可用语音');
      utteranceRef.current = null;
    };
    setSpeechWarning('');
    speech.speak(utterance);
  }, [currentItem, speechRate, stopSpeech]);

  const updateFilter = useCallback((key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value
    }));
    setCurrentIndex(0);
  }, []);

  const markReviewStatus = useCallback(
    (status) => {
      if (!currentItem) return;
      setReviewStatuses((previous) => ({
        ...previous,
        [currentItem.id]: status
      }));
    },
    [currentItem]
  );

  const toggleAlwaysOnTop = useCallback(async () => {
    if (!window.electronAPI?.toggleAlwaysOnTop) {
      setAlwaysOnTopState((value) => !value);
      return;
    }
    const status = await window.electronAPI.toggleAlwaysOnTop();
    setAlwaysOnTopState(Boolean(status));
  }, []);

  const toggleMiniMode = useCallback(() => {
    stopSpeech();
    setShowSearch(false);
    setShowFilters(false);
    setMiniMode((value) => !value);
  }, [stopSpeech]);

  const toggleSearch = useCallback(() => {
    if (miniMode) setMiniMode(false);
    setShowSearch((value) => !value);
    setShowFilters(false);
  }, [miniMode]);

  const toggleFilters = useCallback(() => {
    if (miniMode) setMiniMode(false);
    setShowFilters((value) => !value);
    setShowSearch(false);
  }, [miniMode]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        reviewStatuses,
        hideChinese,
        miniMode,
        filters,
        speechRate,
        alwaysOnTop
      })
    );
  }, [reviewStatuses, hideChinese, miniMode, filters, speechRate, alwaysOnTop]);

  useEffect(() => {
    if (currentIndex >= filteredData.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, filteredData.length]);

  useEffect(() => {
    const speech = getSpeechEngine();
    if (!speech) {
      setSpeechWarning('当前系统不支持朗读或未找到可用语音');
      return undefined;
    }

    const loadVoices = () => setVoices(speech.getVoices());
    loadVoices();
    speech.onvoiceschanged = loadVoices;

    return () => {
      speech.onvoiceschanged = null;
      speech.cancel();
    };
  }, []);

  useEffect(() => {
    if (window.electronAPI?.setAlwaysOnTop) {
      window.electronAPI.setAlwaysOnTop(alwaysOnTop).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.setWindowSize) return;
    if (miniMode) {
      window.electronAPI.setWindowSize(320, 160).catch(() => {});
      return;
    }
    if (showSearch || showFilters) {
      window.electronAPI.setWindowSize(420, 320).catch(() => {});
      return;
    }
    window.electronAPI.setWindowSize(360, 220).catch(() => {});
  }, [miniMode, showSearch, showFilters]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === ' ') {
        event.preventDefault();
        speakCurrent();
      } else if (event.key.toLowerCase() === 'h') {
        setHideChinese((value) => !value);
      } else if (event.key.toLowerCase() === 'm') {
        toggleMiniMode();
      } else if (event.key.toLowerCase() === 'r') {
        goRandom();
      } else if (event.key.toLowerCase() === 's') {
        stopSpeech();
      } else if (event.key === '1') {
        markReviewStatus('未学');
      } else if (event.key === '2') {
        markReviewStatus('学习中');
      } else if (event.key === '3') {
        markReviewStatus('已掌握');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, goRandom, markReviewStatus, speakCurrent, stopSpeech, toggleMiniMode]);

  const typeFilterLabel = filters.type === 'all' ? '全部类型' : typeLabel(filters.type);
  const noSourceData = data.length === 0;

  return (
    <main className={`app-shell ${miniMode ? 'is-mini' : ''}`}>
      <section className={`floating-card ${miniMode ? 'mini' : ''} ${showSearch || showFilters ? 'expanded' : ''}`}>
        {!miniMode && (
          <header className="card-header toolbar">
            <div className="title-block">
              <div className="app-title">{APP_TITLE}</div>
              <div className="progress">
                {data.length === 0 ? '0 / 0' : `${Math.min(currentIndex + 1, filteredData.length)} / ${filteredData.length}`}
              </div>
            </div>
            <div className="window-actions no-drag">
              <button type="button" className={showSearch ? 'is-active' : ''} onClick={toggleSearch} title="搜索">
                搜
              </button>
              <button type="button" className={showFilters ? 'is-active' : ''} onClick={toggleFilters} title="筛选">
                筛
              </button>
              <button type="button" className={alwaysOnTop ? 'is-active' : ''} onClick={toggleAlwaysOnTop} title="切换置顶">
                置
              </button>
              <button type="button" onClick={toggleMiniMode} title="迷你模式">
                -
              </button>
              <button type="button" className="close-button" onClick={() => window.electronAPI?.quitApp?.()} title="关闭">
                ×
              </button>
            </div>
          </header>
        )}

        {miniMode && (
          <button type="button" className="mini-expand no-drag" onClick={toggleMiniMode} title="展开">
            +
          </button>
        )}

        {!miniMode && showSearch && (
          <div className="search-panel no-drag">
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="搜索英文、中文或提示"
            />
          </div>
        )}

        {!miniMode && showFilters && (
          <div className="filter-panel no-drag">
            <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
              <option value="all">全部类型</option>
              <option value="sentence">句子</option>
              <option value="word">单词</option>
            </select>
          </div>
        )}

        <div className="card-content" aria-live="polite">
          {noSourceData ? (
            <div className="empty-state">
              <strong>暂无学习数据</strong>
              <span>请运行 npm run convert:data</span>
            </div>
          ) : currentItem ? (
            <>
              <div className="english-text">{currentItem.english}</div>
              {!hideChinese && <div className="chinese-text">{currentItem.chinese || '暂无中文意思'}</div>}
              {!miniMode && (
                <div className="meta-row">
                  <span>{currentItem.category}</span>
                  <span>{typeLabel(currentItem.type)}</span>
                  <span>{currentItem.priority}</span>
                  <span>{currentItem.reviewStatus}</span>
                </div>
              )}
              {!miniMode && currentItem.note && <div className="note-text">{currentItem.note}</div>}
            </>
          ) : (
            <div className="empty-state">
              <strong>当前筛选条件下没有内容</strong>
              <span>
                {filters.category} · {filters.priority} · {typeFilterLabel}
              </span>
            </div>
          )}
        </div>

        {!miniMode && speechWarning && <div className="warning no-drag">{speechWarning}</div>}

        {!miniMode && showFilters && (
          <div className="extra-panel no-drag">
            <label>
              语速
              <select value={speechRate} onChange={(event) => setSpeechRate(Number(event.target.value))}>
                {SPEEDS.map((speed) => (
                  <option key={speed.value} value={speed.value}>
                    {speed.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={goRandom} disabled={filteredData.length === 0}>
              随机
            </button>
            <button type="button" onClick={stopSpeech}>
              停止
            </button>
            <button type="button" onClick={() => setHideChinese((value) => !value)}>
              {hideChinese ? '显示中文' : '隐藏中文'}
            </button>
          </div>
        )}

        {!miniMode && showFilters && (
          <div className="status-row no-drag">
            {REVIEW_STATUSES.map((status) => (
              <button
                type="button"
                key={status}
                className={currentItem?.reviewStatus === status ? 'is-active' : ''}
                onClick={() => markReviewStatus(status)}
                disabled={!currentItem}
              >
                {status}
              </button>
            ))}
            <span>{voices.length > 0 ? `${voices.length} 个语音` : '等待语音'}</span>
          </div>
        )}

        <footer className="card-footer controls no-drag">
          <button type="button" onClick={goPrev} disabled={filteredData.length === 0}>
            上一条
          </button>
          <button type="button" className="speak-button" onClick={speakCurrent} disabled={!currentItem}>
            朗读
          </button>
          <button type="button" onClick={goNext} disabled={filteredData.length === 0}>
            下一条
          </button>
        </footer>
      </section>
    </main>
  );
}
