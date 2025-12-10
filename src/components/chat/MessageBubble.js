import React from "react";
import { parseYelpContent } from "@/lib/message-utils";
import YelpCard from "./YelpCard";

const AvatarPlaceholder = ({ children }) => (
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold text-neutral-900 shadow-sm">
    {children}
  </div>
);

const formatTimeLabel = (isoString) => {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const MessageBubble = ({ message, isSequence }) => {
  if (!message) return null;

  const isSelf = Boolean(message.sender?.isSelf);
  const senderName = message.sender?.name || "Someone";
  const isYelp = Boolean(message.isYelpResponse);
  const showAvatar = !isSelf && !isSequence;
  const avatarContent = isYelp ? "Y" : senderName?.[0] || "?";
  const payload = isYelp ? parseYelpContent(message.content) : null;
  const timeLabel = formatTimeLabel(message.sentAt);

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
          <p className="mt-2 whitespace-pre-line text-neutral-800">{payload?.text}</p>
          {payload?.businesses?.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {payload.businesses.slice(0, 3).map((biz) => (
                <YelpCard key={biz.id || biz.name} business={biz} />
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] text-neutral-500">@yelp · {timeLabel}</p>
        </div>
      </div>
    );
  }

  if (message.sharedEntry) {
    const shared = message.sharedEntry;
    return (
      <div
        className={`group flex gap-3 ${isSelf ? "justify-end" : "justify-start"} ${
          isSequence ? "mt-1" : "mt-4"
        }`}
      >
        <div className={showAvatar ? "" : "w-10"}>
          {showAvatar && <AvatarPlaceholder>{avatarContent}</AvatarPlaceholder>}
        </div>
        <div className="max-w-xl rounded-2xl border border-orange-100 bg-white px-4 py-4 text-sm shadow">
          <div className="flex items-center justify-between">
            <div>
          {!isSelf && !isSequence && (
            <p className="text-xs font-semibold text-neutral-700">{senderName}</p>
          )}
          <p className="text-sm font-bold text-neutral-900">{shared.businessName}</p>
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
          {shared.meta?.url && (
            <a
              href={shared.meta.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-yelp-red"
            >
              View on Yelp
            </a>
          )}
          <p className="mt-2 text-[10px] text-neutral-400">
            {isSelf ? "You" : senderName} · {timeLabel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex gap-3 ${isSelf ? "justify-end" : "justify-start"} ${
        isSequence ? "mt-1" : "mt-4"
      }`}
    >
      <div className={showAvatar ? "" : "w-10"}>
        {showAvatar && (
          <AvatarPlaceholder>{avatarContent}</AvatarPlaceholder>
        )}
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
        <p className={`mt-1 text-[10px] ${isSelf ? "text-neutral-300" : "text-neutral-500"}`}>
          {isSelf ? "You" : senderName} · {timeLabel}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
