"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { useRouter } from "next/navigation";
import { parseYelpContent, getMessagePreview } from "@/lib/message-utils";

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
    const senderName =
      message.sender?.name || (message.isYelpResponse ? "@yelp" : "Someone");
    const preview = getMessagePreview(message);
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
        lastMessage: `${senderName}: ${preview}`,
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
  const [inviteModal, setInviteModal] = useState({
    open: false,
    email: "",
    error: "",
    isSubmitting: false,
  });
  const [locationModal, setLocationModal] = useState({
    open: false,
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
    if (!newGroupModal.location.trim()) {
      setNewGroupModal((prev) => ({
        ...prev,
        error: "Add a city or ZIP so @yelp knows where to search.",
      }));
      return;
    }

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

  const requestYelpResponse = async (groupId, query) => {
    const targetGroup = groups.find((group) => group.id === groupId);
    if (!targetGroup?.locationContext) {
      if (typeof window !== "undefined") {
        window.alert("Add a city or ZIP to this group before asking @yelp.");
      }
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupId}/yelp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Yelp AI failed to respond");
      }
      const yelpMessage = payload.message;
      setGroups((prev) => appendMessage(prev, groupId, yelpMessage));
      socketRef.current?.emit("chat:send", yelpMessage);
    } catch (error) {
      console.error("Yelp AI error:", error);
      if (typeof window !== "undefined") {
        window.alert(error.message || "Yelp AI couldn't respond right now.");
      }
    }
  };

  const openInviteModal = () => {
    if (!activeGroupId) return;
    setInviteModal({
      open: true,
      email: "",
      error: "",
      isSubmitting: false,
    });
  };

  const closeInviteModal = () =>
    setInviteModal((prev) => ({ ...prev, open: false }));

  const handleInvite = async () => {
    if (!inviteModal.email.trim()) {
      setInviteModal((prev) => ({ ...prev, error: "Email is required" }));
      return;
    }

    setInviteModal((prev) => ({ ...prev, isSubmitting: true, error: "" }));
    try {
      const response = await fetch(`/api/groups/${activeGroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteModal.email.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to add member");
      }
      setGroups((prev) =>
        prev.map((group) => (group.id === payload.group.id ? payload.group : group))
      );
      closeInviteModal();
    } catch (error) {
      setInviteModal((prev) => ({
        ...prev,
        error: error.message || "Failed to add member",
      }));
    } finally {
      setInviteModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const openLocationModal = () => {
    if (!activeGroup) return;
    setLocationModal({
      open: true,
      location: activeGroup.locationContext || "",
      error: "",
      isSubmitting: false,
    });
  };

  const closeLocationModal = () =>
    setLocationModal((prev) => ({ ...prev, open: false }));

  const handleLocationSave = async () => {
    if (!locationModal.location.trim()) {
      setLocationModal((prev) => ({
        ...prev,
        error: "City or ZIP is required.",
      }));
      return;
    }

    setLocationModal((prev) => ({ ...prev, isSubmitting: true, error: "" }));
    try {
      const response = await fetch(`/api/groups/${activeGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationContext: locationModal.location.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to update location");
      }
      setGroups((prev) =>
        prev.map((group) => (group.id === payload.group.id ? payload.group : group))
      );
      setActiveGroupId(payload.group.id);
      closeLocationModal();
    } catch (error) {
      setLocationModal((prev) => ({
        ...prev,
        error: error.message || "Failed to update location",
      }));
    } finally {
      setLocationModal((prev) => ({ ...prev, isSubmitting: false }));
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
                      {group.updatedAt ? formatTimeLabel(group.updatedAt) : "—"}
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
              onCreate={openCreateModal}
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
                  <p className="text-xs text-gray-400 flex items-center gap-2">
                    {activeGroup.locationContext
                      ? `Focused on ${activeGroup.locationContext}`
                      : "Set a city or ZIP to unlock @yelp"}
                    <button
                      type="button"
                      onClick={openLocationModal}
                      className="text-orange-600 hover:text-orange-700 font-semibold"
                    >
                      Change
                    </button>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={openInviteModal}
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                  >
                    Add friends
                  </button>
                  <button className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                    View context
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-white/90 to-white px-6 py-6">
                {activeGroup.messages?.map((message) => {
                  if (message.isYelpResponse) {
                    const payload = parseYelpContent(message.content);
                    return (
                      <div
                        key={message.id}
                        className="max-w-xl rounded-2xl rounded-bl-none bg-white px-4 py-4 text-sm shadow border border-orange-100"
                      >
                        <p className="text-xs uppercase tracking-wide text-orange-600 font-semibold">
                          @yelp
                        </p>
                        <p className="mt-2 text-gray-800 whitespace-pre-line">{payload.text}</p>
                        {payload.businesses?.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {payload.businesses.slice(0, 3).map((biz) => (
                              <div
                                key={biz.id || biz.name}
                                className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 text-sm"
                              >
                                <div className="flex justify-between">
                                  <p className="font-semibold text-gray-900">{biz.name}</p>
                                  {biz.rating && (
                                    <span className="text-xs text-gray-600">{biz.rating}★</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {[biz.price, (biz.categories || []).join(", ")]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                                {biz.address && (
                                  <p className="mt-1 text-xs text-gray-500">{biz.address}</p>
                                )}
                                {biz.url && (
                                  <a
                                    href={biz.url}
                                    target="_blank"
                                    className="mt-2 inline-flex text-xs font-semibold text-orange-600 hover:text-orange-700"
                                    rel="noreferrer"
                                  >
                                    View on Yelp →
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-[10px] text-gray-500">
                          @yelp · {formatTimeLabel(message.sentAt)}
                        </p>
                      </div>
                    );
                  }

                  return (
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
                  );
                })}
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

                      if (message.content.toLowerCase().includes("@yelp")) {
                        requestYelpResponse(activeGroup.id, message.content);
                      }
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
                  City / Zip
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. Tempe, AZ"
                  value={newGroupModal.location}
                  onChange={(e) =>
                    setNewGroupModal((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Required so @yelp knows where to search.
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
                disabled={
                  newGroupModal.isSubmitting ||
                  !newGroupModal.name.trim() ||
                  !newGroupModal.location.trim()
                }
                className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {newGroupModal.isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-gray-900">Add someone to this chat</h3>
              <p className="text-sm text-gray-500">
                Enter the email tied to their Cravemate account to drop them into the conversation.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email address
                </label>
                <input
                  type="email"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="teammate@email.com"
                  value={inviteModal.email}
                  onChange={(e) =>
                    setInviteModal((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              {inviteModal.error && (
                <p className="text-sm text-red-500">{inviteModal.error}</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeInviteModal}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                disabled={inviteModal.isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteModal.isSubmitting || !inviteModal.email.trim()}
                className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inviteModal.isSubmitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {locationModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-gray-900">Update group location</h3>
              <p className="text-sm text-gray-500">
                Set the city or ZIP that @yelp should use when searching for this group.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  City / Zip
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. Tempe, AZ"
                  value={locationModal.location}
                  onChange={(e) =>
                    setLocationModal((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </div>

              {locationModal.error && (
                <p className="text-sm text-red-500">{locationModal.error}</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeLocationModal}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                disabled={locationModal.isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleLocationSave}
                disabled={locationModal.isSubmitting || !locationModal.location.trim()}
                className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locationModal.isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
