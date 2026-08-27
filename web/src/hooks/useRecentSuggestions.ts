"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "travel-expense-recent-v1";
const LIMIT = 8;

type RecentSuggestions = {
  schools: string[];
  places: string[];
};

const emptySuggestions: RecentSuggestions = { schools: [], places: [] };

function cleanList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean),
  )].slice(0, LIMIT);
}

export function useRecentSuggestions() {
  const [recent, setRecent] = useState<RecentSuggestions>(emptySuggestions);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
        setRecent({
          schools: cleanList(parsed.schools),
          places: cleanList(parsed.places),
        });
      } catch {
        setRecent(emptySuggestions);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const remember = useCallback((school: string, places: string[]) => {
    setRecent((current) => {
      const next = {
        schools: cleanList([school, ...current.schools]),
        places: cleanList([...places, ...current.places]),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecent(emptySuggestions);
  }, []);

  return { recent, remember, clear };
}
