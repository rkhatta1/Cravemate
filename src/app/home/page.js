"use client";

import { useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";

const MOCK_GROUPS = [
  {
    id: "team-brunch",
    name: "Team Brunch Squad",
    lastMessage: "Jess: @yelp find us empanadas in SoMa!",
    updatedAt: "2m ago",
    participants: ["Jess", "Amir", "Luis", "@yelp"],
  },
  {
    id: "roomies",
    name: "Roomies",
    lastMessage: "Mia: let’s go spicy tonight 🔥",
    updatedAt: "1h ago",
    participants: ["Mia", "Robin", "@yelp"],
  },
];

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

const EmptyState = ({ onCreate }) => (
  <div className="flex h-full items-center justify-center">
    <div className="text-center space-y-4">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500 text-2xl">
        💬
      </div>
      <div className="space-y-1">
        <p className="text-xl font-semibold text-gray-800">Spin up your first group chat</p>
        <p className="text-gray-500">
          Add friends, toss @yelp into the mix, and let AI keep dinner plans moving.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
      >
        Start a chat
      </button>
    </div>
  </div>
);

export default function HomePage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState(MOCK_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState(MOCK_GROUPS[0]?.id || "");

  const hasGroups = groups.length > 0;
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  if (status === "loading") {
    return <div className="p-10">Loading session...</div>;
  }

  const handleCreateChat = () => {
    const newGroup = {
      id: `chat-${Date.now()}`,
      name: "New Group",
      lastMessage: "Set the vibe and say hi 👋",
      updatedAt: "Just now",
      participants: [session?.user?.name || "You", "@yelp"],
    };
    setGroups([newGroup, ...groups]);
    setActiveGroupId(newGroup.id);
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
                    <span className="text-xs text-gray-400">{group.updatedAt}</span>
                  </div>
                  <p className="text-xs text-gray-500">{group.participants.join(", ")}</p>
                  <p className="line-clamp-1 text-sm text-gray-600">{group.lastMessage}</p>
                </button>
              );
            })}

            {!groups.length && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No chats yet—tap “New” to start one.
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 bg-[url('/whatsapp-bg.png')] bg-cover bg-center">
          {!hasGroups && <EmptyState onCreate={handleCreateChat} />}
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
                <div className="ml-auto max-w-xs rounded-2xl rounded-br-none bg-black px-4 py-3 text-sm text-white shadow">
                  Hey @yelp, find a vibey patio in Hayes Valley for four tonight.
                  <p className="mt-1 text-right text-[10px] text-gray-300">You · 4:12 PM</p>
                </div>

                <div className="max-w-md rounded-2xl rounded-bl-none bg-white px-4 py-3 text-sm shadow">
                  <p className="font-semibold text-gray-900">@yelp</p>
                  <p className="text-gray-700">
                    How about{" "}
                    <span className="font-semibold text-orange-600">“Wildflower & Co.”</span>? Cozy
                    patio, Mediterranean share plates, and they’re open till 11.
                  </p>
                  <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-xs text-gray-600">
                    <p>Highlights</p>
                    <ul className="list-disc pl-4">
                      <li>House citrus spritz pitchers</li>
                      <li>Plenty of vegetarian options</li>
                      <li>Live DJ on Thursdays</li>
                    </ul>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">@yelp · 4:12 PM</p>
                </div>
              </div>

              <form className="flex items-center gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <input
                  type="text"
                  placeholder='Message... tip: prefix with "@yelp" to ask for help'
                  className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
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
