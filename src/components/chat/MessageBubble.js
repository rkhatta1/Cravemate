import React from "react";
import { parseYelpContent } from "@/lib/message-utils";
import { CalendarDays, MapPin } from "lucide-react";
import YelpCard from "./YelpCard";
import SendInviteButton from "./SendInviteButton";

const AvatarPlaceholder = ({ children }) => (
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold text-neutral-900 shadow-sm">
    {children}
  </div>
);

const formatTimeLabel = (isoString) => {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
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

const formatInviteScheduleLabel = (schedule) => {
  if (!schedule) return "";
  const tz = schedule.timezone ? ` (${schedule.timezone})` : "";

  if (schedule.datetime) {
    try {
      const label = new Date(schedule.datetime).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${label}${tz}`;
    } catch {
      return `${schedule.datetime}${tz}`;
    }
  }

  if (!schedule.date) return "";
  const start = schedule.startTime || "--";
  const end = schedule.endTime || "--";
  try {
    const dateLabel = new Date(`${schedule.date}T00:00:00`).toLocaleDateString(
      undefined,
      {
        weekday: "short",
        month: "short",
        day: "numeric",
      }
    );
    return `${dateLabel} · ${start} - ${end}${tz}`;
  } catch {
    return `${schedule.date} · ${start} - ${end}${tz}`;
  }
};

const MessageBubble = ({
  message,
  isSequence,
  onSendInvite,
  onRespondToInvite,
  acceptedInviteMessageId = "",
}) => {
  if (!message) return null;

  const isSelf = Boolean(message.sender?.isSelf);
  const senderName = message.sender?.name || "Someone";
  const isYelp = Boolean(message.isYelpResponse);
  const showAvatar = !isSelf && !isSequence;
  const avatarContent = isYelp ? "Y" : senderName?.[0] || "?";
  const payload = isYelp ? parseYelpContent(message.content) : null;
  const invitePayload = !isYelp ? parseInviteContent(message.content) : null;
  const timeLabel = formatTimeLabel(message.sentAt);

  const emitInviteEvent = (payload) => {
    if (typeof onSendInvite !== "function") return;
    onSendInvite({
      ...payload,
      messageId: message.id,
      groupId: message.groupId,
    });
  };

  const emitInviteResponse = (decision) => {
    if (!invitePayload || typeof onRespondToInvite !== "function") return;
    onRespondToInvite({
      decision,
      invite: invitePayload,
      messageId: message.id,
      groupId: message.groupId,
    });
  };

  if (isYelp) {
    return (
      <div className="group mt-4 flex gap-3">
        <div className={showAvatar ? "" : "w-10"}>
          {showAvatar && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yelp-red text-sm font-bold text-white shadow-sm">
              {avatarContent}
            </div>
          )}
        </div>
        <div className="max-w-2xl rounded-2xl border border-yelp-red/15 bg-white px-4 py-4 text-sm shadow">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yelp-red">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-yelp-red/10 text-yelp-red">
              @
            </span>
            Yelp AI
          </div>
          <p className="mt-2 whitespace-pre-line text-neutral-800">
            {payload?.text}
          </p>
          {payload?.businesses?.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {payload.businesses.slice(0, 3).map((biz) => (
                <YelpCard
                  key={biz.id || biz.name}
                  business={biz}
                  onSendInvite={(business) =>
                    emitInviteEvent({
                      source: "yelp-recommendation",
                      business,
                    })
                  }
                />
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] text-neutral-500">
            @yelp · {timeLabel}
          </p>
        </div>
      </div>
    );
  }

  if (invitePayload) {
    const restaurant = invitePayload.restaurant || {};
    const scheduleLabel = formatInviteScheduleLabel(invitePayload.schedule);
    const categoriesLabel = Array.isArray(restaurant.categories)
      ? restaurant.categories.join(" • ")
      : "";
    const alreadyAcceptedThis = acceptedInviteMessageId === message.id;
    const blockedByOther = Boolean(
      acceptedInviteMessageId && acceptedInviteMessageId !== message.id
    );

    return (
      <div
        className={`group flex gap-3 ${
          isSelf ? "justify-end" : "justify-start"
        } ${isSequence ? "mt-1" : "mt-4"}`}
      >
        <div className={showAvatar ? "" : "w-10"}>
          {showAvatar && <AvatarPlaceholder>{avatarContent}</AvatarPlaceholder>}
        </div>
        <div className="max-w-xl rounded-2xl border border-indigo-100 bg-white px-4 py-4 text-sm shadow">
          {!isSelf && !isSequence && (
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
              {senderName} shared a meetup
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {restaurant.name || "Invite"}
              </p>
              {restaurant.address && (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={12} />
                  {restaurant.address}
                </p>
              )}
              {categoriesLabel && (
                <p className="mt-1 text-xs text-gray-400">{categoriesLabel}</p>
              )}
            </div>
            {restaurant.image && (
              <div className="hidden h-16 w-16 overflow-hidden rounded-2xl bg-gray-100 sm:block">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </div>
          <div className="flex mt-3 items-center justify-between">
            {scheduleLabel && (
              <p className="inline-flex items-center gap-1 rounded-xl bg-neutral-50 px-3 py-1 text-xs font-semibold text-gray-600">
                <CalendarDays size={14} />
                {scheduleLabel}
              </p>
            )}

            {restaurant.blurb && (
              <p className="text-sm text-neutral-600">{restaurant.blurb}</p>
            )}
          </div>
          <div className="mt-3 flex items-center">
            <div className="gap-2 flex flex-wrap">
              <button
                type="button"
                onClick={() => emitInviteResponse("accept")}
                disabled={
                  isSelf ||
                  typeof onRespondToInvite !== "function" ||
                  blockedByOther ||
                  alreadyAcceptedThis
                }
                className="rounded-2xl bg-yelp-red px-4 py-2 text-xs font-semibold text-white shadow hover:bg-yelp-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {alreadyAcceptedThis
                  ? "Accepted"
                  : blockedByOther
                  ? "Plan picked"
                  : "Accept"}
              </button>
              {restaurant.url && (
                <a
                  href={restaurant.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-yelp-red"
                >
                  View details
                </a>
              )}
            </div>
          </div>
          {/* <div className="mt-4 flex flex-wrap gap-2">
          </div> */}
          <p className="mt-2 text-[10px] text-neutral-400">
            {isSelf ? "You" : senderName} · {timeLabel}
          </p>
        </div>
      </div>
    );
  }

  if (message.sharedEntry) {
    const shared = message.sharedEntry;
    return (
      <div
        className={`group flex gap-3 ${
          isSelf ? "justify-end" : "justify-start"
        } ${isSequence ? "mt-1" : "mt-4"}`}
      >
        <div className={showAvatar ? "" : "w-10"}>
          {showAvatar && <AvatarPlaceholder>{avatarContent}</AvatarPlaceholder>}
        </div>
        <div className="max-w-xl rounded-2xl border border-orange-100 bg-white px-4 py-4 text-sm shadow">
          <div className="flex items-center justify-between">
            <div>
              {!isSelf && !isSequence && (
                <p className="text-xs font-semibold text-neutral-700">
                  {senderName}
                </p>
              )}
              <p className="text-sm font-bold text-neutral-900">
                {shared.businessName}
              </p>
              <p className="text-xs text-neutral-500">
                {shared.neighborhood || shared.meta?.address || "Shared spot"}
              </p>
            </div>
          </div>
          {shared.meta?.image && (
            <div className="mt-3 h-40 w-full overflow-hidden rounded-2xl bg-gray-100">
              <img
                src={shared.meta.image}
                alt={shared.businessName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          {!shared.meta?.rating && (shared.blurb || message.content) && (
            <p className="mt-3 text-sm text-neutral-700">
              {shared.blurb || message.content}
            </p>
          )}
          {shared.meta?.rating ? (
            <p className="mt-2 text-xs text-neutral-500">
              {shared.meta.rating}★ · {shared.meta.reviewCount || "—"} reviews ·{" "}
              {shared.meta.price || "price TBD"}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {shared.meta?.url && (
              <a
                href={shared.meta.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-yelp-red"
              >
                View on Yelp
              </a>
            )}
            <SendInviteButton
              size="sm"
              onClick={() =>
                emitInviteEvent({
                  source: "shared-leaderboard-entry",
                  entry: shared,
                })
              }
            />
          </div>
          <p className="mt-2 text-[10px] text-neutral-400">
            {isSelf ? "You" : senderName} · {timeLabel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex gap-3 ${
        isSelf ? "justify-end" : "justify-start"
      } ${isSequence ? "mt-1" : "mt-4"}`}
    >
      <div className={showAvatar ? "" : "w-10"}>
        {showAvatar && <AvatarPlaceholder>{avatarContent}</AvatarPlaceholder>}
      </div>
      <div
        className={`max-w-xl rounded-2xl px-4 py-3 text-sm shadow ${
          isSelf
            ? "ml-auto rounded-br-none bg-neutral-900 text-white"
            : "rounded-bl-none border border-neutral-100 bg-white text-neutral-900"
        }`}
      >
        {!isSelf && !isSequence && (
          <p className="text-xs font-semibold text-neutral-700">{senderName}</p>
        )}
        <p className={isSelf ? "text-neutral-50" : "text-neutral-800"}>
          {message.content}
        </p>
        <p
          className={`mt-1 text-[10px] ${
            isSelf ? "text-neutral-300" : "text-neutral-500"
          }`}
        >
          {isSelf ? "You" : senderName} · {timeLabel}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
