import React from "react";

const EmptyConversation = () => (
  <div className="flex h-full items-center justify-center text-center text-neutral-500">
    <div className="max-w-sm space-y-3">
      <p className="text-lg font-semibold text-neutral-800">No chat selected</p>
      <p className="text-sm">
        Pick a chat from the sidebar or start a new one to bring @yelp into the conversation.
      </p>
    </div>
  </div>
);

export default EmptyConversation;
