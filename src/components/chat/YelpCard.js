import React from "react";

const YelpCard = ({ business }) => {
  if (!business) return null;
  const categories = Array.isArray(business.categories) ? business.categories : [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <div className="flex justify-between gap-2">
        <p className="font-semibold text-neutral-900">{business.name}</p>
        {business.rating && (
          <span className="text-xs text-neutral-600">{business.rating}★</span>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        {[business.price, categories.join(", ")].filter(Boolean).join(" • ")}
      </p>
      {business.address && (
        <p className="mt-1 text-xs text-neutral-500">{business.address}</p>
      )}
      {business.url && (
        <a
          href={business.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex text-xs font-semibold text-yelp-red hover:text-yelp-dark"
        >
          View on Yelp →
        </a>
      )}
    </div>
  );
};

export default YelpCard;
