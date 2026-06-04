const DEFAULT_TIMEOUT_MS = parseInt(process.env.ATS_SCAN_TIMEOUT_MS, 10) || 120000;

function logAts(event, detail) {
  if (detail !== undefined) {
    console.info('[ATS scan_chamdiemCV]', event, detail);
  } else {
    console.info('[ATS scan_chamdiemCV]', event);
  }
}

function normalizeBase(baseUrlOverride) {
  const b = String(baseUrlOverride ?? process.env.ATS_SCAN_API_URL ?? '').trim();
  if (!b) {
    throw new Error('ATS_SCAN_API_URL is not configured');
  }
  return b.replace(/\/$/, '');
}

async function fetchScan(baseUrlOverride, path, options = {}) {
  const base = normalizeBase(baseUrlOverride);
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  logAts('request', { method: options.method || 'GET', url });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    if (!res.ok) {
      const detail =
        typeof data === 'object' && data && (data.detail || data.message || data.error);
      logAts('response error', { url, status: res.status, ms: Date.now() - started });
      throw new Error(
        typeof detail === 'string' ? detail : `HTTP ${res.status}: ${String(text).slice(0, 200)}`
      );
    }
    logAts('response ok', { url, status: res.status, ms: Date.now() - started });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function getRoot(baseUrlOverride) {
  return fetchScan(baseUrlOverride, '/', { method: 'GET' });
}

async function listCvs(baseUrlOverride) {
  return fetchScan(baseUrlOverride, '/api/cv/', { method: 'GET' });
}

async function uploadCv(fileBuffer, filename, baseUrlOverride) {
  const base = normalizeBase(baseUrlOverride);
  const uploadUrl = `${base}/api/cv/upload`;
  logAts('request', {
    method: 'POST',
    url: uploadUrl,
    bytes: Buffer.isBuffer(fileBuffer) ? fileBuffer.length : fileBuffer?.byteLength ?? 0
  });
  const form = new FormData();
  const name = filename || 'resume.pdf';
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  form.append('file', blob, name);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: form,
      signal: controller.signal
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`CV upload invalid JSON: ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      logAts('response error', { url: uploadUrl, status: res.status, ms: Date.now() - started });
      throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
    }
    logAts('response ok', { url: uploadUrl, status: res.status, ms: Date.now() - started, cv_id: data?.cv_id });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function listJobs(baseUrlOverride) {
  return fetchScan(baseUrlOverride, '/api/job/', { method: 'GET' });
}

async function createJob(jobText, baseUrlOverride) {
  const q = new URLSearchParams({ job_text: String(jobText ?? '') });
  return fetchScan(baseUrlOverride, `/api/job/create?${q.toString()}`, { method: 'POST' });
}

async function analyzeMatch(cvText, jobText, baseUrlOverride) {
  const base = normalizeBase(baseUrlOverride);
  const matchUrl = `${base}/api/analyze/match`;
  const cvSlice = String(cvText || '').slice(0, 12000);
  const jobSlice = String(jobText || '').slice(0, 15000);
  logAts('request', {
    method: 'POST',
    url: matchUrl,
    cv_text_len: cvSlice.trim().length,
    job_text_len: jobSlice.trim().length
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(matchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cv_text: String(cvText || '').slice(0, 12000),
        job_text: String(jobText || '').slice(0, 15000)
      }),
      signal: controller.signal
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`ATS scan invalid JSON: ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      logAts('response error', { url: matchUrl, status: res.status, ms: Date.now() - started });
      throw new Error(data?.detail || data?.message || `HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    if (data && data.error) {
      logAts('response error', { url: matchUrl, body_error: true, ms: Date.now() - started });
      throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
    }
    logAts('response ok', {
      url: matchUrl,
      status: res.status,
      ms: Date.now() - started,
      final_score: data?.final_score
    });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeByIds(cvId, jobId, baseUrlOverride) {
  const q = new URLSearchParams({ cv_id: String(cvId), job_id: String(jobId) });
  return fetchScan(baseUrlOverride, `/api/analyze/?${q.toString()}`, { method: 'POST' });
}

async function rank(jobId, topK, baseUrlOverride) {
  const q = new URLSearchParams({ job_id: String(jobId), top_k: String(topK ?? 5) });
  return fetchScan(baseUrlOverride, `/api/rank/?${q.toString()}`, { method: 'GET' });
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  normalizeBase,
  getRoot,
  listCvs,
  uploadCv,
  listJobs,
  createJob,
  analyzeMatch,
  analyzeByIds,
  rank
};
