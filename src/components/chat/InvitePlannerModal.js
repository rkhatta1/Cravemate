import React, { useId, useRef } from "react";
import { MapPin, CalendarDays, Clock3 } from "lucide-react";

const InvitePlannerModal = ({
  open,
  context,
  date,
  startTime,
  endTime,
  error,
  onFieldChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  if (!open) return null;

  const dateInputId = useId();
  const startTimeInputId = useId();
  const endTimeInputId = useId();
  const dateInputRef = useRef(null);
  const startTimeInputRef = useRef(null);
  const endTimeInputRef = useRef(null);

  const name = context?.business?.name || context?.entry?.businessName || "Restaurant";
  const address =
    context?.business?.address ||
    context?.entry?.neighborhood ||
    context?.entry?.meta?.address ||
    "Shared from chat";
  const image =
    context?.business?.image_url || context?.entry?.meta?.image || context?.business?.image;
  const cuisine =
    context?.business?.categories?.[0] ||
    context?.entry?.meta?.categories?.[0] ||
    context?.entry?.meta?.category ||
    null;

  const triggerPicker = (ref) => {
    const node = ref?.current;
    if (!node) return;
    if (typeof node.showPicker === "function") {
      node.showPicker();
    } else {
      node.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Plan invite
          </p>
          <h3 className="text-2xl font-bold text-gray-900">Lock in the details</h3>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[200px,1fr]">
          <div className="space-y-3 rounded-2xl border border-gray-100 bg-neutral-50/70 p-4">
            {image ? (
              <div className="h-40 w-full overflow-hidden rounded-2xl bg-gray-100">
                <img src={image} alt={name} className="h-full w-full object-cover" loading="lazy" />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500">
                No photo
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={12} />
                {address}
              </p>
              {cuisine && <p className="mt-1 text-xs text-gray-400">{cuisine}</p>}
            </div>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit?.();
            }}
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor={dateInputId}>
                Date
              </label>
              <div
                className="relative mt-2 cursor-text"
                onClick={() => triggerPicker(dateInputRef)}
              >
                <input
                  id={dateInputId}
                  ref={dateInputRef}
                  type="date"
                  value={date}
                  onChange={(event) => onFieldChange?.("date", event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/50 appearance-none"
                  style={{ WebkitAppearance: "none" }}
                />
                <CalendarDays
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor={startTimeInputId}>
                  Start time
                </label>
                <div
                  className="relative mt-2 cursor-text"
                  onClick={() => triggerPicker(startTimeInputRef)}
                >
                  <input
                    id={startTimeInputId}
                    ref={startTimeInputRef}
                    type="time"
                    value={startTime}
                    onChange={(event) => onFieldChange?.("startTime", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/50 appearance-none"
                    style={{ WebkitAppearance: "none" }}
                  />
                  <Clock3
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor={endTimeInputId}>
                  End time
                </label>
                <div
                  className="relative mt-2 cursor-text"
                  onClick={() => triggerPicker(endTimeInputRef)}
                >
                  <input
                    id={endTimeInputId}
                    ref={endTimeInputRef}
                    type="time"
                    value={endTime}
                    onChange={(event) => onFieldChange?.("endTime", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/50 appearance-none"
                    style={{ WebkitAppearance: "none" }}
                  />
                  <Clock3
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>
              </div>
            </div>
            {error && <p className="text-sm font-semibold text-yelp-red">{error}</p>}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InvitePlannerModal;
