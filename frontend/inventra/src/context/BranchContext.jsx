import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tenantApi } from '../api/client';
import { useAuth } from './AuthContext';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranchState] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const refreshBranches = useCallback(async () => {
    if (!isAuthenticated || isAdmin) {
      setBranches([]);
      setActiveBranchState(null);
      return;
    }

    setLoadingBranches(true);
    try {
      const data = await tenantApi.getBranches();
      const list = Array.isArray(data) ? data : data?.results || [];
      const activeList = list.filter((b) => b.is_active !== false);
      setBranches(activeList);

      // Determine active branch
      const savedBranchId = localStorage.getItem('inventra_active_branch_id');
      let targetBranch = null;

      // If user is staff with assigned branch, prioritize that
      if (user?.branch_id) {
        targetBranch = activeList.find((b) => b.id === user.branch_id);
      }

      // If no target yet, check saved preference
      if (!targetBranch && savedBranchId) {
        targetBranch = activeList.find((b) => String(b.id) === String(savedBranchId));
      }

      // If still no target, pick main branch or first branch
      if (!targetBranch && activeList.length > 0) {
        targetBranch = activeList.find((b) => b.is_main) || activeList[0];
      }

      setActiveBranchState(targetBranch || null);
      if (targetBranch) {
        localStorage.setItem('inventra_active_branch_id', String(targetBranch.id));
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  }, [isAuthenticated, isAdmin, user?.branch_id]);

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  const setActiveBranch = (branch) => {
    if (!branch) return;
    setActiveBranchState(branch);
    localStorage.setItem('inventra_active_branch_id', String(branch.id));
    window.dispatchEvent(new CustomEvent('branch_changed', { detail: branch }));
  };

  const isMultiBranch = branches.length > 1;

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranch,
        setActiveBranch,
        refreshBranches,
        isMultiBranch,
        loadingBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
