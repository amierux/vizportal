"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/utils/email";

interface SendNotificationParams {
  companyId: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

/**
 * Insert a notification record.
 * If the recipient has email notifications enabled for this event type, sends an email.
 */
export async function sendNotification(params: SendNotificationParams) {
  const supabase = await createClient();

  const { companyId, recipientId, type, title, message, link } = params;

  // Insert the notification record
  const { error } = await supabase.from("notifications").insert({
    company_id: companyId,
    profile_id: recipientId,
    type,
    title,
    message,
    link: link ?? null,
  });

  if (error) return { error: "Failed to send notification" };

  // Check notification preferences for email
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("email")
    .eq("profile_id", recipientId)
    .eq("event_type", type)
    .single();

  if (prefs?.email) {
    const { data: recipient } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", recipientId)
      .single();

    if (recipient?.email) {
      await sendEmail({
        to: recipient.email,
        subject: title,
        html: `<p>${message}</p>${link ? `<p><a href="${link}">View details</a></p>` : ""}`,
      });
    }
  }

  return { success: true };
}

/**
 * Get the current user's recent notifications, ordered by created_at desc.
 */
export async function getMyNotifications(limit = 20) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/**
 * Count unread notifications for the current user.
 */
export async function getUnreadCount() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  return count ?? 0;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("profile_id", user.id);

  if (error) return { error: "Failed to mark as read" };

  revalidatePath("/");
  return { success: true };
}

/**
 * Mark all unread notifications as read for the current user.
 */
export async function markAllAsRead() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  if (error) return { error: "Failed to mark all as read" };

  revalidatePath("/");
  return { success: true };
}
