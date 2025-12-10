import React from "react";
import { PanelLeft } from "lucide-react";

const EmptyState = ({ onCreate, isLoading, error, showSidebarToggle, onOpenSidebar }) => (
  <div className="relative flex h-full items-center justify-center">
    {showSidebarToggle && (
      <button
        type="button"
        onClick={onOpenSidebar}
        className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 shadow hover:border-yelp-red hover:text-yelp-red"
      >
        <PanelLeft size={16} />
      </button>
    )}
    <div className="space-y-4 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-yelp-red/10 text-yelp-red text-2xl">
        💬
      </div>
      <div className="space-y-1">
        <p className="text-xl font-semibold text-neutral-900">
          {error ? "We couldn't load your chats" : "Spin up your first group chat"}
        </p>
        <p className="text-neutral-500">
          {isLoading
            ? "Loading your group chats..."
            : error || "Add friends, toss @yelp into the mix, and let AI keep dinner plans moving."}
        </p>
      </div>
      {!isLoading && !error && (
        <button
          onClick={onCreate}
          className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Start a chat
        </button>
      )}
    </div>
  </div>
);

export default EmptyState;
