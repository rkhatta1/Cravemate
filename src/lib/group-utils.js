import { getMessagePreview, toClientMessage } from "./message-utils";

const parseVibeReport = (raw) => {
  if (!raw) return "";
  if (typeof raw === "object") {
    return raw.headline || raw.summary || raw.text || JSON.stringify(raw);
  }
  if (typeof raw !== "string") return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.summary;
  } catch {
    return raw;
  }
};

export const buildMemberContextData = (member) => {
  const user = member?.user || member || {};
  const favorites = user.favoritesContext || {};
  const cuisines = Array.isArray(favorites.cuisines) ? favorites.cuisines : [];
  const foods = Array.isArray(favorites.foods) ? favorites.foods : [];

  return {
    id: user.id,
    name: user.name || user.username || user.email || "Friend",
    username: user.username || "",
    email: user.email || "",
    location: user.location || "",
    dietaryPrefs: Array.isArray(user.dietaryPrefs) ? user.dietaryPrefs : [],
    favoriteCuisines: cuisines,
    favoriteFoods: foods,
    vibeReport: user.vibeReport || "",
    vibeSummary: parseVibeReport(user.vibeReport),
    role: member.role || "MEMBER",
    joinedAt: member.joinedAt || null,
  };
};

export const buildGroupContextPayload = (input = {}) => {
  const membersSource =
    Array.isArray(input.members) && input.members.length
      ? input.members
      : Array.isArray(input.group?.members)
      ? input.group.members
      : [];

  const members = membersSource.map((member) => buildMemberContextData(member));

  const location =
    input.locationContext ??
    input.location ??
    input.group?.locationContext ??
    "";

  const name = input.name ?? input.group?.name ?? "";

  return {
    groupId: input.id || input.group?.id || null,
    groupName: name,
    location,
    members,
  };
};

const parseInviteContent = (content) => {
  if (!content) return null;
  if (typeof content === "object") {
    return content?.type === "dining-invite" ? content : null;
  }
  try {
    const parsed = JSON.parse(content);
    return parsed?.type === "dining-invite" ? parsed : null;
  } catch {
    return null;
  }
};

export const toClientGroup = (group, currentUserId) => {
  const memberDetails = Array.isArray(group.members)
    ? group.members.map((member) => buildMemberContextData(member))
    : [];

  const participants = memberDetails.map(
    (member) => member.name || member.username || "Friend"
  );

  const messages =
    group.messages
      ?.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
      .map((message) => toClientMessage(message, currentUserId)) || [];

  const lastMessage = messages[messages.length - 1] || null;
  const lastPreview = lastMessage ? getMessagePreview(lastMessage) : null;
  const lastSenderName = lastMessage?.sender?.name;

  const acceptance = Array.isArray(group.inviteAcceptances)
    ? group.inviteAcceptances.find((item) => item?.userId === currentUserId) ||
      group.inviteAcceptances[0]
    : null;
  const acceptedInviteMessageId = acceptance?.inviteMessageId || "";
  const acceptedInviteMessage =
    acceptedInviteMessageId && Array.isArray(group.messages)
      ? group.messages.find((message) => message.id === acceptedInviteMessageId)
      : null;
  const pinnedInviteBase = acceptedInviteMessage
    ? parseInviteContent(acceptedInviteMessage.content)
    : null;
  const pinnedInvite = pinnedInviteBase
    ? {
        ...pinnedInviteBase,
        inviteMessageId: acceptedInviteMessageId,
        acceptedAt: acceptance?.acceptedAt || null,
      }
    : null;

  return {
    id: group.id,
    name: group.name,
    locationContext: group.locationContext || "",
    memberDetails,
    groupContext: group.groupContext || null,
    pinnedInvite,
    acceptedInviteMessageId,
    participants,
    lastMessage: lastPreview && lastSenderName
      ? `${lastSenderName}: ${lastPreview}`
      : "Say hi to start the chat",
    updatedAt: lastMessage?.sentAt || group.createdAt,
    messages,
  };
};
