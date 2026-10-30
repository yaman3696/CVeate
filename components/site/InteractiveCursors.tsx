"use client";
export default function InteractiveCursors() {
  return (
    <style jsx global>{`
      /* Shared affordance for enabled clickable controls, including new feature screens. */
      button:not(:disabled):not([aria-disabled="true"]),
      a[href]:not([aria-disabled="true"]),
      [role="button"]:not([aria-disabled="true"]),
      summary,
      input[type="submit"]:not(:disabled),
      input[type="button"]:not(:disabled),
      input[type="checkbox"]:not(:disabled),
      input[type="radio"]:not(:disabled),
      select:not(:disabled) {
        cursor: pointer;
      }
      button:disabled,
      input:disabled,
      select:disabled,
      textarea:disabled,
      [aria-disabled="true"] {
        cursor: not-allowed;
      }
    `}</style>
  );
}
