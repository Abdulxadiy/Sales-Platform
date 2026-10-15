import { localStore } from '../utils/brandStorage.js';
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * usePersistedState - Custom hook to synchronize React state with localStore
 * 
 * @param {string} key - The localStore key name
 * @param {any} defaultValue - Initial default value if nothing is stored
 * @returns {[any, Function, Function]} [state, setState, resetState]
 */
export function usePersistedState(key, defaultValue) {
  // Synchronous initial state from localStore to avoid hydration flash & extra render
  const [state, setState] = useState(() => {
    try {
      const saved = localStore.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn(`[usePersistedState] Error reading localStore key "${key}":`, err);
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
        const saved = localStore.getItem(key);
        if (saved !== null) {
          setState(JSON.parse(saved));
          return;
        }
      } catch (err) {
        console.warn(`[usePersistedState] Error reading localStore key "${key}":`, err);
      }
      const def = defaultValueRef.current;
      setState(typeof def === 'function' ? def() : def);
    }
  }, [key]);

  // Persist state to localStore on changes
  useEffect(() => {
    // During a key change this render still holds the previous tenant's state.
    // The load effect updates the key, so use state plus its key as one value.
    if (loadedKey !== key) return;
    try {
      if (state === undefined || state === null) {
        localStore.removeItem(key);
      } else {
        localStore.setItem(key, JSON.stringify(state));
      }
    } catch (err) {
      console.warn(`[usePersistedState] Error setting localStore key "${key}":`, err);
    }
  }, [key, state, loadedKey]);

  const resetState = useCallback(() => {
    try {
      localStore.removeItem(key);
    } catch {}
    const def = defaultValueRef.current;
    setState(typeof def === 'function' ? def() : def);
  }, [key]);

  return [state, setState, resetState];
}

export default usePersistedState;
