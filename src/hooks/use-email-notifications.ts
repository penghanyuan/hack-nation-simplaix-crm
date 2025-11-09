'use client';

import { useEffect, useRef, useState } from 'react';
import { useActivityQueueStore } from '@/stores/activity-queue-store';

interface EmailNotification {
  type: 'connected' | 'new_emails' | 'heartbeat';
  count?: number;
}

/**
 * Hook to listen for real-time email notifications via Server-Sent Events
 * When new emails arrive, triggers the activity queue update
 * Only runs on client-side (browser)
 */
export function useEmailNotifications() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { setIsUpdating } = useActivityQueueStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      console.log('⚠️ Window is undefined (SSR)');
      return;
    }
    
    if (typeof EventSource === 'undefined') {
      console.error('❌ EventSource not supported in this browser');
      return;
    }

    // Create SSE connection
    console.log('🔌 Connecting to email notifications via SSE...');
    console.log('📍 SSE Endpoint: /api/emails/notifications');
    
    const eventSource = new EventSource('/api/emails/notifications');
    eventSourceRef.current = eventSource;
    
    console.log('📡 EventSource created, waiting for connection...');

    // Handle connection open
    eventSource.onopen = () => {
      console.log('✅ SSE connection established');
      setIsConnected(true);
    };

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const data: EmailNotification = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            console.log('✅ Connected to email notifications');
            break;
            
          case 'new_emails':
            console.log(`📧 Received notification: ${data.count} new email(s)`);
            // Trigger the activity queue update via Zustand store
            // This simulates clicking the "Update" button
            setIsUpdating(true);
            break;
            
          case 'heartbeat':
            // Keep-alive heartbeat, no action needed
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    // Handle errors
    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      console.error('EventSource readyState:', eventSource.readyState);
      console.error('0=CONNECTING, 1=OPEN, 2=CLOSED');
      setIsConnected(false);
      // EventSource will automatically try to reconnect
    };

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting from email notifications');
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [setIsUpdating]);

  return {
    isConnected,
  };
}

