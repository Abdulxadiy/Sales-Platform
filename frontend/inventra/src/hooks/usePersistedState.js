import { useState, useEffect, useCallback } from 'react';

/**
 * usePersistedState - Custom hook to synchronize React state with localStorage
 * 
 * @param {string} key - The localStorage key name
 * @param {any} defaultValue - Initial default value if nothing is stored
 * @returns {[any, Function, Function]} [state, setState, resetState]
 */
export function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn(`[usePersistedState] Error parsing localStorage key "${key}":`, err);
    }
    return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
  });

  useEffect(() => {
    try {
      if (state === undefined || state === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch (err) {
      console.warn(`[usePersistedState] Error setting localStorage key "${key}":`, err);
    }
  }, [key, state]);

  const resetState = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {}
    setState(typeof defaultValue === 'function' ? defaultValue() : defaultValue);
  }, [key, defaultValue]);

  return [state, setState, resetState];
}

export default usePersistedState;
