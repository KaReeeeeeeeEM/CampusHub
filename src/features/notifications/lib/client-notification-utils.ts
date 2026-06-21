export type ClientNotification = {
  id: string;
  title: string;
  description: string;
  body: string;
  type: string;
  category: string;
  unread: boolean;
  status: string;
  time: string;
  date: string;
  actionUrl: string | null;
};

type ApiNotification = {
  id: string;
  title: string;
  message?: string | null;
  body?: string | null;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  actionUrl?: string | null;
};

function toReadableLabel(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function formatNotificationDate(value?: string | null) {
  if (!value) return "Date not set";
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "Date not set";

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function parseApiResponse(response: Response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Notification request failed.");
  }

  return payload;
}

export function normalizeClientNotification(
  notification: ApiNotification,
): ClientNotification {
  const type = toReadableLabel(notification.type ?? "System");
  const description = notification.message ?? notification.body ?? "";

  return {
    id: notification.id,
    title: notification.title,
    description,
    body: description,
    type,
    category: type,
    unread: notification.status !== "READ",
    status: notification.status ?? "UNREAD",
    time: formatNotificationDate(notification.createdAt),
    date: formatNotificationDate(notification.createdAt),
    actionUrl: notification.actionUrl ?? null,
  };
}

export async function fetchClientNotifications() {
  const response = await fetch("/api/notifications?limit=100", {
    cache: "no-store",
  });
  const payload = await parseApiResponse(response);

  return (payload?.data?.notifications ?? []).map(normalizeClientNotification);
}

export async function markClientNotificationRead(id: string) {
  const response = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
  const payload = await parseApiResponse(response);

  return normalizeClientNotification(payload.data.notification);
}

export async function markAllClientNotificationsRead() {
  const response = await fetch("/api/notifications/mark-all-read", {
    method: "POST",
  });

  await parseApiResponse(response);
}

export async function deleteClientNotification(id: string) {
  const response = await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
  });

  await parseApiResponse(response);
}

export async function deleteClientNotifications(ids: string[]) {
  await Promise.all(ids.map((id) => deleteClientNotification(id)));
}

export function getNotificationTabs(notifications: ClientNotification[]) {
  return [
    { key: "All", label: "All", count: notifications.length },
    {
      key: "Unread",
      label: "Unread",
      count: notifications.filter((notification) => notification.unread).length,
    },
    ...Array.from(new Set(notifications.map((notification) => notification.type))).map(
      (type) => ({
        key: type,
        label: type,
        count: notifications.filter((notification) => notification.type === type)
          .length,
      }),
    ),
  ];
}

export function filterNotificationsByTab(
  notifications: ClientNotification[],
  activeTab: string,
) {
  if (activeTab === "All") return notifications;
  if (activeTab === "Unread") {
    return notifications.filter((notification) => notification.unread);
  }

  return notifications.filter((notification) => notification.type === activeTab);
}
