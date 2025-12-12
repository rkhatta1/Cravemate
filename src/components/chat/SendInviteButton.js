import React from "react";

const SIZE_MAP = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

const SendInviteButton = ({ onClick, size = "md", className = "", disabled }) => {
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const isDisabled = disabled || typeof onClick !== "function";

  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center rounded-2xl border border-gray-200 font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-yelp-red/5 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${className}`}
    >
      Send Invite
    </button>
  );
};

export default SendInviteButton;
