import { getMessagePreview, toClientMessage } from "./message-utils";

export const toClientGroup = (group, currentUserId) => {
  const participants =
    group.members?.map((member) => {
      const user = member.user;
      return user?.name || user?.username || user?.email || "Friend";
    }) || [];

  const messages =
    group.messages
      ?.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
      .map((message) => toClientMessage(message, currentUserId)) || [];

  const lastMessage = messages[messages.length - 1] || null;
  const lastPreview = lastMessage ? getMessagePreview(lastMessage) : null;
  const lastSenderName = lastMessage?.sender?.name;

  return {
    id: group.id,
    name: group.name,
    locationContext: group.locationContext || "",
    participants,
    lastMessage: lastPreview && lastSenderName
      ? `${lastSenderName}: ${lastPreview}`
      : "Say hi to start the chat",
    updatedAt: lastMessage?.sentAt || group.createdAt,
    messages,
  };
};
