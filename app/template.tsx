import type { ReactNode } from "react";

/**
 * Route transition.
 *
 * A `template.tsx` remounts on every navigation where a `layout.tsx`
 * does not, which is exactly the hook a page transition needs -- so this
 * costs one wrapping element and no router subscription, no client
 * component and no animation library.
 *
 * The animation itself lives in `.page-enter` (app/globals.css), defined
 * inside `@media (prefers-reduced-motion: no-preference)`. That matters
 * more here than anywhere else in the app: this wraps every page, so if
 * the rule applied unconditionally and anything went wrong with it, the
 * entire site would be stuck at `opacity: 0`. Gated this way, the
 * untouched default is a fully visible page and the motion is added
 * only when it is both supported and wanted.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
