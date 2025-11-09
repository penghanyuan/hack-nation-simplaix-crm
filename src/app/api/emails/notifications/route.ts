import { NextRequest } from 'next/server';
import { emailNotifications } from '@/lib/email-notifications';

/**
 * GET /api/emails/notifications
 * Server-Sent Events endpoint for real-time email notifications
 */
export async function GET(request: NextRequest) {
  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      console.log('📡 SSE client connected');
      
      // Send initial connection message
      const initialData = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      // Subscribe to email notifications
      console.log('🔔 Subscribing to email notifications...');
      const unsubscribe = emailNotifications.subscribe((data) => {
        console.log(`📤 Sending SSE notification to client: ${data.newEmailsCount} new emails`);
        const message = `data: ${JSON.stringify({ 
          type: 'new_emails', 
          count: data.newEmailsCount 
        })}\n\n`;
        
        try {
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Error sending SSE message:', error);
        }
      });
      
      console.log(`✅ Subscribed! Total listeners: ${emailNotifications.getListenerCount()}`);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`;
          controller.enqueue(encoder.encode(heartbeatData));
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        console.log('📡 SSE connection closed');
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
    },
  });
}

