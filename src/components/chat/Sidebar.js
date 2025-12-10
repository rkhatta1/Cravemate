import React from "react";
import {
  Plus,
  Hash,
  LogOut,
  Settings,
  Pizza,
  Wine,
  Coffee,
  PanelLeftClose,
  Trophy,
  MessageCircle,
} from "lucide-react";
import { CravemateLogo } from "@/components/landing/Icons";

const Sidebar = ({
  groups = [],
  activeGroupId,
  onSelectGroup,
  onCreateGroup,
  sessionName,
  onSignOut,
  isOpen,
  onClose,
  currentView,
  onNavigate,
}) => {
  const getIcon = (type) => {
    switch (type) {
      case "dining":
        return <Pizza size={18} />;
      case "drinks":
        return <Wine size={18} />;
      case "coffee":
        return <Coffee size={18} />;
      default:
        return <Hash size={18} />;
    }
  };

  return (
    <aside
      className={`absolute z-30 flex h-full flex-col border-r border-gray-200 bg-neutral-50 transition-all duration-300 ease-in-out md:relative ${
        isOpen ? "w-80 translate-x-0" : "w-0 -translate-x-full overflow-hidden opacity-0"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-neutral-50/70 px-4 backdrop-blur-sm">
        <div className="origin-left scale-75">
          <CravemateLogo />
        </div>
        <button
          onClick={onClose}
          className="hidden rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-200 md:block"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {currentView && onNavigate && (
        <div className="px-3 py-3 space-y-1 border-b border-gray-100">
          <button
            onClick={() => onNavigate("chat")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === "chat"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <MessageCircle size={18} className={currentView === "chat" ? "text-yelp-red" : "text-gray-400"} />
            Chat Groups
          </button>
          <button
            onClick={() => onNavigate("leaderboard")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === "leaderboard"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Trophy size={18} className={currentView === "leaderboard" ? "text-yelp-red" : "text-gray-400"} />
            Leaderboards
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 mt-2">
          <span>Your Groups</span>
          <button
            onClick={onCreateGroup}
            className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-200"
            title="Start a chat"
          >
            <Plus size={14} />
          </button>
        </div>

        {groups.map((group) => {
          const isActive = group.id === activeGroupId;
          const members = Array.isArray(group.participants) ? group.participants : [];
          return (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-white text-neutral-900 shadow-sm ring-1 ring-gray-200"
                  : "text-neutral-600 hover:bg-gray-100 hover:text-neutral-900"
              }`}
            >
              <span
                className={`text-gray-400 group-hover:text-gray-500 ${isActive ? "text-yelp-red" : ""}`}
              >
                {getIcon(group.type)}
              </span>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{group.name}</span>
                  <span className="text-[10px] font-medium text-gray-400">
                    {group.updatedAt
                      ? new Date(group.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">{members.join(", ") || "No members yet"}</p>
              </div>
              {isActive && <div className="h-1.5 w-1.5 rounded-full bg-yelp-red" />}
            </button>
          );
        })}

        {!groups.length && (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            No chats yet—tap the + to start one.
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-neutral-100/50 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yelp-red to-yelp-dark text-xs font-bold text-white">
            {(sessionName || "You").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-neutral-900">{sessionName || "Signed in"}</div>
            <div className="text-xs text-neutral-500">Cravemate member</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onSignOut}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-yelp-red"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
            <button
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
