import { useState } from 'react';
export type FeedbackType = 'success' | 'info' | 'error';
export function useFeedback() {
  const [notice, setNotice] = useState<{ message: string; type: FeedbackType } | null>(null);
  return { message: notice?.message || null, type: notice?.type || 'info', show: (message: string | null, type: FeedbackType = 'info') => setNotice(message ? { message, type } : null) };
}
