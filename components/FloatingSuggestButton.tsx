"use client";

export default function FloatingSuggestButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="floating-button"
      onClick={onClick}
      aria-label="Suggest a Feature"
      type="button"
    >
      💡
    </button>
  );
}
