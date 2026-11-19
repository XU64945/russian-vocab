import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

/*
 * Adapted from shadcn/ui Accordion and ObsidianUI Analytics Disclosure.
 * Sources:
 * - shadcn-ui/apps/v4/registry/bases/radix/ui/accordion.tsx
 * - obsidian-ui/src/components/analytics-dashboard/details.tsx
 * The accessible trigger/panel relationship is preserved without adding Radix.
 */
export function Disclosure({
  title,
  eyebrow,
  children,
  defaultOpen = false,
  className = "",
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`disclosure ${open ? "is-open" : ""} ${className}`.trim()} data-open={open}>
      <button
        type="button"
        className="disclosure__trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          {eyebrow ? <small>{eyebrow}</small> : null}
          <strong>{title}</strong>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      <div className="disclosure__panel" id={id} aria-hidden={!open}>
        <div className="disclosure__inner">{children}</div>
      </div>
    </div>
  );
}

