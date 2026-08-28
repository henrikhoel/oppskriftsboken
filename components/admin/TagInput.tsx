"use client";

import { useState, type KeyboardEvent } from "react";
import { XIcon } from "@/components/ui/icons";

export function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const trimmed = draft.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line-strong bg-paper px-3 py-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-cream-dark px-2.5 py-1 text-xs text-ink"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Fjern tag ${tag}`}
              className="text-ink-faint hover:text-clay-dark"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={tags.length === 0 ? "Legg til tags, trykk Enter" : "Legg til flere …"}
          aria-label="Legg til tag"
          // text-base på mobil (unngår iOS-innzooming ved fokus).
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
        />
      </div>
    </div>
  );
}
