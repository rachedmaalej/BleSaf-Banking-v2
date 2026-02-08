import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface KpiTooltipProps {
  tooltipKey: string;
  children: React.ReactNode;
}

export function KpiTooltip({ tooltipKey, children }: KpiTooltipProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; arrowLeft: number; below: boolean } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const text = t(`dashboard.tooltips.${tooltipKey}`);

  const TOOLTIP_W = 256; // w-64 = 16rem = 256px
  const TOOLTIP_H_EST = 80; // estimated tooltip height
  const MARGIN = 12; // gap from viewport edge
  const GAP = 8; // gap between trigger and tooltip

  const reposition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    // Horizontal: clamp so tooltip stays within viewport
    let left = centerX - TOOLTIP_W / 2;
    if (left < MARGIN) left = MARGIN;
    if (left + TOOLTIP_W > window.innerWidth - MARGIN) left = window.innerWidth - MARGIN - TOOLTIP_W;

    // Arrow points to the center of the trigger
    const arrowLeft = Math.max(16, Math.min(TOOLTIP_W - 16, centerX - left));

    // Vertical: prefer above, flip below if not enough room
    const spaceAbove = rect.top;
    const below = spaceAbove < TOOLTIP_H_EST + GAP;
    const top = below ? rect.bottom + GAP : rect.top - GAP;

    setPos({ top, left, arrowLeft, below });
  }, []);

  useEffect(() => {
    if (!show) { setPos(null); return; }
    reposition();
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
          containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, reposition]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-1 group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
        aria-label={text}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
      </button>

      {show && pos && (
        <div
          ref={tooltipRef}
          className="fixed p-3 text-sm text-gray-700 bg-white rounded-lg border border-gray-200 pointer-events-none"
          style={{
            zIndex: 9999,
            width: TOOLTIP_W,
            top: pos.top,
            left: pos.left,
            transform: pos.below ? undefined : 'translateY(-100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          }}
          role="tooltip"
        >
          <div className="text-xs leading-relaxed">{text}</div>
          {/* Arrow: below trigger = arrow on top pointing up, above trigger = arrow on bottom pointing down */}
          {pos.below ? (
            <div
              className="absolute bottom-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white"
              style={{ left: pos.arrowLeft - 6 }}
            />
          ) : (
            <div
              className="absolute top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"
              style={{ left: pos.arrowLeft - 6 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
