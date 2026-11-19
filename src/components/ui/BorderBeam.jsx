/*
 * Adapted from Libraries.dev BorderBeam.
 * Source: libraries-dev/packages/border-beam/src/BorderBeam.tsx
 * The original's traveling perimeter highlight is retained through a lightweight
 * CSS mask so this app does not need the source package's theme/runtime layer.
 */
export function BorderBeam({
  children,
  className = "",
  active = true,
  duration = 7,
}) {
  return (
    <div
      className={`border-beam ${active ? "is-active" : ""} ${className}`.trim()}
      style={{ "--beam-duration": `${duration}s` }}
      data-beam-active={active ? "" : undefined}
    >
      {children}
      <span className="border-beam__glow" aria-hidden="true" />
    </div>
  );
}

