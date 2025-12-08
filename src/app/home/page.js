"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";

const EmptyConversation = () => (
  <div className="flex h-full items-center justify-center text-center text-gray-500">
    <div className="max-w-sm space-y-3">
      <p className="text-lg font-semibold text-gray-700">No chat selected</p>
      <p className="text-sm">
        Pick a chat from the sidebar or start a new one to bring @yelp into the conversation.
      </p>
    </div>
  </div>
);

const EmptyState = ({ onCreate, isLoading, error }) => (
  <div className="flex h-full items-center justify-center">
    <div className="text-center space-y-4">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500 text-2xl">
        💬
      </div>
      <div className="space-y-1">
        <p className="text-xl font-semibold text-gray-800">
          {error ? "We couldn't load your chats" : "Spin up your first group chat"}
        </p>
        <p className="text-gray-500">
          {isLoading
            ? "Loading your group chats..."
            : error || "Add friends, toss @yelp into the mix, and let AI keep dinner plans moving."}
        </p>
      </div>
      {!isLoading && !error && (
        <button
          onClick={onCreate}
          className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Start a chat
        </button>
      )}
    </div>
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

export default function HomePage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [loadError, setLoadError] = useState("");

  const handleIncomingMessage = useCallback((payload) => {
    const normalized = {
      ...payload,
      sentAt: payload.sentAt || new Date().toISOString(),
      sender: {
        ...payload.sender,
        name: payload.sender?.name || "Someone",
        isSelf: false,
      },
    };

    setGroups((prev) => {
      let groupFound = false;
      const updated = prev.map((group) => {
        if (group.id !== normalized.groupId) return group;
        groupFound = true;
        const messages = [...(group.messages || []), normalized];
        return {
          ...group,
          messages,
          lastMessage: `${normalized.sender.name}: ${normalized.content}`,
          updatedAt: normalized.sentAt,
        };
      });
      return groupFound ? updated : prev;
    });
  }, []);

  const socketRef = useSocket({
    onMessage: handleIncomingMessage,
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    let isCancelled = false;

    async function loadGroups() {
      setIsLoadingGroups(true);
      setLoadError("");
      try {
        const response = await fetch("/api/groups");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load chats");
        }
        if (!isCancelled) {
          setGroups(payload.groups || []);
          setActiveGroupId(payload.groups?.[0]?.id || "");
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error.message || "Failed to load chats");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingGroups(false);
        }
      }
    }

    loadGroups();
    return () => {
      isCancelled = true;
    };
  }, [status]);

  const hasGroups = groups.length > 0;
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  if (status === "loading") {
    return <div className="p-10">Loading session...</div>;
  }

  const handleCreateChat = async () => {
    const defaultValue = "New Group";
    const name =
      typeof window !== "undefined"
        ? window.prompt("Name your group chat", defaultValue)
        : defaultValue;

    if (!name || !name.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to create group");
      }
      setGroups((prev) => [payload.group, ...prev]);
      setActiveGroupId(payload.group.id);
    } catch (error) {
      console.error(error);
      if (typeof window !== "undefined") {
        window.alert(error.message || "Failed to create group");
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5]">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-400">Cravemate</p>
          <h1 className="text-xl font-semibold text-gray-900">Chats</h1>
        </div>
        <div className="flex items-center gap-3">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt="avatar"
              className="h-10 w-10 rounded-full border border-gray-200 object-cover"
            />
          )}
          <div className="text-sm">
            <p className="font-semibold text-gray-900">{session?.user?.name}</p>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-gray-500 hover:text-gray-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-full max-w-sm border-r border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Your groups
            </p>
            <button
              onClick={handleCreateChat}
              className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800"
            >
              + New
            </button>
          </div>

          <div className="px-3 pb-3">
            <input
              type="search"
              placeholder="Search chats"
              className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <div className="h-full overflow-y-auto">
            {groups.map((group) => {
              const isActive = group.id === activeGroupId;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  className={`flex w-full flex-col items-start gap-1 border-b border-gray-100 px-4 py-3 text-left transition ${
                    isActive ? "bg-orange-50/70" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <p className="font-semibold text-gray-900">{group.name}</p>
                    <span className="text-xs text-gray-400">
                      {formatTimeLabel(group.updatedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{group.participants.join(", ")}</p>
                  <p className="line-clamp-1 text-sm text-gray-600">{group.lastMessage}</p>
                </button>
              );
            })}

            {!groups.length && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {isLoadingGroups
                  ? "Loading chats..."
                  : loadError || "No chats yet—tap “New” to start one."}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 bg-[url('/whatsapp-bg.png')] bg-cover bg-center">
          {!hasGroups && (
            <EmptyState
              onCreate={handleCreateChat}
              isLoading={isLoadingGroups}
              error={loadError}
            />
          )}
          {hasGroups && !activeGroup && <EmptyConversation />}
          {hasGroups && activeGroup && (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{activeGroup.name}</p>
                  <p className="text-xs text-gray-500">
                    {activeGroup.participants.length} members · includes @yelp
                  </p>
                </div>
                <button className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                  View context
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-white/90 to-white px-6 py-6">
                {activeGroup.messages?.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-md rounded-2xl px-4 py-3 text-sm shadow ${
                      message.sender.isSelf
                        ? "ml-auto rounded-br-none bg-black text-white"
                        : "rounded-bl-none bg-white text-gray-800"
                    }`}
                  >
                    {!message.sender.isSelf && (
                      <p className="font-semibold text-gray-900">{message.sender.name}</p>
                    )}
                    <p>{message.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        message.sender.isSelf ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      {message.sender.isSelf ? "You" : message.sender.name} ·{" "}
                      {formatTimeLabel(message.sentAt)}
                    </p>
                  </div>
                ))}
              </div>

              <form
                className="flex items-center gap-3 border-t border-gray-200 bg-white px-6 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!messageInput.trim() || !activeGroup) return;

                  const sendMessage = async () => {
                    try {
                      const response = await fetch(`/api/groups/${activeGroup.id}/messages`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ content: messageInput.trim() }),
                      });
                      const payload = await response.json();
                      if (!response.ok) {
                        throw new Error(payload?.error || "Failed to send message");
                      }

                      const message = payload.message;

                      setGroups((prev) =>
                        prev.map((group) =>
                          group.id === activeGroup.id
                            ? {
                                ...group,
                                messages: [...(group.messages || []), message],
                                lastMessage: `${message.sender.name}: ${message.content}`,
                                updatedAt: message.sentAt,
                              }
                            : group
                        )
                      );

                      socketRef.current?.emit("chat:send", message);
                    } catch (error) {
                      console.error(error);
                      if (typeof window !== "undefined") {
                        window.alert(error.message || "Failed to send message");
                      }
                    }
                  };

                  sendMessage();
                  setMessageInput("");
                }}
              >
                <input
                  type="text"
                  placeholder='Message... tip: prefix with "@yelp" to ask for help'
                  className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
