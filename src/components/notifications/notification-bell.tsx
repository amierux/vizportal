"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Poll unread count every 30 seconds
  useEffect(() => {
    async function fetchCount() {
      const count = await getUnreadCount();
      setUnreadCount(count);
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getMyNotifications(20).then((data) => {
      setNotifications(data as Notification[]);
      setLoading(false);
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border bg-popover shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y">
            {loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            )}
            {!loading &&
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                    !n.is_read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${n.is_read ? "pl-4" : ""}`}>
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {getRelativeTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
