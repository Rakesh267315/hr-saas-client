import { useState, useEffect, useCallback } from 'react';

/**
 * usePersistState — useState that reads/writes sessionStorage.
 * Survives in-app navigation but clears on browser tab close.
 */
export function usePersistState<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setInternalState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = sessionStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setState = useCallback((value: T | ((prev: T) => T)) => {
    setInternalState((prev) => {
      const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
      try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  return [state, setState];
}

/**
 * useLocalState — same as usePersistState but uses localStorage (survives tab close).
 */
export function useLocalState<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setInternalState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setState = useCallback((value: T | ((prev: T) => T)) => {
    setInternalState((prev) => {
      const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  return [state, setState];
}
