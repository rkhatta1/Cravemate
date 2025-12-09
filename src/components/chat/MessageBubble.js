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
