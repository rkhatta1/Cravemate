import React, { useId, useState } from "react";
import { ChevronDownIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const InvitePlannerModal = ({
  open,
  context,
  date,
  time,
  error,
  onFieldChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  if (!open) return null;

  const dateInputId = useId();
  const timeInputId = useId();
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Plan invite
          </p>
          <h3 className="text-2xl font-bold text-gray-900">Lock in the details</h3>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="space-y-3 rounded-2xl border col-span-2 border-gray-100 bg-neutral-50/70 p-4">
            {image ? (
              <div className="h-72 w-full overflow-hidden rounded-2xl bg-gray-100">
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
            className="flex flex-col justify-between"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit?.();
            }}
          >
            <div className="flex flex-col">
              <div className="flex flex-col gap-5 sm:flex-col">
                <div className="flex flex-col gap-2 w-full">
                  <Label
                    htmlFor={dateInputId}
                    className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Date
                  </Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id={dateInputId}
                        className="h-12 w-full justify-between rounded-2xl border-gray-200 px-4 font-normal text-gray-700"
                      >
                        {date ? date.toLocaleDateString() : "Select date"}
                        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 overflow-hidden p-0" align="start">
                      <Calendar
                        className={"w-full"}
                        mode="single"
                        selected={date || undefined}
                        captionLayout="dropdown"
                        onSelect={(nextDate) => {
                          onFieldChange?.("date", nextDate || null);
                          setCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-full flex flex-1 flex-col gap-2">
                  <Label
                    htmlFor={timeInputId}
                    className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Time
                  </Label>
                  <Input
                    type="time"
                    step="60"
                    id={timeInputId}
                    value={time || ""}
                    onChange={(event) => onFieldChange?.("time", event.target.value)}
                    className="h-12 rounded-2xl border-gray-200 px-4 py-3 text-sm focus:border-yelp-red focus:ring-1 focus:ring-yelp-red/50 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                  {error && <p className="text-sm mt-2 font-semibold text-yelp-red">{error}</p>}
                </div>
              </div>
            </div>
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
