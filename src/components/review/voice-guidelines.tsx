// Native <details>: collapsible without JavaScript, and keyboard accessible.
export function VoiceGuidelines({ brandName, guidelines }: { brandName: string; guidelines: string }) {
  return (
    <details open className="group rounded-box border border-base-300">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        {brandName} voice
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="size-3 opacity-60 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>
      <p className="max-h-64 overflow-y-auto whitespace-pre-line border-t border-base-300 px-4 py-3 leading-relaxed text-base-content/80">
        {guidelines}
      </p>
    </details>
  );
}
