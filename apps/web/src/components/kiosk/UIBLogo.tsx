/**
 * CSS-only UIB logo component for kiosk/display screens.
 * Top half: UIB Red (#CF3339), bottom half: Black, centered white bar.
 */
export default function UIBLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      className="relative rounded-sm overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Top half - UIB Red */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-uib-red" />
      {/* Bottom half - Black */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-black" />
      {/* Centered white bar */}
      <div
        className="absolute bg-white"
        style={{
          top: '44%',
          height: '12%',
          left: '18%',
          right: '18%',
        }}
      />
    </div>
  );
}
