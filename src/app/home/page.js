"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { useRouter } from "next/navigation";

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
  const [revalidating, setRevalidating] = useState(true);
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [loadError, setLoadError] = useState("");

  const appendMessage = useCallback((groupsList, groupId, message, overrides = {}) => {
    let groupFound = false;
    const updated = groupsList.map((group) => {
      if (group.id !== groupId) return group;
      groupFound = true;
      const exists = (group.messages || []).some((m) => m.id === message.id);
      if (exists) return group;
      const messages = [...(group.messages || []), message];
      return {
        ...group,
        ...overrides,
        messages,
        lastMessage: `${message.sender.name}: ${message.content}`,
        updatedAt: message.sentAt,
      };
    });
    return groupFound ? updated : groupsList;
  }, []);

  const handleIncomingMessage = useCallback(
    (payload) => {
      const normalized = {
        ...payload,
        sentAt: payload.sentAt || new Date().toISOString(),
        sender: {
          ...payload.sender,
          name: payload.sender?.name || "Someone",
          isSelf: false,
        },
      };

      setGroups((prev) => appendMessage(prev, normalized.groupId, normalized));
    },
    [appendMessage]
  );

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
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      setRevalidating(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) return;

    if (!session.user.hasFinishedOnboarding) {
      router.replace("/onboarding");
    }
  }, [status, session, router]);

  const [newGroupModal, setNewGroupModal] = useState({
    open: false,
    name: "",
    location: "",
    error: "",
    isSubmitting: false,
  });

  if (status === "loading" || revalidating) {
    return <div className="p-10">Loading session...</div>;
  }

  const openCreateModal = () =>
    setNewGroupModal({
      open: true,
      name: "",
      location: "",
      error: "",
      isSubmitting: false,
    });

  const closeCreateModal = () =>
    setNewGroupModal((prev) => ({ ...prev, open: false }));

  const handleCreateChat = async () => {
    setNewGroupModal((prev) => ({ ...prev, isSubmitting: true, error: "" }));
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupModal.name.trim(),
          locationContext: newGroupModal.location.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to create group");
      }
      setGroups((prev) => [payload.group, ...prev]);
      setActiveGroupId(payload.group.id);
      closeCreateModal();
    } catch (error) {
      setNewGroupModal((prev) => ({
        ...prev,
        error: error.message || "Failed to create group",
      }));
    } finally {
      setNewGroupModal((prev) => ({ ...prev, isSubmitting: false }));
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
              onClick={openCreateModal}
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

                      setGroups((prev) => appendMessage(prev, activeGroup.id, message));

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

      {newGroupModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-gray-900">Start a group chat</h3>
              <p className="text-sm text-gray-500">
                Give your chat a name and define where @yelp should look for recommendations.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Group name
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. Sunday brunch crew"
                  value={newGroupModal.name}
                  onChange={(e) =>
                    setNewGroupModal((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  City / Zip (optional)
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. Brooklyn"
                  value={newGroupModal.location}
                  onChange={(e) =>
                    setNewGroupModal((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  We’ll default to your profile city if you leave this blank.
                </p>
              </div>

              {newGroupModal.error && (
                <p className="text-sm text-red-500">{newGroupModal.error}</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeCreateModal}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                disabled={newGroupModal.isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChat}
                disabled={newGroupModal.isSubmitting || !newGroupModal.name.trim()}
                className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {newGroupModal.isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
