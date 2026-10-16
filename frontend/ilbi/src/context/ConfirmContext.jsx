import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import ConfirmDialog from '../components/common/ConfirmDialog';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    options: {},
  });

  const resolverRef = useRef(null);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleCancel = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const confirm = useCallback((rawOptions) => {
    const options = typeof rawOptions === 'string'
      ? { message: rawOptions }
      : { ...rawOptions };

    return new Promise((resolve) => {
      // If a previous dialog was still open, dismiss it first
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        options: {
          ...options,
          isAlert: false,
        },
      });
    });
  }, []);

  const alert = useCallback((rawOptions) => {
    const options = typeof rawOptions === 'string'
      ? { message: rawOptions }
      : { ...rawOptions };

    return new Promise((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(true);
      }
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        options: {
          ...options,
          isAlert: true,
        },
      });
    });
  }, []);

  const contextValue = useMemo(() => ({
    confirm,
    alert,
  }), [confirm, alert]);

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        options={dialogState.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

export function useAlert() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useAlert must be used within a ConfirmProvider');
  }
  return context.alert;
}

export function useConfirmDialog() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmProvider');
  }
  return context;
}
