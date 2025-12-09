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
  };
};
