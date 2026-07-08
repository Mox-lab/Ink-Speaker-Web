/**
 * 草稿持久化封装。
 * 所有 sessionStorage / localStorage 读写统一走此文件,禁止业务代码直接调用 Storage API。
 */
import { STORAGE_KEYS } from '../constants/storage.js';

/**
 * 保存草稿到 sessionStorage。
 * @param {string} key STORAGE_KEYS 中的某个 DRAFT_* key
 * @param {*} state 任意可序列化状态
 */
export const saveDraft = (key, state) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // 静默失败:写入失败不应阻塞用户操作
  }
};

/**
 * 读取草稿。
 * @param {string} key
 * @returns {*} 反序列化后的状态,无草稿时返回 null
 */
export const loadDraft = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * 清除草稿。
 */
export const clearDraft = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // 静默失败
  }
};

/**
 * 读取 localStorage(JSON)。
 */
export const loadLocal = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * 写入 localStorage(JSON)。
 */
export const saveLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 静默失败
  }
};

/**
 * 追加一条记录到 localStorage 中的数组(用于 token 用量日志等)。
 * @param {string} key
 * @param {*} entry
 * @param {number} [max=100] 最大保留条数,超出时丢弃最旧条目
 */
export const appendLocal = (key, entry, max = 100) => {
  const arr = loadLocal(key) || [];
  arr.push(entry);
  while (arr.length > max) arr.shift();
  saveLocal(key, arr);
};

// 便捷别名
export const DRAFT_KEYS = STORAGE_KEYS;
