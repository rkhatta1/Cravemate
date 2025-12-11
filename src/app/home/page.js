"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { useRouter } from "next/navigation";
import { getMessagePreview } from "@/lib/message-utils";
import { PlusCircle, Send, MapPin, PanelLeft, Loader2 } from "lucide-react";
import EmptyState from "@/components/chat/EmptyState";
import EmptyConversation from "@/components/chat/EmptyConversation";
import Sidebar from "@/components/chat/Sidebar";
import ChatMessages from "@/components/chat/ChatMessages";
import { useLocationAutocomplete } from "@/hooks/useLocationAutocomplete";

const GROUPS_CACHE_KEY = "cravemate-groups-cache";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [revalidating, setRevalidating] = useState(true);
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    if (typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem(GROUPS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setGroups(parsed);
          setActiveGroupId(parsed[0]?.id || "");
          setIsLoadingGroups(false);
        }
      }
    } catch (err) {
      console.warn("Failed to read group cache", err);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let isCancelled = false;

    async function loadGroups() {
      setIsLoadingGroups((prev) => (!groups.length ? true : prev));
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
          try {
            localStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(payload.groups || []));
          } catch (err) {
            console.warn("Failed to cache groups", err);
          }
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(groups));
    } catch (err) {
      console.warn("Failed to cache groups", err);
    }
  }, [groups]);

  const hasGroups = groups.length > 0;
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [groups, activeGroupId]
  );
  const activeParticipants = Array.isArray(activeGroup?.participants)
    ? activeGroup.participants
    : [];
  const activeMessages = activeGroup?.messages || [];
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
  const [createLocationFocused, setCreateLocationFocused] = useState(false);
  const [editLocationFocused, setEditLocationFocused] = useState(false);
  const createLocationRef = useRef(null);
  const editLocationRef = useRef(null);
  const {
    suggestions: createLocationSuggestions,
    loading: createLocationLoading,
    clearSuggestions: clearCreateLocationSuggestions,
  } = useLocationAutocomplete(newGroupModal.location, { active: createLocationFocused });
  const {
    suggestions: editLocationSuggestions,
    loading: editLocationLoading,
    clearSuggestions: clearEditLocationSuggestions,
  } = useLocationAutocomplete(locationModal.location, { active: editLocationFocused });

  useEffect(() => {
    const handleClick = (event) => {
      if (createLocationRef.current && !createLocationRef.current.contains(event.target)) {
        clearCreateLocationSuggestions();
        setCreateLocationFocused(false);
      }
      if (editLocationRef.current && !editLocationRef.current.contains(event.target)) {
        clearEditLocationSuggestions();
        setEditLocationFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [clearCreateLocationSuggestions, clearEditLocationSuggestions]);

  useEffect(() => {
    const defaultLocation = session?.user?.location;
    if (!defaultLocation) return;
    setNewGroupModal((prev) => (prev.location ? prev : { ...prev, location: defaultLocation }));
    setLocationModal((prev) => (prev.location ? prev : { ...prev, location: defaultLocation }));
  }, [session]);

  if (status === "loading" || revalidating) {
    return <div className="p-10">Loading session...</div>;
  }

  const openCreateModal = () =>
    setNewGroupModal({
      open: true,
      name: "",
      location: newGroupModal.location || session?.user?.location || "",
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

  const formatLocation = (suggestion) => {
    if (!suggestion) return "";
    const region = suggestion?.context?.region?.name;
    const city = suggestion.name || suggestion.full || "";
    return region ? `${city}, ${region}` : city;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={setActiveGroupId}
        onCreateGroup={openCreateModal}
        sessionName={session?.user?.name}
        onSignOut={() => signOut({ callbackUrl: "/" })}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentView="chat"
        onNavigate={(view) => router.push(view === "leaderboard" ? "/leaderboard" : "/home")}
      />

      <main className="relative flex flex-1 flex-col bg-neutral-50">
        {!hasGroups && (
          <EmptyState
            onCreate={openCreateModal}
            isLoading={isLoadingGroups}
            error={loadError}
            showSidebarToggle={!sidebarOpen}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {hasGroups && !activeGroup && <EmptyConversation />}
        {hasGroups && activeGroup && (
          <>
            <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className={`-ml-2 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 ${
                    sidebarOpen ? "md:opacity-0 md:pointer-events-none" : ""
                  }`}
                >
                  <PanelLeft size={20} />
                </button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 font-bold text-gray-900">
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400">#</span>
                      {activeGroup.name}
                    </span>
                    {activeGroup.locationContext && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yelp-red/10 px-2 py-1 text-[11px] font-semibold text-yelp-red">
                        <MapPin size={12} />
                        {activeGroup.locationContext}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{activeParticipants.length} members · includes @yelp</span>
                    {!activeGroup.locationContext && (
                      <button
                        type="button"
                        onClick={openLocationModal}
                        className="font-semibold text-yelp-red hover:text-yelp-dark"
                      >
                        Set location
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={openInviteModal}
                  className="rounded-full border border-transparent bg-neutral-100 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-200 hover:bg-neutral-200"
                >
                  Add friends
                </button>
                <button
                  onClick={openLocationModal}
                  className="rounded-full bg-black px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                >
                  Location
                </button>
              </div>
            </div>

            <ChatMessages messages={activeMessages} />

            <form
              className="border-t border-gray-100 bg-white p-4"
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
              <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-xl border border-gray-200 bg-neutral-50 px-2 py-2 shadow-sm transition-all focus-within:border-neutral-300 focus-within:ring-2 focus-within:ring-neutral-100">
                <button
                  type="button"
                  className="shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                >
                  <PlusCircle size={20} />
                </button>
                <input
                  type="text"
                  placeholder='Message... tip: prefix with "@yelp" to ask for help'
                  className="w-full border-0 bg-transparent p-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-0"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <div className="flex items-center gap-1 pb-1">
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className={`rounded-lg p-2 transition-all ${
                      messageInput.trim()
                        ? "bg-yelp-red text-white shadow-md hover:bg-yelp-dark"
                        : "bg-transparent text-gray-300"
                    }`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-gray-400">
                Tip: type <span className="rounded bg-yelp-red/10 px-1 font-mono text-yelp-red">@yelp</span>{" "}
                to pull Yelp AI into the chat
              </p>
            </form>
          </>
        )}
      </main>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/60"
                  placeholder="e.g. Sunday brunch crew"
                  value={newGroupModal.name}
                  onChange={(e) =>
                    setNewGroupModal((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div ref={createLocationRef}>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  City / Zip
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/60"
                    placeholder="e.g. Tempe, AZ"
                    value={newGroupModal.location}
                    onFocus={() => setCreateLocationFocused(true)}
                    onChange={(e) =>
                      setNewGroupModal((prev) => ({ ...prev, location: e.target.value }))
                    }
                  />
                  {createLocationLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                  )}
                  {createLocationSuggestions.length > 0 && (
                    <div className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                      {createLocationSuggestions.map((suggestion) => (
                        <button
                          type="button"
                          key={suggestion.id}
                          onClick={() => {
                            setNewGroupModal((prev) => ({
                              ...prev,
                              location: formatLocation(suggestion),
                            }));
                            clearCreateLocationSuggestions();
                            setCreateLocationFocused(false);
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left transition hover:bg-gray-50"
                        >
                          <span className="text-sm font-semibold text-gray-900">
                            {suggestion.name}
                          </span>
                          {suggestion.full && suggestion.full !== suggestion.name && (
                            <span className="text-xs text-gray-500">{suggestion.full}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/60"
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
              <div ref={editLocationRef}>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  City / Zip
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/60"
                    placeholder="e.g. Tempe, AZ"
                    value={locationModal.location}
                    onFocus={() => setEditLocationFocused(true)}
                    onChange={(e) =>
                      setLocationModal((prev) => ({ ...prev, location: e.target.value }))
                    }
                  />
                  {editLocationLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                  )}
                  {editLocationSuggestions.length > 0 && (
                    <div className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                      {editLocationSuggestions.map((suggestion) => (
                        <button
                          type="button"
                          key={suggestion.id}
                          onClick={() => {
                            setLocationModal((prev) => ({
                              ...prev,
                              location: formatLocation(suggestion),
                            }));
                            clearEditLocationSuggestions();
                            setEditLocationFocused(false);
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left transition hover:bg-gray-50"
                        >
                          <span className="text-sm font-semibold text-gray-900">
                            {suggestion.name}
                          </span>
                          {suggestion.full && suggestion.full !== suggestion.name && (
                            <span className="text-xs text-gray-500">{suggestion.full}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
