import { useEffect, useMemo, useState } from "react";
import { MapPin, Sparkles, UtensilsCrossed, X } from "lucide-react";

const PillList = ({ label, items, emptyText }) => (
  <div className="space-y-1.5">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    {items?.length ? (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
          >
            {item}
          </span>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500">{emptyText}</p>
    )}
  </div>
);

const VibeCard = ({ vibe }) => (
  <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-900">
    <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
      <Sparkles size={14} />
      Vibe report
    </div>
    <p className="leading-relaxed">
      {vibe || "No vibe saved yet. Finish onboarding to see their vibe."}
    </p>
  </div>
);

const MemberList = ({ members, selectedId, onSelect }) => {
  if (!members.length) {
    return <p className="text-sm text-gray-500">No members yet.</p>;
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isActive = member.id === selectedId;
        return (
          <button
            key={member.id || member.email}
            onClick={() => onSelect(member.id)}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
              isActive
                ? "border-yelp-red/40 bg-yelp-red/5 text-gray-900 shadow-sm"
                : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-700">
                {(member.name || member.username || "M")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{member.name || "Friend"}</p>
                <p className="truncate text-xs text-gray-500">
                  {member.username ? `@${member.username}` : member.email || "Member"}
                </p>
              </div>
            </div>
            {isActive && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-yelp-red">
                viewing
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

const MemberDetails = ({ member, fallbackLocation }) => {
  if (!member) {
    return <p className="text-sm text-gray-500">Pick a member to view their details.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-lg font-semibold text-gray-900">{member.name || "Friend"}</p>
          {member.username && <p className="text-sm text-gray-500">@{member.username}</p>}
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          <MapPin size={14} className="text-gray-500" />
          {member.location || fallbackLocation || "No city set"}
        </div>
      </div>

      <PillList
        label="Dietary preferences"
        items={member.dietaryPrefs}
        emptyText="No dietary notes saved."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PillList
          label="Favorite cuisines"
          items={member.favoriteCuisines}
          emptyText="No cuisines added yet."
        />
        <PillList
          label="Favorite foods"
          items={member.favoriteFoods}
          emptyText="No favorite foods listed."
        />
      </div>

      <VibeCard vibe={member.vibeSummary || member.vibeReport} />
    </div>
  );
};

const GroupProfileModal = ({ open, onClose, group }) => {
  const members = Array.isArray(group?.memberDetails) ? group.memberDetails : [];
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || "");

  useEffect(() => {
    if (!open) return;
    setSelectedMemberId(members[0]?.id || "");
  }, [open, group?.id, members]);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) || members[0] || null,
    [members, selectedMemberId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Group profile
            </p>
            <h3 className="text-2xl font-bold text-gray-900">{group?.name || "Group"}</h3>
            {group?.locationContext && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-yelp-red/10 px-3 py-1 text-xs font-semibold text-yelp-red">
                <MapPin size={14} />
                {group.locationContext}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <UtensilsCrossed size={14} />
              Members
            </div>
            <MemberList members={members} selectedId={selectedMemberId} onSelect={setSelectedMemberId} />
          </div>

          <div className="md:col-span-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <MemberDetails member={selectedMember} fallbackLocation={group?.locationContext} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupProfileModal;
