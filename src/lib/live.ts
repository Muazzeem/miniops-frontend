import {
  API_URL,
  getAccessToken,
  type ApiConversation,
  type ApiMessage,
  type ApiNotification,
} from "@/lib/api";

/** Chat updates (miniops/chat/push.py). `workspace` is the workspace ID. */
export type ChatEvent =
  | { type: "chat.message"; workspace: number; conversation: number; message: ApiMessage }
  | { type: "chat.message_deleted"; workspace: number; conversation: number; message: ApiMessage }
  | { type: "chat.conversation"; workspace: number; conversation: ApiConversation }
  | { type: "chat.conversation_removed"; workspace: number; conversation: number }
  | { type: "chat.read"; workspace: number; conversation: number };

export const isChatEvent = (m: { type: string }): m is ChatEvent => m.type.startsWith("chat.");

/**
 * Server push from the notifications WebSocket (miniops/notifications/consumers.py).
 * Messages are complete — apply them directly, no API call needed.
 */
export type LiveMessage =
  | { type: "ready" }
  | {
      type: "notification";
      workspace: number | null;
      notification: ApiNotification;
      /** Your unread count in that workspace after this change. */
      unread: number;
    }
  | ChatEvent
  | {
      type: "changed";
      workspace: number | null;
      action: "read" | "unread" | "deleted" | "read_all";
      ids: number[];
      unread: number;
    };

/** ws(s)://host/ws/notifications/, from the API URL (http://host/api). */
const socketUrl = () => {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/notifications/";
  return url.toString();
};

/**
 * Keep a WebSocket open while signed in and call `onMessage` for every push.
 * Reconnects with backoff (1s → 30s) after drops; `onReconnect` is the one time
 * callers should refetch, to catch up on anything missed while disconnected.
 * Returns a cleanup function.
 */
export function connectLive(
  onMessage: (message: LiveMessage) => void,
  onReconnect: () => void,
): () => void {
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  let stopped = false;

  const open = async () => {
    // Access tokens are short-lived: get a fresh one for every (re)connect.
    const token = await getAccessToken();
    if (stopped || !token) return;
    socket = new WebSocket(socketUrl());
    socket.onopen = () => socket?.send(JSON.stringify({ type: "auth", token }));
    socket.onmessage = (event) => {
      let message: LiveMessage;
      try {
        message = JSON.parse(String(event.data)) as LiveMessage;
      } catch {
        return;
      }
      if (message.type === "ready") {
        if (attempts > 0) onReconnect();
        attempts = 0;
      }
      onMessage(message);
    };
    socket.onclose = (event) => {
      socket = null;
      // 4401: the token was rejected — don't hammer the server with it.
      if (stopped || event.code === 4401) return;
      attempts += 1;
      retry = setTimeout(() => void open(), Math.min(30_000, 1000 * 2 ** (attempts - 1)));
    };
  };

  void open();
  return () => {
    stopped = true;
    clearTimeout(retry);
    socket?.close();
  };
}
