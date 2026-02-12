"use client";

type GridToggleProps = {
  enabled: boolean;
  onToggle?: (enabled: boolean) => void;
};

export function GridToggle(props: GridToggleProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    props.onToggle?.(!props.enabled);
  };

  return (
    <div className="flex items-center gap-1.5 select-none" onClick={handleClick}>
      <button
        type="button"
        role="checkbox"
        aria-checked={props.enabled}
        className={`
          size-3.5 rounded-[3px] border border-white/20 transition-colors
          flex items-center justify-center
          ${props.enabled ? "bg-white/20" : "bg-transparent"}
          hover:bg-white/10
          cursor-pointer
        `}
      >
        {props.enabled && (
          <svg
            className="size-2.5 text-white"
            viewBox="0 0 8 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.5 4L3 5.5L6.5 2"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <span className="text-[10px] text-white/50 cursor-pointer">snap</span>
    </div>
  );
}
