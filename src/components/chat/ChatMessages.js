import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

const ChatMessages = ({
  messages,
  onSendInvite,
  onRespondToInvite,
  acceptedInviteMessageId = "",
}) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    console.log('activeMessages:', messages);
  }, [messages]);

  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-neutral-50 px-4 py-6 sm:px-6">
      {safeMessages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isSequence={
            index > 0 &&
            safeMessages[index - 1]?.sender?.id === message.sender?.id &&
            !message.isYelpResponse
          }
          onSendInvite={onSendInvite}
          onRespondToInvite={onRespondToInvite}
          acceptedInviteMessageId={acceptedInviteMessageId}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default ChatMessages;
