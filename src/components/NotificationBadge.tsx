'use client';

/**
 * NotificationBadge - Discreet popup for fallback notifications
 * 
 * Shows a non-intrusive toast when classification fails or confidence is low.
 * Auto-dismisses after 5 seconds.
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'info' | 'warning' | 'error';

interface NotificationBadgeProps {
  message: string;
  type?: NotificationType;
  isVisible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export function NotificationBadge({
  message,
  type = 'info',
  isVisible,
  onDismiss,
  duration = 5000
}: NotificationBadgeProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      
      const timer = setTimeout(() => {
        setShouldRender(false);
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
  }, [isVisible, duration, onDismiss]);

  if (!shouldRender) return null;

  const icons = {
    info: <Info size={16} className="shrink-0" />,
    warning: <AlertTriangle size={16} className="shrink-0" />,
    error: <AlertCircle size={16} className="shrink-0" />
  };

  const colors = {
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300',
    error: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300'
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div 
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg border shadow-lg backdrop-blur-sm
          max-w-sm text-sm font-medium
          ${colors[type]}
          transition-all duration-300
        `}
        role="alert"
      >
        {icons[type]}
        <span className="line-clamp-2">{message}</span>
        <button
          onClick={() => {
            setShouldRender(false);
            onDismiss();
          }}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to manage notification state
 */
export function useNotification(defaultDuration = 5000) {
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false
  });

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type, visible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  return {
    notification,
    showNotification,
    hideNotification,
    isVisible: notification.visible
  };
}
