"use client";

import Link from "next/link";
import { useTransition } from "react";

const TYPE_LABELS: Record<string, string> = {
  feedback: "Feedback",
  video: "Vidéo",
  injury: "Blessure",
  goal: "Objectif",
  evaluation: "Évaluation",
  training: "Entraînement",
};

type Notification = {
  id: string;
  type: string;
  message: string;
  player_id: string | null;
  is_read: boolean;
  created_at: string;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

export function NotificationList({
  notifications,
  markAsRead,
  markAllAsRead,
}: {
  notifications: Notification[];
  markAsRead: (id: string) => Promise<{ error?: string; success?: boolean }>;
  markAllAsRead: () => Promise<{ error?: string; success?: boolean }>;
}) {
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function handleRead(id: string) {
    startTransition(async () => {
      await markAsRead(id);
    });
  }

  function handleReadAll() {
    startTransition(async () => {
      await markAllAsRead();
    });
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
        </p>
        {unreadCount > 0 && (
          <button type="button" className="btn-secondary" disabled={isPending} onClick={handleReadAll}>
            Tout marquer comme lu
          </button>
        )}
      </div>

      {notifications.map((n) => {
        const content = (
          <div
            className="flex items-start gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)", background: !n.is_read ? "var(--surf-2, #1c1f26)" : "transparent" }}
          >
            <span
              className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: !n.is_read ? "var(--brand)" : "transparent" }}
            />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                {TYPE_LABELS[n.type] ?? n.type}
              </p>
              <p className="text-sm">{n.message}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>{timeAgo(n.created_at)}</p>
            </div>
          </div>
        );

        return (
          <div key={n.id} onClick={() => !n.is_read && handleRead(n.id)} className={!n.is_read ? "cursor-pointer" : ""}>
            {n.player_id ? (
              <Link href={`/joueurs/${n.player_id}`}>{content}</Link>
            ) : (
              content
            )}
          </div>
        );
      })}

      {notifications.length === 0 && (
        <p className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-faint)" }}>
          Aucune notification pour l&apos;instant.
        </p>
      )}
    </div>
  );
}
