import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import rawTravelData from './data/travel-english.json';
import wuqiuBlue from './assets/wuqiu/wuqiu_blue_drumsticks.png';
import wuqiuGreen from './assets/wuqiu/wuqiu_green_guitar.png';
import wuqiuPink from './assets/wuqiu/wuqiu_pink_mic.png';
import wuqiuRed from './assets/wuqiu/wuqiu_red_headphones.png';
import wuqiuRow from './assets/wuqiu/wuqiu_row.png';
import wuqiuYellow from './assets/wuqiu/wuqiu_yellow_25th.png';

const APP_TITLE = '澳新旅行英语';
const STORAGE_KEY = 'travel-english-floating-window:v1';
const LAST_SESSION_KEY = 'travelEnglish:lastSession:v1';
const REVIEW_STATUSES = ['未学', '学习中', '已掌握'];
const STUDY_MODES = {
  sequence: 'sequence',
  randomReview: 'randomReview'
};
const SPEEDS = [
  { label: '慢速', value: 0.7 },
  { label: '正常', value: 1 },
  { label: '快速', value: 1.2 }
];

const DEFAULT_FILTERS = {
  category: '全部',
  priority: '全部',
  type: 'all',
  search: '',
  reviewStatus: '全部'
};

const DEFAULT_SETTINGS = {
  reviewStatuses: {},
  hideChinese: false,
  miniMode: false,
  filters: DEFAULT_FILTERS,
  speechRate: 1,
  alwaysOnTop: true,
  studyMode: STUDY_MODES.sequence
};

function normalizeStudyMode(value) {
  return value === STUDY_MODES.randomReview ? STUDY_MODES.randomReview : STUDY_MODES.sequence;
}

function safeReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable or full; losing this hint should never break learning.
  }
}

function normalizeFilters(filters) {
  const source = filters && typeof filters === 'object' && !Array.isArray(filters) ? filters : {};
  return {
    ...DEFAULT_FILTERS,
    ...source,
    category: String(source.category || DEFAULT_FILTERS.category),
    priority: String(source.priority || DEFAULT_FILTERS.priority),
    type: source.type === '全部' ? 'all' : ['all', 'sentence', 'word'].includes(source.type) ? source.type : DEFAULT_FILTERS.type,
    search: String(source.search || source.query || DEFAULT_FILTERS.search)
  };
}

function filterItems(items, filters) {
  const safeFilters = normalizeFilters(filters);
  const keyword = safeFilters.search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesCategory = safeFilters.category === '全部' || item.category === safeFilters.category;
    const matchesPriority = safeFilters.priority === '全部' || item.priority === safeFilters.priority;
    const matchesType = safeFilters.type === 'all' || item.type === safeFilters.type;
    const matchesReviewStatus = safeFilters.reviewStatus === '全部' || item.reviewStatus === safeFilters.reviewStatus;
    const matchesKeyword =
      !keyword ||
      item.english.toLowerCase().includes(keyword) ||
      item.chinese.toLowerCase().includes(keyword) ||
      item.note.toLowerCase().includes(keyword);
    return matchesCategory && matchesPriority && matchesType && matchesReviewStatus && matchesKeyword;
  });
}

function findItemForRestore(items, session) {
  if (!session || !items.length) return null;
  if (session.lastItemId) {
    const byId = items.find((item) => item.id === session.lastItemId);
    if (byId) return byId;
  }
  if (session.lastEnglish && session.lastChinese) {
    const byText = items.find((item) => item.english === session.lastEnglish && item.chinese === session.lastChinese);
    if (byText) return byText;
  }
  if (session.lastEnglish) {
    const byEnglish = items.find((item) => item.english === session.lastEnglish);
    if (byEnglish) return byEnglish;
  }
  if (Number.isInteger(session.lastIndex) && session.lastIndex >= 0 && session.lastIndex < items.length) {
    return items[session.lastIndex];
  }
  return null;
}

function getInitialSessionState(items, settings) {
  const session = safeReadJson(LAST_SESSION_KEY, null);
  const settingsFilters = normalizeFilters(settings.filters);
  const sessionFilters = normalizeFilters(session?.filters || settingsFilters);
  const restoredItem = findItemForRestore(items, session);

  if (!items.length) {
    return {
      filters: settingsFilters,
      currentIndex: 0,
      miniMode: settings.miniMode
    };
  }

  if (!restoredItem) {
    return {
      filters: settingsFilters,
      currentIndex: 0,
      miniMode: typeof session?.focusMode === 'boolean' ? session.focusMode : settings.miniMode
    };
  }

  const filteredWithSession = filterItems(items, sessionFilters);
  const indexInSessionFilters = filteredWithSession.findIndex((item) => item.id === restoredItem.id);
  if (indexInSessionFilters >= 0) {
    return {
      filters: sessionFilters,
      currentIndex: indexInSessionFilters,
      miniMode: typeof session?.focusMode === 'boolean' ? session.focusMode : settings.miniMode
    };
  }

  const clearedFilters = DEFAULT_FILTERS;
  const allIndex = items.findIndex((item) => item.id === restoredItem.id);
  return {
    filters: clearedFilters,
    currentIndex: allIndex >= 0 ? allIndex : 0,
    miniMode: typeof session?.focusMode === 'boolean' ? session.focusMode : settings.miniMode
  };
}

function getLengthClass(english) {
  const englishLength = english?.length || 0;
  if (englishLength > 110) return 'text-extra-long';
  if (englishLength > 80) return 'text-long';
  if (englishLength >= 45) return 'text-medium';
  return 'text-short';
}

function getInitialEnglishFontSize(lengthClass, miniMode) {
  if (miniMode) {
    if (lengthClass === 'text-short') return 28;
    if (lengthClass === 'text-medium') return 24;
    if (lengthClass === 'text-long') return 22;
    return 20;
  }
  if (lengthClass === 'text-short') return 28;
  if (lengthClass === 'text-medium') return 25;
  if (lengthClass === 'text-long') return 22;
  return 20;
}

function getChineseFontSize(lengthClass, miniMode) {
  if (miniMode) return 14;
  return lengthClass === 'text-long' || lengthClass === 'text-extra-long' ? 14 : 15;
}

function getTargetWindowSize({ lengthClass, miniMode, panelOpen, boosted }) {
  if (panelOpen) return { width: 560, height: 400 };
  if (miniMode) {
    if (boosted || lengthClass === 'text-long' || lengthClass === 'text-extra-long') return { width: 420, height: 190 };
    return { width: 340, height: 170 };
  }
  if (boosted || lengthClass === 'text-extra-long') return { width: 600, height: 380 };
  if (lengthClass === 'text-long') return { width: 560, height: 360 };
  if (lengthClass === 'text-medium') return { width: 540, height: 320 };
  return { width: 540, height: 300 };
}

function waitForLayoutFrames(frameCount = 2) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      resolve();
      return;
    }
    let remainingFrames = frameCount;
    const waitFrame = () => {
      remainingFrames -= 1;
      if (remainingFrames <= 0) {
        resolve();
        return;
      }
      window.requestAnimationFrame(waitFrame);
    };
    window.requestAnimationFrame(waitFrame);
  });
}

function safeParseSettings() {
  try {
    const saved = safeReadJson(STORAGE_KEY, {});
    const session = safeReadJson(LAST_SESSION_KEY, null);
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      reviewStatuses:
        saved && typeof saved.reviewStatuses === 'object' && !Array.isArray(saved.reviewStatuses)
          ? saved.reviewStatuses
          : {},
      filters: {
        ...DEFAULT_FILTERS,
        ...normalizeFilters(saved?.filters)
      },
      speechRate: [0.7, 1, 1.2].includes(Number(saved?.speechRate)) ? Number(saved.speechRate) : 1,
      alwaysOnTop: typeof saved?.alwaysOnTop === 'boolean' ? saved.alwaysOnTop : true,
      studyMode: normalizeStudyMode(saved?.studyMode || session?.studyMode)
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

function getCategoryIcon(category) {
  const speechLike = /万能|沟通|口语|餐厅|酒店|机场|问路|购物|点餐|求助|电话|对话|入住|租车|服务/i.test(category || '');
  return speechLike ? wuqiuPink : wuqiuGreen;
}

function getPriorityMeta(priority) {
  if (/^A|必背|重点/.test(priority || '')) {
    return { icon: wuqiuYellow, className: 'priority-a' };
  }
  if (/^C|备用/.test(priority || '')) {
    return { icon: wuqiuRed, className: 'priority-c' };
  }
  return { icon: wuqiuBlue, className: 'priority-b' };
}

function getReviewStatusMeta(status) {
  if (status === '已掌握') return { icon: wuqiuGreen, className: 'status-done' };
  if (status === '学习中') return { icon: wuqiuRed, className: 'status-learning' };
  return { icon: wuqiuYellow, className: 'status-new' };
}

function getStatusWeight(status) {
  if (status === '学习中') return 3;
  if (status === '已掌握') return 1;
  return 5;
}

function getPriorityWeight(priority) {
  const value = String(priority || '');
  if (/^A|必背|重点/.test(value)) return 3;
  if (/^B|常用/.test(value)) return 2;
  if (/^C|备用/.test(value)) return 1;
  return 1;
}

function getReviewWeight(item) {
  return getStatusWeight(item?.reviewStatus) + getPriorityWeight(item?.priority);
}

function pickWeightedRandomItem(candidates) {
  if (!candidates.length) return null;
  const weightedItems = candidates.map((item) => ({
    item,
    weight: Math.max(1, getReviewWeight(item))
  }));
  const totalWeight = weightedItems.reduce((total, entry) => total + entry.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const entry of weightedItems) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.item;
  }

  return weightedItems[weightedItems.length - 1].item;
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
  const initialSession = useMemo(() => getInitialSessionState(baseData, initialSettings), [baseData, initialSettings]);
  const [reviewStatuses, setReviewStatuses] = useState(initialSettings.reviewStatuses);
  const [hideChinese, setHideChinese] = useState(initialSettings.hideChinese);
  const [miniMode, setMiniMode] = useState(initialSession.miniMode);
  const [filters, setFilters] = useState(initialSession.filters);
  const [speechRate, setSpeechRate] = useState(initialSettings.speechRate);
  const [alwaysOnTop, setAlwaysOnTopState] = useState(initialSettings.alwaysOnTop);
  const [studyMode, setStudyMode] = useState(initialSettings.studyMode);
  const [currentIndex, setCurrentIndex] = useState(initialSession.currentIndex);
  const [voices, setVoices] = useState([]);
  const [speechWarning, setSpeechWarning] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [reviewedIds, setReviewedIds] = useState(() => new Set());
  const [reviewHistory, setReviewHistory] = useState([]);
  const [fitState, setFitState] = useState({
    englishFontSize: getInitialEnglishFontSize(getLengthClass(baseData[initialSession.currentIndex]?.english || ''), initialSession.miniMode),
    hideMeta: false,
    hideNote: false,
    allowBreak: false,
    windowBoost: false
  });
  const utteranceRef = useRef(null);
  const englishRef = useRef(null);
  const sentenceAreaRef = useRef(null);
  const latestSessionRef = useRef(null);
  const rendererReadyRef = useRef(false);

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
    return filterItems(data, filters);
  }, [data, filters]);
  const filteredIdsSignature = useMemo(() => filteredData.map((item) => item.id).join('|'), [filteredData]);

  const currentItem = filteredData[currentIndex] || null;
  const lengthClass = getLengthClass(currentItem?.english || '');

  const saveLastSession = useCallback(
    (item = currentItem, index = currentIndex) => {
      if (!item) return;
      const allItemsIndex = data.findIndex((candidate) => candidate.id === item.id);
      const payload = {
        lastItemId: item.id,
        lastIndex: allItemsIndex >= 0 ? allItemsIndex : index,
        lastEnglish: item.english,
        lastChinese: item.chinese,
        mode: miniMode ? 'focus' : 'standard',
        focusMode: miniMode,
        studyMode,
        filters: {
          ...filters,
          query: filters.search || '',
          reviewStatus: filters.reviewStatus || '全部'
        },
        hideChinese,
        speechRate,
        updatedAt: new Date().toISOString()
      };
      latestSessionRef.current = payload;
      safeWriteJson(LAST_SESSION_KEY, payload);
    },
    [currentIndex, currentItem, data, filters, hideChinese, miniMode, speechRate, studyMode]
  );

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

  const goNextRandomReview = useCallback(() => {
    stopSpeech();
    if (filteredData.length === 0) {
      setCurrentIndex(0);
      return;
    }
    if (filteredData.length === 1) {
      setCurrentIndex(0);
      setReviewHistory([filteredData[0].id]);
      setReviewedIds(new Set([filteredData[0].id]));
      return;
    }

    const currentId = currentItem?.id || '';
    let roundReset = false;
    let candidates = filteredData.filter((item) => item.id !== currentId && !reviewedIds.has(item.id));
    if (!candidates.length) {
      roundReset = true;
      candidates = filteredData.filter((item) => item.id !== currentId);
    }
    if (!candidates.length) candidates = filteredData;

    const nextItem = pickWeightedRandomItem(candidates);
    if (!nextItem) return;
    const nextIndex = filteredData.findIndex((item) => item.id === nextItem.id);
    if (nextIndex < 0) return;

    setCurrentIndex(nextIndex);
    setReviewedIds((previous) => {
      const next = roundReset ? new Set() : new Set(previous);
      if (currentId) next.add(currentId);
      next.add(nextItem.id);
      return next;
    });
    setReviewHistory((previous) => {
      const seeded = previous.length ? previous : currentId ? [currentId] : [];
      if (seeded[seeded.length - 1] === nextItem.id) return seeded;
      return [...seeded, nextItem.id].slice(-120);
    });
  }, [currentItem, filteredData, reviewedIds, stopSpeech]);

  const goPrevRandomReview = useCallback(() => {
    stopSpeech();
    if (reviewHistory.length <= 1) return;
    const previousId = reviewHistory[reviewHistory.length - 2];
    const previousIndex = filteredData.findIndex((item) => item.id === previousId);
    if (previousIndex < 0) return;
    setCurrentIndex(previousIndex);
    setReviewHistory((previous) => previous.slice(0, -1));
  }, [filteredData, reviewHistory, stopSpeech]);

  const goPrev = useCallback(() => {
    if (studyMode === STUDY_MODES.randomReview) {
      goPrevRandomReview();
      return;
    }
    goToIndex(currentIndex - 1);
  }, [currentIndex, goPrevRandomReview, goToIndex, studyMode]);

  const goNext = useCallback(() => {
    if (studyMode === STUDY_MODES.randomReview) {
      goNextRandomReview();
      return;
    }
    goToIndex(currentIndex + 1);
  }, [currentIndex, goNextRandomReview, goToIndex, studyMode]);

  const goRandom = useCallback(() => {
    if (studyMode === STUDY_MODES.randomReview) {
      goNextRandomReview();
      return;
    }
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
  }, [currentIndex, filteredData.length, goNextRandomReview, stopSpeech, studyMode]);

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

  const changeStudyMode = useCallback(
    (nextMode) => {
      const normalizedMode = normalizeStudyMode(nextMode);
      setStudyMode(normalizedMode);
      setReviewedIds(new Set());
      setReviewHistory(currentItem ? [currentItem.id] : []);
    },
    [currentItem]
  );

  const toggleStudyMode = useCallback(() => {
    changeStudyMode(studyMode === STUDY_MODES.randomReview ? STUDY_MODES.sequence : STUDY_MODES.randomReview);
  }, [changeStudyMode, studyMode]);

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
    safeWriteJson(STORAGE_KEY, {
      reviewStatuses,
      hideChinese,
      miniMode,
      filters,
      speechRate,
      alwaysOnTop,
      studyMode
    });
  }, [reviewStatuses, hideChinese, miniMode, filters, speechRate, alwaysOnTop, studyMode]);

  useEffect(() => {
    setReviewedIds(new Set());
    setReviewHistory(currentItem ? [currentItem.id] : []);
  }, [filteredIdsSignature]);

  useEffect(() => {
    saveLastSession();
  }, [saveLastSession]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (latestSessionRef.current) {
        safeWriteJson(LAST_SESSION_KEY, latestSessionRef.current);
      } else {
        saveLastSession();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveLastSession]);

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
    setFitState({
      englishFontSize: getInitialEnglishFontSize(lengthClass, miniMode),
      hideMeta: false,
      hideNote: false,
      allowBreak: false,
      windowBoost: false
    });
  }, [currentItem?.id, hideChinese, lengthClass, miniMode]);

  useEffect(() => {
    if (!window.electronAPI?.setWindowSize) {
      window.electronAPI?.notifyRendererReady?.().catch(() => {});
      return undefined;
    }
    let cancelled = false;
    let readyTimer = 0;
    const { width, height } = getTargetWindowSize({
      lengthClass,
      miniMode,
      panelOpen: showSearch || showFilters,
      boosted: fitState.windowBoost
    });

    window.electronAPI
      .setWindowSize(width, height)
      .then(() => waitForLayoutFrames(2))
      .then(() => window.electronAPI?.centerOrClampWindow?.())
      .then(() => {
        if (cancelled || rendererReadyRef.current) return;
        readyTimer = window.setTimeout(() => {
          if (cancelled || rendererReadyRef.current) return;
          rendererReadyRef.current = true;
          window.electronAPI?.notifyRendererReady?.().catch(() => {});
        }, 140);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (readyTimer) window.clearTimeout(readyTimer);
    };
  }, [fitState.windowBoost, lengthClass, miniMode, showFilters, showSearch]);

  useLayoutEffect(() => {
    const englishEl = englishRef.current;
    const sentenceAreaEl = sentenceAreaRef.current;
    if (!englishEl || !sentenceAreaEl || !currentItem) return undefined;

    let frameId = 0;
    const minFontSize = miniMode ? 18 : 20;

    const scheduleFit = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const englishOverflow = englishEl.scrollHeight > englishEl.clientHeight + 1;
        const areaOverflow = miniMode && sentenceAreaEl.scrollHeight > sentenceAreaEl.clientHeight + 1;
        if (!englishOverflow && !areaOverflow) return;

        setFitState((previous) => {
          if (previous.englishFontSize > minFontSize) {
            return {
              ...previous,
              englishFontSize: Math.max(minFontSize, previous.englishFontSize - 2)
            };
          }
          if (!previous.windowBoost) {
            return {
              ...previous,
              windowBoost: true
            };
          }
          if (!previous.hideNote) {
            return {
              ...previous,
              hideNote: true
            };
          }
          if (!previous.hideMeta) {
            return {
              ...previous,
              hideMeta: true
            };
          }
          if (!previous.allowBreak) {
            return {
              ...previous,
              allowBreak: true
            };
          }
          return previous;
        });
      });
    };

    scheduleFit();
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(englishEl);
    observer.observe(sentenceAreaEl);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [currentItem, fitState, hideChinese, miniMode]);

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
      } else if (event.key.toLowerCase() === 't') {
        toggleStudyMode();
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
  }, [goNext, goPrev, goRandom, markReviewStatus, speakCurrent, stopSpeech, toggleMiniMode, toggleStudyMode]);

  const typeFilterLabel = filters.type === 'all' ? '全部类型' : typeLabel(filters.type);
  const noSourceData = data.length === 0;
  const progressLabel = data.length === 0 ? '0 / 0' : `${Math.min(currentIndex + 1, filteredData.length)} / ${filteredData.length}`;
  const priorityMeta = getPriorityMeta(currentItem?.priority);
  const reviewStatusMeta = getReviewStatusMeta(currentItem?.reviewStatus);

  return (
    <main className={`app-shell ${miniMode ? 'is-mini' : ''}`}>
      <section
        className={`hud-card hud-window floating-card ${miniMode ? 'focus-mode mini' : 'standard-mode'} ${
          showSearch || showFilters ? 'expanded' : ''
        } ${studyMode === STUDY_MODES.randomReview ? 'random-review-mode' : 'sequence-mode'} ${lengthClass} ${
          fitState.hideMeta ? 'fit-hide-meta' : ''
        } ${fitState.hideNote ? 'fit-hide-note' : ''}`}
        style={{
          '--english-font-size': `${fitState.englishFontSize}px`,
          '--chinese-font-size': `${getChineseFontSize(lengthClass, miniMode)}px`
        }}
      >
        {!miniMode && (
          <header className="hud-header card-header toolbar">
            <div className="title-area hud-title-block title-block">
              <img src={wuqiuRow} className="wuqiu-title-icon wuqiu-title-row" alt="" />
              <span className="app-title">{APP_TITLE}</span>
              <span className="progress">{progressLabel}</span>
              <div className="study-mode-switch no-drag" aria-label="学习模式">
                <button
                  type="button"
                  className={studyMode === STUDY_MODES.sequence ? 'is-active' : ''}
                  onClick={() => changeStudyMode(STUDY_MODES.sequence)}
                  title="顺序学习"
                >
                  顺序
                </button>
                <button
                  type="button"
                  className={studyMode === STUDY_MODES.randomReview ? 'is-active' : ''}
                  onClick={() => changeStudyMode(STUDY_MODES.randomReview)}
                  title="随机复习"
                >
                  复习
                </button>
              </div>
            </div>
            <div className="hud-tools window-actions no-drag">
              <button type="button" className={`icon-button ${showSearch ? 'is-active' : ''}`} onClick={toggleSearch} title="搜索">
                搜
              </button>
              <button type="button" className={`icon-button ${showFilters ? 'is-active' : ''}`} onClick={toggleFilters} title="筛选">
                筛
              </button>
              <button type="button" className={`icon-button ${alwaysOnTop ? 'is-active' : ''}`} onClick={toggleAlwaysOnTop} title="切换置顶">
                置
              </button>
              <button type="button" className="icon-button" onClick={toggleMiniMode} title="迷你模式">
                小
              </button>
              <button type="button" className="icon-button" onClick={() => window.electronAPI?.minimizeWindow?.()} title="最小化">
                -
              </button>
              <button type="button" className="icon-button close-button" onClick={() => window.electronAPI?.closeWindow?.()} title="关闭">
                ×
              </button>
            </div>
          </header>
        )}

        {!miniMode && <img src={wuqiuRow} className="wuqiu-row-decoration" alt="" />}

        {miniMode && (
          <header className="hud-header focus-header">
            <div className="focus-title">
              <img src={wuqiuRow} className="focus-title-icon" alt="" />
              <span className="focus-progress">{progressLabel}</span>
            </div>
            <div className="focus-actions no-drag">
              <button type="button" className="mini-action mini-expand" onClick={toggleMiniMode} title="展开标准学习模式">
                +
              </button>
              <button
                type="button"
                className="mini-action mini-minimize"
                onClick={() => window.electronAPI?.minimizeWindow?.()}
                title="隐藏到任务栏"
              >
                -
              </button>
              <button
                type="button"
                className="mini-action mini-close close-button"
                onClick={() => window.electronAPI?.closeWindow?.()}
                title="关闭"
              >
                ×
              </button>
            </div>
          </header>
        )}

        {!miniMode && (showSearch || showFilters) && (
          <div className="utility-panel no-drag">
            {showSearch && (
              <div className="search-panel">
                <input
                  value={filters.search}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  placeholder="搜索英文、中文或提示"
                />
              </div>
            )}

            {showFilters && (
              <div className="filter-panel">
                <div className="filter-grid">
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
                    {hideChinese ? '显中' : '藏中'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="sentence-area card-content sentence-content" ref={sentenceAreaRef} aria-live="polite">
          {noSourceData ? (
            <div className="empty-state">
              <img src={wuqiuYellow} className="empty-icon" alt="" />
              <strong>暂无学习数据</strong>
              <span>请运行 npm run convert:data</span>
            </div>
          ) : currentItem ? (
            <>
              {!miniMode && studyMode === STUDY_MODES.randomReview && (
                <div className="review-mode-hint">随机复习中 · 优先复习未学 / 学习中 / A 必背</div>
              )}
              <div className={`english-text ${fitState.allowBreak ? 'allow-break' : ''}`} ref={englishRef}>
                {currentItem.english}
              </div>
              {!hideChinese && <div className="chinese-text">{currentItem.chinese || '暂无中文意思'}</div>}
              {!miniMode && (
                <div className="meta-row">
                  <span className="meta-tag category">
                    <img src={getCategoryIcon(currentItem.category)} className="tag-icon" alt="" />
                    {currentItem.category}
                  </span>
                  <span className={`meta-tag priority ${priorityMeta.className}`}>
                    <img src={priorityMeta.icon} className="tag-icon" alt="" />
                    {currentItem.priority}
                  </span>
                  <span className="meta-tag type">
                    <img src={wuqiuGreen} className="tag-icon" alt="" />
                    {typeLabel(currentItem.type)}
                  </span>
                  <span className={`meta-tag status ${reviewStatusMeta.className}`}>
                    <img src={reviewStatusMeta.icon} className="tag-icon" alt="" />
                    {currentItem.reviewStatus}
                  </span>
                </div>
              )}
              {!miniMode && currentItem.note && <div className="note-text">{currentItem.note}</div>}
            </>
          ) : (
            <div className="empty-state">
              <img src={wuqiuPink} className="empty-icon" alt="" />
              <strong>当前筛选条件下没有内容</strong>
              <span>
                {filters.category} · {filters.priority} · {typeFilterLabel}
              </span>
            </div>
          )}
        </div>

        {!miniMode && speechWarning && <div className="warning no-drag">{speechWarning}</div>}

        {!miniMode && (
          <section className="status-actions no-drag">
            <div className="status-buttons">
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
            </div>
            <span className="voice-status">{voices.length > 0 ? `${voices.length} 个语音` : '等待语音'}</span>
          </section>
        )}

        <footer className="hud-footer card-footer controls no-drag">
          <button type="button" className="nav-button" onClick={goPrev} disabled={filteredData.length === 0} title="上一条">
            ‹
          </button>
          <button type="button" className="speak-button" onClick={speakCurrent} disabled={!currentItem}>
            <img src={wuqiuRow} className="speak-icon speak-row-icon" alt="" />
            <span className="speak-label">朗读</span>
          </button>
          <button type="button" className="nav-button" onClick={goNext} disabled={filteredData.length === 0} title="下一条">
            ›
          </button>
        </footer>
      </section>
    </main>
  );
}
