import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, LibraryBig } from "lucide-react";

/*
 * Adapted from Transitions.dev Dropdown menu morph.
 * Source: transitions/dropdown-menu-morph/index.html
 * Implements the same trigger-to-surface size/radius morph, with outside-click
 * and Escape handling from the published React example.
 */
export function MorphSelect({ items, value, onChange, label = "选择词书" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();
  const selected = items.find((item) => item.value === value) || items[0];

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      className="morph-select"
      data-open={open ? "true" : "false"}
      ref={rootRef}
    >
      <button
        type="button"
        className="morph-select__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${label}：${selected?.label || ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        <LibraryBig size={17} aria-hidden="true" />
        <span>
          <small>{label}</small>
          <strong>{selected?.label || "暂无词书"}</strong>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div className="morph-select__menu" id={menuId} role="menu">
        <div className="morph-select__menu-heading">
          <span>切换到其他词书</span>
          <small>{items.length} 本</small>
        </div>
        <div className="morph-select__options">
          {items.map((item) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={item.value === value}
              key={item.value}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              <span>{item.label}</span>
              {item.value === value ? <Check size={16} /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

