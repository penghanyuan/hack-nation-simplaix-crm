#!/usr/bin/env tsx

/**
 * Test script for Gmail Watch webhook
 * 
 * This script simulates a Google Cloud Pub/Sub notification
 * to test your webhook endpoint locally.
 * 
 * Usage:
 *   tsx scripts/test-gmail-webhook.ts [historyId]
 */

async function testGmailWebhook(historyId: string = '12345') {
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/gmail/watch';
  
  // Create test notification data
  const notificationData = {
    emailAddress: 'test@gmail.com',
    historyId: historyId,
  };
  
  // Encode as base64 (as Pub/Sub does)
  const encodedData = Buffer.from(JSON.stringify(notificationData)).toString('base64');
  
  // Create Pub/Sub message format
  const pubsubMessage = {
    message: {
      data: encodedData,
      messageId: `test-${Date.now()}`,
      publishTime: new Date().toISOString(),
    },
    subscription: 'projects/test-project/subscriptions/gmail-push-sub',
  };
  
  console.log('🚀 Testing Gmail Watch Webhook');
  console.log('📍 Webhook URL:', webhookUrl);
  console.log('📦 Notification Data:', notificationData);
  console.log('');
  
  try {
    console.log('⏳ Sending test notification...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pubsubMessage),
    });
    
    const result = await response.json();
    
    console.log('');
    console.log('✅ Response Status:', response.status);
    console.log('📨 Response Body:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('');
      console.log('✨ Success! The webhook processed the notification.');
      if (result.newEmails > 0) {
        console.log(`📧 ${result.newEmails} new email(s) were processed.`);
      } else {
        console.log('ℹ️  No new emails found (this is normal if historyId matches current state).');
      }
    } else {
      console.log('');
      console.log('⚠️  The webhook returned success=false');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('');
    console.error('❌ Error testing webhook:', error);
    
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.error('');
      console.error('💡 Make sure your dev server is running:');
      console.error('   pnpm dev');
    }
  }
}

// Get historyId from command line args
const historyId = process.argv[2];

testGmailWebhook(historyId);

