import { APP_DATA_CACHE_VERSION, APP_DATA_CACHE_VERSION_KEY } from './appCacheVersion';

/** Không xóa: phiên đăng nhập, theme, mốc phiên bản cache. */
const PRESERVE_LOCALSTORAGE_KEYS = new Set([
  'token',
  'user',
  'findme-theme',
  APP_DATA_CACHE_VERSION_KEY
]);

function shouldClearDataCacheKey(key) {
  if (PRESERVE_LOCALSTORAGE_KEYS.has(key)) return false;
  if (key.startsWith('findme_jobs_')) return true;
  if (key.startsWith('findme_job_details_')) return true;
  if (key.startsWith('findme_profile_')) return true;
  if (key.startsWith('findme_admin')) return true;
  if (key.startsWith('hrDashboard:')) return true;
  if (key.startsWith('findme_')) return true;
  return false;
}

/** Xóa toàn bộ cache dữ liệu app trong localStorage (giữ đăng nhập + theme + version key). */
export function clearAllAppDataCaches() {
  let clearedCount = 0;
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (!shouldClearDataCacheKey(key)) return;
      try {
        localStorage.removeItem(key);
        clearedCount++;
      } catch (error) {
        console.error('Error removing cache key:', key, error);
      }
    });
    if (clearedCount > 0 && import.meta.env.DEV) {
      console.log(`[findme] Cleared ${clearedCount} app data cache entries`);
    }
    return clearedCount;
  } catch (error) {
    console.error('Error clearing app data cache:', error);
    return 0;
  }
}

/** @deprecated Dùng `clearAllAppDataCaches` — giữ tên cũ để tương thích. */
export const clearAllfindmeCache = clearAllAppDataCaches;

export const smartCacheSet = (key, value, options = {}) => {
  const {
    maxRetries = 2,
    clearOldCaches = true,
    clearAllOnFinalFailure = false
  } = options;
  const trySet = (retryCount = 0) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError' && retryCount < maxRetries) {
        console.warn(`Cache quota exceeded, attempt ${retryCount + 1}/${maxRetries + 1}`);
        if (clearOldCaches) {
          clearExpiredCache();
          if (retryCount === maxRetries - 1 && clearAllOnFinalFailure) {
            clearAllAppDataCaches();
          }
          return trySet(retryCount + 1);
        }
      }
      console.warn('Unable to cache data:', error.message);
      return false;
    }
  };
  return trySet();
};

export const clearExpiredCache = () => {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => shouldClearDataCacheKey(key));
    const now = new Date().getTime();
    let clearedCount = 0;
    cacheKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (parsedCache.expiry && now > parsedCache.expiry) {
            localStorage.removeItem(key);
            clearedCount++;
          } else if (parsedCache.timestamp && now - parsedCache.timestamp > 60 * 60 * 1000) {
            localStorage.removeItem(key);
            clearedCount++;
          }
        }
      } catch {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
    if (clearedCount > 0 && import.meta.env.DEV) {
      console.log(`[findme] Cleared ${clearedCount} expired cache entries`);
    }
    return clearedCount;
  } catch (error) {
    console.error('Error clearing expired cache:', error);
    return 0;
  }
};

export const isStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};
