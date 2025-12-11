"use client";

import { useEffect, useRef, useState } from "react";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

export function useLocationAutocomplete(query, options = {}) {
  const { active = true, minLength = MIN_QUERY_LENGTH } = options;
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef();
  const timerRef = useRef();
  const sessionTokenRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = query?.trim() || "";
    if (!active || !trimmed || trimmed.length < minLength) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        setError(null);

        const url = `/api/mapbox/suggest?q=${encodeURIComponent(
          trimmed
        )}&session_token=${encodeURIComponent(sessionTokenRef.current)}`;

        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error("Unable to fetch locations");
        }

        const payload = await response.json();
        setSuggestions(payload?.suggestions || []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to load suggestions");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, loading, error, clearSuggestions };
}
