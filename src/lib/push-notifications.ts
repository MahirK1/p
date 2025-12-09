import webpush from "web-push";
import { prisma } from "./prisma";

// Konfiguriši VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@italgroup.ba";

let vapidConfigured = false;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
    console.log("✅ VAPID keys configured successfully");
  } catch (error) {
    console.error("❌ Error configuring VAPID keys:", error);
  }
} else {
  console.warn("⚠️ VAPID keys not configured. Check environment variables:");
  console.warn("   NEXT_PUBLIC_VAPID_PUBLIC_KEY:", vapidPublicKey ? "✅" : "❌");
  console.warn("   VAPID_PRIVATE_KEY:", vapidPrivateKey ? "✅" : "❌");
}

export async function sendPushNotificationToUser(
  userId: string,
  title: string,
  body: string,
  options?: {
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    data?: any;
  }
) {
  if (!vapidConfigured) {
    console.error("❌ Cannot send push notification: VAPID keys not configured");
    return { success: false, reason: "VAPID keys not configured" };
  }

  try {
    // Pronađi subscription za korisnika
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      console.log(`⚠️ No push subscription found for user ${userId}`);
      return { success: false, reason: "No subscription found" };
    }

    let keys;
    try {
      keys = typeof subscription.keys === "string" 
        ? JSON.parse(subscription.keys) 
        : subscription.keys;
    } catch (e) {
      console.error(`❌ Error parsing subscription keys for user ${userId}:`, e);
      return { success: false, reason: "Invalid subscription format" };
    }

    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: keys.p256dh || keys.p256dhKey,
        auth: keys.auth || keys.authKey,
      },
    };

    // Provjeri da li su keys postavljeni
    if (!subscriptionData.keys.p256dh || !subscriptionData.keys.auth) {
      console.error(`❌ Invalid subscription keys for user ${userId}:`, subscriptionData.keys);
      return { success: false, reason: "Invalid subscription keys" };
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: options?.icon || "/italgroup-logo.png",
      badge: options?.badge || "/italgroup-logo.png",
      tag: options?.tag || "notification",
      data: {
        url: options?.url || "/dashboard/commercial",
        ...options?.data,
      },
      requireInteraction: false,
      silent: false,
    });

    console.log(`📤 Sending push notification to user ${userId}`);
    console.log(`   Title: ${title}`);
    console.log(`   Endpoint: ${subscription.endpoint.substring(0, 50)}...`);
    
    try {
      await webpush.sendNotification(subscriptionData, payload);
      console.log(`✅ Push notification sent successfully to user ${userId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`❌ WebPush error for user ${userId}:`, {
        statusCode: error.statusCode,
        message: error.message,
        body: error.body,
      });
      
      // Ako je subscription invalid, obriši ga
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`🗑️ Removing invalid subscription for user ${userId}`);
        await prisma.pushSubscription.delete({
          where: { userId },
        }).catch((e) => {
          console.error("Error deleting subscription:", e);
        });
      }
      
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    console.error(`❌ Error sending push notification to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

export async function sendPushNotificationToMultipleUsers(
  userIds: string[],
  title: string,
  body: string,
  options?: {
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    data?: any;
  }
) {
  console.log(`📤 Attempting to send push notifications to ${userIds.length} users`);
  
  const results = await Promise.allSettled(
    userIds.map((userId) =>
      sendPushNotificationToUser(userId, title, body, options)
    )
  );

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value.success
  ).length;
  const failed = results.length - successful;

  console.log(`📊 Push notification results: ${successful} successful, ${failed} failed out of ${results.length} total`);

  return { successful, failed, total: results.length };
}
