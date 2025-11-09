/**
 * Email Notification System
 * Uses in-memory event emitter for real-time notifications
 * Uses Node.js global to ensure true singleton across Next.js isolates
 */

type EmailNotificationListener = (data: { newEmailsCount: number }) => void;

class EmailNotificationManager {
  private listeners: Set<EmailNotificationListener> = new Set();

  /**
   * Subscribe to email notifications
   */
  subscribe(listener: EmailNotificationListener): () => void {
    console.log(`➕ Adding listener. Current count: ${this.listeners.size}`);
    this.listeners.add(listener);
    console.log(`✅ Listener added. New count: ${this.listeners.size}`);
    
    // Return unsubscribe function
    return () => {
      console.log(`➖ Removing listener. Current count: ${this.listeners.size}`);
      this.listeners.delete(listener);
      console.log(`✅ Listener removed. New count: ${this.listeners.size}`);
    };
  }

  /**
   * Notify all listeners of new emails
   */
  notify(data: { newEmailsCount: number }): void {
    console.log(`📢 Notifying ${this.listeners.size} listeners of ${data.newEmailsCount} new emails`);
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  /**
   * Get count of active listeners
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Create global singleton that persists across Next.js isolates
declare global {
  // eslint-disable-next-line no-var
  var __emailNotifications: EmailNotificationManager | undefined;
}

// Use global to ensure singleton across serverless function instances
if (!global.__emailNotifications) {
  console.log('🔧 Creating new EmailNotificationManager instance');
  global.__emailNotifications = new EmailNotificationManager();
} else {
  console.log('♻️ Reusing existing EmailNotificationManager instance');
}

export const emailNotifications = global.__emailNotifications;

