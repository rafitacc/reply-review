"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";

import type { IssueType } from "@/lib/data/reviews";
import { saveReview } from "@/lib/reviews/actions";
import type { QueueFilters } from "@/lib/reviews/filters";
import { COMMENT_MAX_LENGTH } from "@/lib/reviews/limits";

type Props = {
  replyId: string;
  issueTypes: readonly IssueType[];
  initial: { score: number; issueTypeIds: number[]; comment: string | null } | null;
  filters: QueueFilters;
};

type Intent = "save" | "next";

const SCORES = [1, 2, 3, 4, 5] as const;

export function ReviewForm({ replyId, issueTypes, initial, filters }: Props) {
  const [score, setScore] = useState<number | null>(initial?.score ?? null);
  const [tags, setTags] = useState<number[]>(initial?.issueTypeIds ?? []);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"new" | "edited" | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = initial !== null;
  const modKey = useModifierKeyLabel();

  function submit(intent: Intent) {
    if (pending) return;
    if (score === null) {
      setError("Pick a score from 1 to 5 before saving.");
      return;
    }
    setError(null);
    startTransition(async () => {
      // On success with intent "next" the action redirects and this never
      // resolves here. On failure nothing is reset, so no typing is lost.
      const result = await saveReview({ replyId, score, issueTypeIds: tags, comment, intent, filters });
      if (result.ok) setSaved(isEdit ? "edited" : "new");
      else setError(result.error);
    });
  }

  // Keyboard: 1–5 score, Cmd/Ctrl+Enter saves, Shift+Cmd/Ctrl+Enter saves and
  // moves on. Number keys are ignored while typing in a text field.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        submitRef.current(event.shiftKey ? "next" : "save");
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const value = Number(event.key);
      if (Number.isInteger(value) && value >= 1 && value <= 5) {
        event.preventDefault();
        setScore(value);
        setSaved(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleTag(id: number) {
    setTags((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));
    setSaved(null);
  }

  const tooLong = comment.trim().length > COMMENT_MAX_LENGTH;

  return (
    <form
      aria-label="Review"
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        submit(submitter?.getAttribute("value") === "next" ? "next" : "save");
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex w-full items-baseline justify-between font-medium">
          Score
          <span className="font-mono text-xs font-normal text-base-content/60">keys 1–5</span>
        </legend>
        <div role="radiogroup" aria-label="Score" className="grid grid-cols-5 gap-1.5">
          {SCORES.map((value) => {
            const selected = score === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setScore(value);
                  setSaved(null);
                }}
                className={`h-10 rounded-field border font-mono text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  selected
                    ? "border-primary bg-primary text-primary-content"
                    : "border-base-300 hover:border-base-content/30 hover:bg-base-200"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-base-content/60">
          <span>Would not send</span>
          <span>Exactly right</span>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">What went wrong</legend>
        <div className="flex flex-wrap gap-1.5">
          {issueTypes.map((issue) => {
            const selected = tags.includes(issue.id);
            return (
              <button
                key={issue.id}
                type="button"
                aria-pressed={selected}
                aria-label={issue.label}
                title={issue.description ?? undefined}
                onClick={() => toggleTag(issue.id)}
                className={`h-7 rounded-full border px-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-base-300 text-base-content/80 hover:border-base-content/30"
                }`}
              >
                {issue.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between">
          <span className="font-medium">Comment</span>
          <span className={`font-mono text-xs ${tooLong ? "text-error" : "text-base-content/60"}`}>
            {comment.trim().length}/{COMMENT_MAX_LENGTH}
          </span>
        </span>
        <textarea
          name="comment"
          rows={5}
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
            setSaved(null);
          }}
          placeholder="What should they do differently next time?"
          aria-invalid={tooLong || undefined}
          className="textarea w-full resize-y text-sm leading-relaxed"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-field border border-error/40 px-3 py-2 text-error">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button type="submit" value="save" disabled={pending || tooLong} className="btn btn-sm flex-1 font-normal">
            {isEdit ? "Save changes" : "Save"}
            <kbd className="font-mono text-xs text-base-content/60">{modKey}↵</kbd>
          </button>
          <button type="submit" value="next" disabled={pending || tooLong} className="btn btn-primary btn-sm flex-1">
            Save and next
            <kbd className="font-mono text-xs opacity-70">⇧{modKey}↵</kbd>
          </button>
        </div>
        <p aria-live="polite" className="h-4 text-xs text-base-content/60">
          {pending ? "Saving…" : saved === "new" ? "Review saved." : saved === "edited" ? "Changes saved." : ""}
        </p>
      </div>
    </form>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit"].includes(target.type);
}

// "⌘" on Apple platforms, "Ctrl" elsewhere. The server does not know, so it
// renders "Ctrl" and the browser corrects it after hydration.
function useModifierKeyLabel(): string {
  return useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}
