import { isSupabaseConfigured, supabase } from './supabaseClient';

export const MOBILE_STORAGE_KEY = 'travel-english-mobile-web:v1';

const DEFAULT_FILTERS = {
  category: '全部',
  priority: '全部',
  type: 'all',
  search: ''
};

let debounceTimer = null;

export function createDefaultState() {
  const now = new Date().toISOString();
  return {
    version: 1,
    syncCode: '',
    lastItemId: '',
    studyMode: 'sequence',
    filters: DEFAULT_FILTERS,
    hideChinese: false,
    speechRate: 1,
    reviewStatuses: {},
    reviewStatusUpdatedAt: {},
    updatedAt: now,
    lastSyncedAt: ''
  };
}

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeState(value) {
  const fallback = createDefaultState();
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const filters = source.filters && typeof source.filters === 'object' && !Array.isArray(source.filters) ? source.filters : {};
  return {
    ...fallback,
    ...source,
    syncCode: String(source.syncCode || ''),
    studyMode: source.studyMode === 'randomReview' ? 'randomReview' : 'sequence',
    filters: {
      ...DEFAULT_FILTERS,
      ...filters,
      type: filters.type === 'sentence' || filters.type === 'word' ? filters.type : 'all',
      search: String(filters.search || '')
    },
    hideChinese: Boolean(source.hideChinese),
    speechRate: [0.7, 1, 1.2].includes(Number(source.speechRate)) ? Number(source.speechRate) : 1,
    reviewStatuses:
      source.reviewStatuses && typeof source.reviewStatuses === 'object' && !Array.isArray(source.reviewStatuses)
        ? source.reviewStatuses
        : {},
    reviewStatusUpdatedAt:
      source.reviewStatusUpdatedAt && typeof source.reviewStatusUpdatedAt === 'object' && !Array.isArray(source.reviewStatusUpdatedAt)
        ? source.reviewStatusUpdatedAt
        : {},
    updatedAt: String(source.updatedAt || fallback.updatedAt),
    lastSyncedAt: String(source.lastSyncedAt || '')
  };
}

export function loadLocalState() {
  if (typeof localStorage === 'undefined') return createDefaultState();
  return normalizeState(safeJsonParse(localStorage.getItem(MOBILE_STORAGE_KEY), createDefaultState()));
}

export function saveLocalState(nextState) {
  const normalized = normalizeState(nextState);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

function isRemoteNewer(remoteTime, localTime) {
  const remote = Date.parse(remoteTime || '');
  const local = Date.parse(localTime || '');
  return Number.isFinite(remote) && (!Number.isFinite(local) || remote > local);
}

export function mergeLocalAndRemoteState(localState, remoteState) {
  const local = normalizeState(localState);
  if (!remoteState) return local;
  const remote = normalizeState(remoteState);
  const profileWinner = isRemoteNewer(remote.updatedAt, local.updatedAt) ? remote : local;
  const reviewStatuses = { ...local.reviewStatuses };
  const reviewStatusUpdatedAt = { ...local.reviewStatusUpdatedAt };

  for (const [itemId, remoteStatus] of Object.entries(remote.reviewStatuses)) {
    const remoteUpdatedAt = remote.reviewStatusUpdatedAt[itemId] || remote.updatedAt;
    const localUpdatedAt = reviewStatusUpdatedAt[itemId] || local.updatedAt;
    if (!reviewStatuses[itemId] || isRemoteNewer(remoteUpdatedAt, localUpdatedAt)) {
      reviewStatuses[itemId] = remoteStatus;
      reviewStatusUpdatedAt[itemId] = remoteUpdatedAt;
    }
  }

  return normalizeState({
    ...local,
    lastItemId: profileWinner.lastItemId,
    studyMode: profileWinner.studyMode,
    filters: profileWinner.filters,
    hideChinese: profileWinner.hideChinese,
    speechRate: profileWinner.speechRate,
    updatedAt: isRemoteNewer(remote.updatedAt, local.updatedAt) ? remote.updatedAt : local.updatedAt,
    reviewStatuses,
    reviewStatusUpdatedAt,
    lastSyncedAt: new Date().toISOString()
  });
}

export async function pullRemoteState(syncCode) {
  if (!isSupabaseConfigured || !supabase || !syncCode) return null;

  const { data: profile, error: profileError } = await supabase
    .from('travel_english_sync_profiles')
    .select('*')
    .eq('sync_code', syncCode)
    .maybeSingle();
  if (profileError) throw profileError;

  const { data: statuses, error: statusesError } = await supabase
    .from('travel_english_item_statuses')
    .select('item_id, review_status, updated_at')
    .eq('sync_code', syncCode);
  if (statusesError) throw statusesError;

  if (!profile && (!statuses || statuses.length === 0)) return null;

  const reviewStatuses = {};
  const reviewStatusUpdatedAt = {};
  for (const row of statuses || []) {
    reviewStatuses[row.item_id] = row.review_status || '未学';
    reviewStatusUpdatedAt[row.item_id] = row.updated_at;
  }

  return normalizeState({
    syncCode,
    lastItemId: profile?.last_item_id || '',
    studyMode: profile?.study_mode || 'sequence',
    filters: profile?.filters || DEFAULT_FILTERS,
    hideChinese: Boolean(profile?.hide_chinese),
    speechRate: Number(profile?.speech_rate || 1),
    updatedAt: profile?.updated_at || new Date().toISOString(),
    reviewStatuses,
    reviewStatusUpdatedAt
  });
}

export async function pushRemoteState(syncCode, state) {
  if (!isSupabaseConfigured || !supabase || !syncCode) return normalizeState(state);
  const normalized = normalizeState({ ...state, syncCode });
  const updatedAt = normalized.updatedAt || new Date().toISOString();

  const { error: profileError } = await supabase.from('travel_english_sync_profiles').upsert(
    {
      sync_code: syncCode,
      last_item_id: normalized.lastItemId || null,
      study_mode: normalized.studyMode,
      filters: normalized.filters,
      hide_chinese: normalized.hideChinese,
      speech_rate: normalized.speechRate,
      updated_at: updatedAt
    },
    { onConflict: 'sync_code' }
  );
  if (profileError) throw profileError;

  const statusRows = Object.entries(normalized.reviewStatuses).map(([itemId, reviewStatus]) => ({
    sync_code: syncCode,
    item_id: itemId,
    review_status: reviewStatus || '未学',
    updated_at: normalized.reviewStatusUpdatedAt[itemId] || updatedAt
  }));

  if (statusRows.length) {
    const { error: statusError } = await supabase
      .from('travel_english_item_statuses')
      .upsert(statusRows, { onConflict: 'sync_code,item_id' });
    if (statusError) throw statusError;
  }

  return saveLocalState({
    ...normalized,
    lastSyncedAt: new Date().toISOString()
  });
}

export async function syncNow(syncCode, state) {
  if (!isSupabaseConfigured || !syncCode) {
    return { state: normalizeState(state), status: 'local' };
  }
  const local = normalizeState({ ...state, syncCode });
  const remote = await pullRemoteState(syncCode);
  const merged = mergeLocalAndRemoteState(local, remote);
  const pushed = await pushRemoteState(syncCode, merged);
  return { state: pushed, status: 'synced' };
}

export function debounceSync(syncCode, state, handlers = {}) {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(async () => {
    try {
      handlers.onStatus?.('syncing');
      const result = await syncNow(syncCode, state);
      handlers.onState?.(result.state);
      handlers.onStatus?.(result.status);
    } catch (error) {
      console.warn('Supabase sync failed', error);
      handlers.onStatus?.('failed');
    }
  }, 1000);
}
