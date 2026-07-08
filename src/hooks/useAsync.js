import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 通用异步状态 Hook。
 * 自动跟踪 loading / error / data,支持手动触发与组件卸载时丢弃响应。
 *
 * @param {Function} asyncFn 返回 Promise 的函数
 * @param {Array} deps 依赖数组(变化时不会自动执行,需手动 trigger)
 * @returns { data, error, loading, run }
 */
export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: false });
  const mountedRef = useRef(true);
  const fnRef = useRef(asyncFn);
  fnRef.current = asyncFn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback((...args) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return Promise.resolve()
      .then(() => fnRef.current(...args))
      .then((data) => {
        if (mountedRef.current) setState({ data, error: null, loading: false });
        return data;
      })
      .catch((error) => {
        if (mountedRef.current) setState({ data: null, error, loading: false });
        throw error;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, run };
}
