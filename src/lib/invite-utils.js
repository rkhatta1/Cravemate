export const normalizeInviteRestaurant = (context = {}) => {
  const business = context.business;
  const entry = context.entry;

  const parseCategories = () => {
    if (Array.isArray(business?.categories)) {
      return business.categories
        .map((category) => {
          if (!category) return "";
          if (typeof category === "string") return category;
          return category.title || category.alias || category.name || "";
        })
        .filter(Boolean);
    }
    if (Array.isArray(entry?.meta?.categories)) return entry.meta.categories;
    if (entry?.meta?.category) return [entry.meta.category];
    return [];
  };

  return {
    name: business?.name || entry?.businessName || "Restaurant",
    address: business?.address || entry?.meta?.address || entry?.neighborhood || "",
    neighborhood: entry?.neighborhood || "",
    blurb: entry?.blurb || "",
    image: business?.image_url || entry?.meta?.image || "",
    url: business?.url || entry?.meta?.url || "",
    price: business?.price || entry?.meta?.price || "",
    rating: business?.rating || entry?.meta?.rating || "",
    reviewCount: business?.review_count || entry?.meta?.reviewCount || "",
    categories: parseCategories(),
    entryId: entry?.id || null,
    leaderboardId: entry?.leaderboardId || null,
    businessId: business?.id || null,
    source: context?.source || null,
  };
};

const serializeEventMeta = (event) => {
  if (!event) return null;
  return {
    id: event.id || null,
    htmlLink: event.htmlLink || null,
    hangoutLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || null,
    conferenceData: event.conferenceData
      ? {
          entryPoints: event.conferenceData.entryPoints || [],
          conferenceId: event.conferenceData.conferenceId || null,
        }
      : null,
  };
};

export const buildInviteMessageContent = (context, schedule, event) =>
  JSON.stringify({
    type: "dining-invite",
    restaurant: normalizeInviteRestaurant(context),
    schedule,
    event: serializeEventMeta(event),
    source: context?.source || "chat",
    context: {
      messageId: context?.messageId || null,
      entryId: context?.entry?.id || null,
      businessId: context?.business?.id || null,
    },
  });
