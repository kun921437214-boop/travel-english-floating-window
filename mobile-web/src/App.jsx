import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured } from './lib/supabaseClient';
import {
  debounceSync,
  loadLocalState,
  saveLocalState,
  syncNow
} from './lib/syncStorage';
import { travelData } from './lib/travelData';

const REVIEW_STATUSES = ['未学', '学习中', '已掌握'];
const DEFAULT_SYNC_CODE = 'kun-travel-english-default-sync-v1';
const SPEEDS = [
  { label: '慢速', value: 0.7 },
  { label: '正常', value: 1 },
  { label: '快速', value: 1.2 }
];

function typeLabel(type) {
  return type === 'word' ? '单词' : '句子';
}

function normalizeStudyMode(value) {
  return value === 'randomReview' ? 'randomReview' : 'sequence';
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
  const total = candidates.reduce((sum, item) => sum + Math.max(1, getReviewWeight(item)), 0);
  let cursor = Math.random() * total;
  for (const item of candidates) {
    cursor -= Math.max(1, getReviewWeight(item));
    if (cursor <= 0) return item;
  }
  return candidates[candidates.length - 1];
}

function chooseEnglishVoice(voices) {
  const priorities = ['en-NZ', 'en-AU', 'en-GB', 'en-US'];
  for (const lang of priorities) {
    const exact = voices.find((voice) => voice.lang === lang);
    if (exact) return exact;
  }
  return voices.find((voice) => /^en/i.test(voice.lang)) || voices[0] || null;
}

function filterItems(items, filters) {
  const keyword = String(filters.search || '').trim().toLowerCase();
  return items.filter((item) => {
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
}

function getInitialMobileState() {
  const localState = loadLocalState();
  return saveLocalState({
    ...localState,
    syncCode: isSupabaseConfigured ? DEFAULT_SYNC_CODE : ''
  });
}

function getSyncLabel(status) {
  if (!isSupabaseConfigured) return '本地模式';
  if (status === 'syncing') return '同步中';
  if (status === 'synced') return '已同步';
  if (status === 'failed') return '同步失败';
  if (status === 'local') return '本地模式';
  return '待同步';
}

export default function App() {
  const data = useMemo(() => travelData, []);
  const [appState, setAppState] = useState(() => getInitialMobileState());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [syncStatus, setSyncStatus] = useState(() => (isSupabaseConfigured ? 'idle' : 'local'));
  const [speechWarning, setSpeechWarning] = useState('');
  const [voices, setVoices] = useState([]);
  const [reviewedIds, setReviewedIds] = useState(() => new Set());
  const [reviewHistory, setReviewHistory] = useState([]);
  const utteranceRef = useRef(null);

  const dataWithStatus = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        reviewStatus: appState.reviewStatuses[item.id] || item.reviewStatus || '未学'
      })),
    [appState.reviewStatuses, data]
  );

  const categories = useMemo(() => ['全部', ...Array.from(new Set(dataWithStatus.map((item) => item.category))).sort()], [dataWithStatus]);
  const priorities = useMemo(() => ['全部', ...Array.from(new Set(dataWithStatus.map((item) => item.priority))).sort()], [dataWithStatus]);
  const filteredData = useMemo(() => filterItems(dataWithStatus, appState.filters), [appState.filters, dataWithStatus]);
  const filteredSignature = useMemo(() => filteredData.map((item) => item.id).join('|'), [filteredData]);
  const currentItem = filteredData[currentIndex] || null;
  const progressLabel = filteredData.length ? `${currentIndex + 1} / ${filteredData.length}` : '0 / 0';

  const commitState = useCallback((updater, options = {}) => {
    setAppState((previous) => {
      const now = new Date().toISOString();
      const patch = typeof updater === 'function' ? updater(previous, now) : updater;
      const next = saveLocalState({
        ...previous,
        ...patch,
        syncCode: isSupabaseConfigured ? DEFAULT_SYNC_CODE : '',
        updatedAt: options.touch === false ? previous.updatedAt : now
      });

      if (options.sync !== false && isSupabaseConfigured) {
        setSyncStatus('syncing');
        debounceSync(DEFAULT_SYNC_CODE, next, {
          onStatus: setSyncStatus,
          onState: (syncedState) => setAppState(syncedState)
        });
      } else if (!isSupabaseConfigured) {
        setSyncStatus('local');
      }

      return next;
    });
  }, []);

  const stopSpeech = useCallback(() => {
    const speech = window.speechSynthesis;
    if (speech) speech.cancel();
    utteranceRef.current = null;
  }, []);

  const goToIndex = useCallback(
    (nextIndex) => {
      stopSpeech();
      if (!filteredData.length) {
        setCurrentIndex(0);
        return;
      }
      const safeIndex = ((nextIndex % filteredData.length) + filteredData.length) % filteredData.length;
      const nextItem = filteredData[safeIndex];
      setCurrentIndex(safeIndex);
      commitState({ lastItemId: nextItem.id });
    },
    [commitState, filteredData, stopSpeech]
  );

  const goNextRandomReview = useCallback(() => {
    stopSpeech();
    if (!filteredData.length) {
      setCurrentIndex(0);
      return;
    }
    if (filteredData.length === 1) {
      setCurrentIndex(0);
      commitState({ lastItemId: filteredData[0].id });
      return;
    }

    const currentId = currentItem?.id || '';
    let candidates = filteredData.filter((item) => item.id !== currentId && !reviewedIds.has(item.id));
    let roundReset = false;
    if (!candidates.length) {
      candidates = filteredData.filter((item) => item.id !== currentId);
      roundReset = true;
    }
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
      return [...seeded, nextItem.id].slice(-120);
    });
    commitState({ lastItemId: nextItem.id });
  }, [commitState, currentItem, filteredData, reviewedIds, stopSpeech]);

  const goPrev = useCallback(() => {
    if (appState.studyMode === 'randomReview' && reviewHistory.length > 1) {
      stopSpeech();
      const previousId = reviewHistory[reviewHistory.length - 2];
      const previousIndex = filteredData.findIndex((item) => item.id === previousId);
      if (previousIndex >= 0) {
        setCurrentIndex(previousIndex);
        setReviewHistory((history) => history.slice(0, -1));
        commitState({ lastItemId: previousId });
        return;
      }
    }
    goToIndex(currentIndex - 1);
  }, [appState.studyMode, commitState, currentIndex, filteredData, goToIndex, reviewHistory, stopSpeech]);

  const goNext = useCallback(() => {
    if (appState.studyMode === 'randomReview') {
      goNextRandomReview();
      return;
    }
    goToIndex(currentIndex + 1);
  }, [appState.studyMode, currentIndex, goNextRandomReview, goToIndex]);

  const speakCurrent = useCallback(() => {
    if (!currentItem) return;
    const speech = window.speechSynthesis;
    if (!speech || typeof SpeechSynthesisUtterance === 'undefined') {
      setSpeechWarning('当前浏览器不支持朗读');
      return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(currentItem.english);
    const selectedVoice = chooseEnglishVoice(speech.getVoices());
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || 'en-US';
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = appState.speechRate;
    utteranceRef.current = utterance;
    utterance.onend = () => {
      if (utteranceRef.current === utterance) utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setSpeechWarning('朗读失败，请检查浏览器语音设置');
      utteranceRef.current = null;
    };
    setSpeechWarning('');
    speech.speak(utterance);
  }, [appState.speechRate, currentItem, stopSpeech]);

  const markStatus = useCallback(
    (status) => {
      if (!currentItem) return;
      commitState((previous, now) => ({
        lastItemId: currentItem.id,
        reviewStatuses: {
          ...previous.reviewStatuses,
          [currentItem.id]: status
        },
        reviewStatusUpdatedAt: {
          ...previous.reviewStatusUpdatedAt,
          [currentItem.id]: now
        }
      }));
    },
    [commitState, currentItem]
  );

  const updateFilter = useCallback(
    (key, value) => {
      commitState((previous) => ({
        filters: {
          ...previous.filters,
          [key]: value
        }
      }));
    },
    [commitState]
  );

  const updateStudyMode = useCallback(
    (studyMode) => {
      setReviewedIds(new Set());
      setReviewHistory(currentItem ? [currentItem.id] : []);
      commitState({ studyMode: normalizeStudyMode(studyMode), lastItemId: currentItem?.id || appState.lastItemId });
    },
    [appState.lastItemId, commitState, currentItem]
  );

  const syncManually = useCallback(() => {
    if (!isSupabaseConfigured) {
      setSyncStatus('local');
      return;
    }
    setSyncStatus('syncing');
    syncNow(DEFAULT_SYNC_CODE, {
      ...appState,
      syncCode: DEFAULT_SYNC_CODE
    })
      .then((result) => {
        setAppState(result.state);
        setSyncStatus(result.status);
      })
      .catch((error) => {
        console.warn('Manual sync failed', error);
        setSyncStatus('failed');
      });
  }, [appState]);

  useEffect(() => {
    const index = filteredData.findIndex((item) => item.id === appState.lastItemId);
    if (index >= 0) {
      setCurrentIndex(index);
      return;
    }
    if (currentIndex >= filteredData.length) setCurrentIndex(0);
  }, [appState.lastItemId, currentIndex, filteredData]);

  useEffect(() => {
    setReviewedIds(new Set());
    setReviewHistory(currentItem ? [currentItem.id] : []);
  }, [filteredSignature]);

  useEffect(() => {
    const speech = window.speechSynthesis;
    if (!speech) return undefined;
    const loadVoices = () => setVoices(speech.getVoices());
    loadVoices();
    speech.onvoiceschanged = loadVoices;
    return () => {
      speech.onvoiceschanged = null;
      speech.cancel();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    setSyncStatus('syncing');
    syncNow(DEFAULT_SYNC_CODE, {
      ...appState,
      syncCode: DEFAULT_SYNC_CODE
    })
      .then((result) => {
        if (cancelled) return;
        setAppState(result.state);
        setSyncStatus(result.status);
      })
      .catch((error) => {
        console.warn('Startup sync failed', error);
        if (!cancelled) setSyncStatus('failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="phone-page">
      <section className="phone-shell">
        <header className="app-header">
          <div className="brand">
            <div className="brand-mark">澳</div>
            <div>
              <h1>澳新旅行英语</h1>
              <p>{appState.studyMode === 'randomReview' ? '随机复习' : '顺序学习'} · {progressLabel}</p>
            </div>
          </div>
          <button type="button" className={`sync-pill ${syncStatus}`} onClick={syncManually}>
            {getSyncLabel(syncStatus)}
          </button>
        </header>

        <section className="learn-card">
          {currentItem ? (
            <>
              <div className="card-top">
                <div className="meta-line">
                  <span className="priority-tag">{currentItem.priority}</span>
                  <span>{currentItem.category}</span>
                  <span>{typeLabel(currentItem.type)}</span>
                  <span>{currentItem.reviewStatus}</span>
                </div>
                <span className="mode-badge">{appState.studyMode === 'randomReview' ? '复习' : '顺序'}</span>
              </div>
              <div className="content-scroll">
                <h2>{currentItem.english}</h2>
                {!appState.hideChinese && <p className="chinese">{currentItem.chinese || '暂无中文意思'}</p>}
                {currentItem.note && <p className="note">{currentItem.note}</p>}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>{data.length ? '当前筛选条件下没有内容' : '暂无学习数据'}</strong>
              <span>{data.length ? '请调整搜索或筛选条件' : '请先生成 travel-english.json'}</span>
            </div>
          )}
        </section>

        <section className="status-controls">
          {REVIEW_STATUSES.map((status) => (
            <button
              type="button"
              key={status}
              className={currentItem?.reviewStatus === status ? 'active' : ''}
              disabled={!currentItem}
              onClick={() => markStatus(status)}
            >
              {status}
            </button>
          ))}
        </section>

        <section className="primary-controls">
          <button type="button" onClick={goPrev} disabled={!filteredData.length}>
            上一条
          </button>
          <button type="button" className="speak" onClick={speakCurrent} disabled={!currentItem}>
            朗读
          </button>
          <button type="button" onClick={goNext} disabled={!filteredData.length}>
            下一条
          </button>
        </section>

        <section className="quick-controls">
          <button type="button" onClick={stopSpeech}>
            停止朗读
          </button>
          <button type="button" onClick={() => commitState({ hideChinese: !appState.hideChinese })}>
            {appState.hideChinese ? '显示中文' : '隐藏中文'}
          </button>
          <button type="button" className={appState.studyMode === 'randomReview' ? 'active' : ''} onClick={() => updateStudyMode(appState.studyMode === 'randomReview' ? 'sequence' : 'randomReview')}>
            {appState.studyMode === 'randomReview' ? '随机复习中' : '顺序学习'}
          </button>
        </section>

        {appState.studyMode === 'randomReview' && <p className="review-hint">随机复习中 · 优先复习未学 / 学习中 / A 必背</p>}
        {speechWarning && <p className="warning">{speechWarning}</p>}

        <button type="button" className="filter-toggle" onClick={() => setShowFilters((value) => !value)}>
          {showFilters ? '收起筛选与设置' : '筛选与设置'}
        </button>

        {showFilters && (
          <section className="filter-card">
            <input value={appState.filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="搜索英文、中文或提示" />
            <div className="select-grid">
              <select value={appState.filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select value={appState.filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <select value={appState.filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
                <option value="all">全部类型</option>
                <option value="sentence">句子</option>
                <option value="word">单词</option>
              </select>
              <select value={appState.speechRate} onChange={(event) => commitState({ speechRate: Number(event.target.value) })}>
                {SPEEDS.map((speed) => (
                  <option key={speed.value} value={speed.value}>
                    {speed.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mode-switch">
              <button type="button" className={appState.studyMode === 'sequence' ? 'active' : ''} onClick={() => updateStudyMode('sequence')}>
                顺序学习
              </button>
              <button type="button" className={appState.studyMode === 'randomReview' ? 'active' : ''} onClick={() => updateStudyMode('randomReview')}>
                随机复习
              </button>
            </div>
            <div className="sync-tools">
              <button type="button" onClick={syncManually} disabled={!isSupabaseConfigured}>
                立即同步
              </button>
              <button type="button" onClick={() => commitState({ filters: { category: '全部', priority: '全部', type: 'all', search: '' } })}>
                重置筛选
              </button>
            </div>
            <p className="tiny-info">语音数量：{voices.length || '等待浏览器加载'} · 云同步不会影响离线学习</p>
          </section>
        )}
      </section>
    </main>
  );
}
