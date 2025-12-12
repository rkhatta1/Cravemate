export const parseYelpContent = (content) => {
  if (!content) {
    return { text: "", businesses: [] };
  }
  if (typeof content === "object") return content;
  try {
    const parsed = JSON.parse(content);
    const text = typeof parsed === "string" ? parsed : parsed.text || "";
    const businesses =
      typeof parsed === "string" ? [] : parsed.businesses || parsed.recommendations || [];
    return {
      text,
      businesses: Array.isArray(businesses) ? businesses : [],
    };
  } catch {
    return { text: content, businesses: [] };
  }
};

export const getMessagePreview = (message, limit = 80) => {
  if (!message) return "";
  if (message.sharedEntry) {
    return `Shared ${message.sharedEntry.businessName}`;
  }
  if (!message.isYelpResponse && typeof message.content === "string") {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed?.type === "dining-invite") {
        const inviteName = parsed.restaurant?.name || "Group invite";
        const inviteDate = parsed.schedule?.date
          ? new Date(`${parsed.schedule.date}T00:00:00`).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          : "";
        return `Invite: ${inviteName}${inviteDate ? ` (${inviteDate})` : ""}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  let text = message.content || "";
  if (message.isYelpResponse) {
    const payload = parseYelpContent(message.content);
    text = payload.text || "";
  }
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}…`;
};

export const toClientMessage = (message, currentUserId) => {
  const isYelp = Boolean(message.isYelpResponse);
  const fallbackName = isYelp ? "@yelp" : "Someone";
  const sender = message.sender
    ? {
        id: message.sender.id,
        name: message.sender.name || message.sender.username || fallbackName,
        isSelf: isYelp ? false : message.senderId === currentUserId,
      }
    : {
        id: null,
        name: fallbackName,
        isSelf: false,
      };

  return {
    id: message.id,
    content: message.content,
    sentAt: message.sentAt,
    groupId: message.groupId,
    sender,
    isYelpResponse: isYelp,
    sharedEntry: message.sharedEntry
      ? {
          id: message.sharedEntry.id,
          businessName: message.sharedEntry.businessName,
          blurb: message.sharedEntry.blurb,
          neighborhood: message.sharedEntry.neighborhood,
          elo: message.sharedEntry.elo,
          meta: message.sharedEntry.meta || {},
        }
      : null,
  };
};
