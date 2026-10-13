import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * usePersistedState - Custom hook to synchronize React state with localStorage
 * 
 * @param {string} key - The localStorage key name
 * @param {any} defaultValue - Initial default value if nothing is stored
 * @returns {[any, Function, Function]} [state, setState, resetState]
 */
export function usePersistedState(key, defaultValue) {
  // Synchronous initial state from localStorage to avoid hydration flash & extra render
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn(`[usePersistedState] Error reading localStorage key "${key}":`, err);
    }
    return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
  });

  const currentKeyRef = useRef(key);
  const [loadedKey, setLoadedKey] = useState(key);
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  // Sync state if key changes (e.g. tenant switches)
  useEffect(() => {
    if (currentKeyRef.current !== key) {
      currentKeyRef.current = key;
      setLoadedKey(key);
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
          setState(JSON.parse(saved));
          return;
        }
      } catch (err) {
        console.warn(`[usePersistedState] Error reading localStorage key "${key}":`, err);
      }
      const def = defaultValueRef.current;
      setState(typeof def === 'function' ? def() : def);
    }
  }, [key]);

  // Persist state to localStorage on changes
  useEffect(() => {
    // During a key change this render still holds the previous tenant's state.
    // The load effect updates the key, so use state plus its key as one value.
    if (loadedKey !== key) return;
    try {
      if (state === undefined || state === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch (err) {
      console.warn(`[usePersistedState] Error setting localStorage key "${key}":`, err);
    }
  }, [key, state, loadedKey]);

  const resetState = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {}
    const def = defaultValueRef.current;
    setState(typeof def === 'function' ? def() : def);
  }, [key]);

  return [state, setState, resetState];
}

export default usePersistedState;
