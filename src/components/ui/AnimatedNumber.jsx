import { useEffect, useRef, useState } from "react";

/*
 * Adapted from React Bits CountUp.
 * Source: react-bits/src/content/TextAnimations/CountUp/CountUp.jsx
 * Kept the accessible live value and in-view trigger; reduced the implementation
 * to the numeric counter needed by this application's metrics.
 */
export function AnimatedNumber({
  value,
  duration = 720,
  prefix = "",
  suffix = "",
  className = "",
}) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(Number(value) || 0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "40px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return undefined;
    const target = Number(value) || 0;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target);
      return undefined;
    }
    let frame = 0;
    const startValue = target === 0 ? 0 : target * 0.72;
    const startedAt = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startValue + (target - startValue) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, started, value]);

  const rounded =
    Math.abs(display - Math.round(display)) < 0.01
      ? Math.round(display)
      : display.toFixed(1);

  return (
    <span
      className={`animated-number ${className}`.trim()}
      ref={ref}
      aria-label={`${prefix}${value}${suffix}`}
    >
      <span aria-hidden="true">
        {prefix}
        {rounded}
        {suffix}
      </span>
    </span>
  );
}

