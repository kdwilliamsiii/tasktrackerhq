"use client";

import { useFloatingPosition } from "./useFloatingPosition";

export default function FloatingSuggestButton({ onClick }: { onClick: () => void }) {
  const floating = useFloatingPosition("tasktracker-suggestion-position", { right: 24, bottom: 24 });
  return (
    <button
      className="floating-button"
      style={{ right: floating.position.right, bottom: floating.position.bottom, cursor: floating.dragging ? "grabbing" : "grab" }}
      onClick={(event) => { if (!floating.consumeDragged()) onClick(); event.stopPropagation(); }}
      onPointerDown={floating.onPointerDown}
      onPointerMove={floating.onPointerMove}
      onPointerUp={floating.onPointerUp}
      aria-label="Suggest a Feature"
      type="button"
    >
      <span aria-hidden="true">💡</span>
    </button>
  );
}
