import React from "react";
import { Trophy, ArrowRight } from "lucide-react";

const formatVotes = (value) => {
  if (!value && value !== 0) return "";
  return Number(value).toLocaleString();
};

const rankIcon = (rank) =>
  rank === 1 ? <Trophy size={14} className="text-amber-400 mx-auto" /> : rank;

const LeaderboardCard = ({ board, onSelect }) => {
  const entries = Array.isArray(board.entries) ? board.entries : [];
  const topEntries = [...entries].sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000)).slice(0, 5);
  const updatedLabel = board.updatedAt
    ? new Date(board.updatedAt).toLocaleString()
    : "Recently updated";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
            {board.icon || "🍽️"}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm md:text-base">
              {board.title || `${board.dish} · ${board.location}`}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{updatedLabel}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onSelect?.(board)}
          className="text-xs font-semibold text-yelp-red hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors border border-transparent hover:border-red-100"
        >
          Play Game
        </button>
      </div>

      <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-gray-50/50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
        <div className="col-span-1 text-center">Rank</div>
        <div className="col-span-7">Place</div>
        <div className="col-span-2 text-right">Elo</div>
        <div className="col-span-2 text-right">Votes</div>
      </div>

      <div className="flex-1">
        {topEntries.map((item, rowIdx) => (
          <div
            key={item.id || rowIdx}
            className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors text-sm items-center"
          >
            <div className="col-span-1 text-center font-medium text-gray-400">
              {rankIcon(rowIdx + 1)}
            </div>
            <div className="col-span-7 font-medium text-gray-900 truncate pr-2 flex items-center gap-2">
              {item.businessName || item.name}
            </div>
            <div className="col-span-2 text-right font-mono text-gray-600">
              {item.elo ?? 1000}
            </div>
            <div className="col-span-2 text-right font-mono text-gray-400 text-xs">
              {formatVotes(item.meta?.reviewCount)}
            </div>
          </div>
        ))}
        {!topEntries.length && (
          <div className="px-5 py-4 text-sm text-gray-400">No entries yet.</div>
        )}
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
        <button
          onClick={() => onSelect?.(board)}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center justify-center gap-1 mx-auto transition-colors"
        >
          View full leaderboard <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default LeaderboardCard;
