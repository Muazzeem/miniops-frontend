// Keeps the chat caches (react-query) in step with live events from the socket,
// so chat never polls: the conversation list and open threads update in place.
import type { QueryClient } from "@tanstack/react-query";
import type { ApiConversation, ApiMessage, MessagePage } from "@/lib/api";
import type { ChatEvent } from "@/lib/live";

export const conversationsKey = (workspaceId: number | null) => [
  "chat",
  workspaceId,
  "conversations",
];
export const messagesKey = (workspaceId: number | null, conversationId: number) => [
  "chat",
  workspaceId,
  "messages",
  conversationId,
];

const byRecent = (a: ApiConversation, b: ApiConversation) =>
  (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at);

/** Add or replace a message in an open thread (dedupes our own sends). */
export function upsertMessage(qc: QueryClient, workspaceId: number, message: ApiMessage) {
  qc.setQueryData<MessagePage>(messagesKey(workspaceId, message.conversation), (page) => {
    if (!page) return page;
    const exists = page.results.some((m) => m.id === message.id);
    return {
      ...page,
      results: exists
        ? page.results.map((m) =>
            m.id === message.id
              ? message
              : m.reply_to?.id === message.id && message.deleted
                ? { ...m, reply_to: { ...m.reply_to, text: "", has_image: false, deleted: true } }
                : m,
          )
        : [...page.results, message],
    };
  });
}

export function setConversation(qc: QueryClient, workspaceId: number, convo: ApiConversation) {
  qc.setQueryData<ApiConversation[]>(conversationsKey(workspaceId), (list) =>
    list ? [convo, ...list.filter((c) => c.id !== convo.id)].sort(byRecent) : list,
  );
}

export function applyChatEvent(qc: QueryClient, event: ChatEvent, myId: number | undefined) {
  const wid = event.workspace;
  const key = conversationsKey(wid);
  switch (event.type) {
    case "chat.message": {
      upsertMessage(qc, wid, event.message);
      const list = qc.getQueryData<ApiConversation[]>(key);
      if (list && !list.some((c) => c.id === event.conversation)) {
        // Someone started a chat with us: fetch the list once to get it.
        void qc.invalidateQueries({ queryKey: key });
        return;
      }
      qc.setQueryData<ApiConversation[]>(key, (l) =>
        l
          ?.map((c) =>
            c.id === event.conversation
              ? {
                  ...c,
                  last_message: event.message,
                  last_message_at: event.message.created_at,
                  unread: event.message.author === myId ? 0 : c.unread + 1,
                }
              : c,
          )
          .sort(byRecent),
      );
      return;
    }
    case "chat.message_deleted":
      upsertMessage(qc, wid, event.message);
      qc.setQueryData<ApiConversation[]>(key, (l) =>
        l?.map((c) =>
          c.last_message?.id === event.message.id ? { ...c, last_message: event.message } : c,
        ),
      );
      return;
    case "chat.conversation":
      setConversation(qc, wid, event.conversation);
      return;
    case "chat.conversation_removed":
      qc.setQueryData<ApiConversation[]>(key, (l) => l?.filter((c) => c.id !== event.conversation));
      qc.removeQueries({ queryKey: messagesKey(wid, event.conversation) });
      return;
    case "chat.read":
      qc.setQueryData<ApiConversation[]>(key, (l) =>
        l?.map((c) => (c.id === event.conversation ? { ...c, unread: 0 } : c)),
      );
  }
}
