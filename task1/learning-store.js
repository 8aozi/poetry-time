/* Versioned, validated local records. Shared by the browser and Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PoetryLearning = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const KEY = 'poetry-learning-v1';
  const statuses = ['unstarted', 'learning', 'learned'];
  const blank = () => ({favorite: false, favoriteAt: null, status: 'unstarted', startedAt: null, learnedAt: null, changedAt: null});
  const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  function createStore(ids, storage, now = () => new Date().toISOString()) {
    const allowed = new Set(ids);
    let records = {}, warning = '', failed = false;
    function read() {
      const next = {};
      if (!storage) throw new Error('storage unavailable');
      const raw = storage.getItem(KEY);
      if (!raw) return next;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.records || typeof parsed.records !== 'object' || Array.isArray(parsed.records)) throw new Error('invalid records');
      for (const id of allowed) {
        const r = parsed.records[id];
        if (!r || typeof r !== 'object') continue;
        const status = statuses.includes(r.status) ? r.status : 'unstarted';
        next[id] = {favorite: r.favorite === true, favoriteAt: date(r.favoriteAt), status,
          startedAt: date(r.startedAt), learnedAt: date(r.learnedAt), changedAt: date(r.changedAt)};
      }
      return next;
    }
    function reload() {
      try { records = read(); warning = ''; failed = false; }
      catch { warning = '暂时无法读取本地记录。本次操作仍可使用，但刷新后可能无法保留。'; failed = true; }
    }
    reload();
    function save() {
      try {
        if (!storage) throw new Error('storage unavailable');
        storage.setItem(KEY, JSON.stringify({version: 1, records}));
        warning = ''; failed = false;
      } catch { warning = '记录暂时只保留在本次页面中，刷新后可能丢失。请检查浏览器的存储设置。'; failed = true; }
    }
    function get(id) { return {...(records[id] || blank())}; }
    function change(id, action, value) {
      if (!allowed.has(id)) throw new Error('Unknown poem');
      // Re-read before writes so separate tabs do not overwrite unrelated poems.
      if (!failed) { try { records = read(); } catch { failed = true; } }
      const record = get(id), stamp = now();
      if (action === 'favorite') {
        record.favorite = !record.favorite;
        record.favoriteAt = record.favorite ? stamp : null;
      } else if (action === 'status') {
        if (!statuses.includes(value)) throw new Error('Unknown status');
        if (record.status === value) return {changed: false, record};
        record.status = value;
        record.changedAt = stamp;
        if (value !== 'unstarted' && !record.startedAt) record.startedAt = stamp;
        if (value === 'learned') record.learnedAt = stamp;
      } else throw new Error('Unknown action');
      records[id] = record;
      save();
      return {changed: true, record: {...record}};
    }
    function summary() {
      const result = {total: allowed.size, favorites: 0, learning: 0, learned: 0};
      for (const id of allowed) {const r = get(id); if (r.favorite) result.favorites++; if (r.status !== 'unstarted') result[r.status]++;}
      return result;
    }
    return {get, change, summary, reload, get warning() {return warning;}};
  }
  return {KEY, createStore};
});
