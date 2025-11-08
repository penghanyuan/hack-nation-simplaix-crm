## Minimal Black-&-White Design Guide

**Make sure to use the existing shadcn-ui/tailwind classes.**

**For Front-End “Code Agents” (AI or human)**

This document defines the *only* visual primitives you should emit when generating markup or component code for the project-management app. Stick to them unless explicitly overridden by a human designer.

---

### 1. Palette & Class Map

| Role                        | Tailwind / shadcn class                                                     | Notes                                              |
| --------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| **Base**                    | `bg-white`                                                                  | Root `<body>` / layout background. Never override. |
| **Surface**                 | `bg-neutral-50`                                                             | Cards, sidebars, modals.                           |
| **Hover**                   | `hover:bg-neutral-100`                                                      | Applied to `li`, table rows, non-primary buttons.  |
| **Border (rare)**           | `border-neutral-200`                                                        | Inputs and essential dividers only.                |
| **Primary text**            | `text-neutral-900`                                                          | All headings & body copy.                          |
| **Secondary text**          | `text-neutral-700`                                                          | Sub-headings, meta info.                           |
| **Tertiary text**           | `text-neutral-500`                                                          | Hints, disabled labels.                            |
| **Placeholder**             | `placeholder:text-neutral-400`                                              | Form placeholders.                                 |
| **Primary button / accent** | `bg-neutral-800 text-neutral-50 hover:bg-neutral-900 active:bg-neutral-950` | Use *only one* per view if possible.               |
| **Focus outline**           | `focus:ring-2 focus:ring-neutral-300`                                       | Always pair with `focus:outline-none`.             |

#### Semantic statuses

| Status       | Background      | Foreground         | Typical use                   |
| ------------ | --------------- | ------------------ | ----------------------------- |
| **Info**     | `bg-sky-50`     | `text-sky-600`     | “To Do”, info banners         |
| **Progress** | `bg-indigo-50`  | `text-indigo-600`  | “In Progress”, loading states |
| **Success**  | `bg-emerald-50` | `text-emerald-600` | “Done”, success toasts        |
| **Warning**  | `bg-amber-50`   | `text-amber-600`   | Near-deadline alerts          |
| **Danger**   | `bg-rose-50`    | `text-rose-600`    | “Blocked”, errors             |

---

### 2. Depth, Borders, Corners

1. **Shadows, not borders**

   * Cards/modals: `shadow-md`
   * Drawers/overlays: `shadow-lg`
   * Focus/active items: `shadow-sm` *or* the ring above
2. **Border usage is exceptional** – Inputs and list dividers only (`divide-y divide-neutral-100`).
3. **Corner radius**

   * Global default: `rounded-sm` (2 px)
   * Clickable pills & buttons: `rounded-md` (4 px)
   * Full-capsule visuals (progress bars, avatars): `rounded-full`

---

### 3. Dark-Mode Contract

```html
class="bg-white text-neutral-900
       dark:bg-neutral-900 dark:text-neutral-50
       transition-colors"
```

* Swap `bg-white` ↔ `bg-neutral-900`, `bg-neutral-50` ↔ `bg-neutral-800`.
* Deepen semantic backgrounds one or two steps (`dark:bg-emerald-950`) and *lighten* their text (`dark:text-emerald-300`) to maintain ≥ 4.5:1 contrast.

---

### 4. Component Snippet Templates

```html
<!-- Card -->
<div class="bg-neutral-50 shadow-md rounded-sm p-6">…</div>

<!-- Input -->
<input class="w-full bg-white border border-neutral-200 rounded-sm px-3 py-2
             text-neutral-900 placeholder:text-neutral-400
             focus:outline-none focus:ring-2 focus:ring-neutral-300" />

<!-- List with soft dividers -->
<ul class="divide-y divide-neutral-100">
  <li class="py-3 hover:bg-neutral-100">…</li>
</ul>

<!-- Primary button -->
<button class="bg-neutral-800 text-neutral-50 rounded-md px-4 py-2
               hover:bg-neutral-900 active:bg-neutral-950 shadow-sm
               focus:outline-none focus:ring-2 focus:ring-neutral-300">
  Save
</button>
```

> **Rule:** Never emit inline styles; rely entirely on the utility classes above.

---

### 5. Accessibility Requirements

* All foreground–background pairs must meet **WCAG 2.1 AA** (≥ 4.5 : 1).
* Provide keyboard focus via `ring-2` on every interactive element.
* Do **not** suppress native focus unless you replace it with the ring.

---

### 6. Forbidden Outputs

| Item                                                                  | Why                            |
| --------------------------------------------------------------------- | ------------------------------ |
| Hard-coded hex/RGB colors                                             | Breaks theme & dark-mode swap. |
| Borders thicker than 1 px (except charts)                             | Creates visual “boxes”.        |
| Radius larger than `rounded-md` outside explicitly rounded components | Violates minimal aesthetic.    |
| Multiple primary buttons in the same viewport                         | Dilutes visual hierarchy.      |

---

### 7. Quick Checklist for the Agent

1. **Cards use shadow, not border**.
2. **Only inputs have borders** – double-check.
3. **Single accent per screen**.
4. **Ring visible** for every focusable element.
5. Run an automated contrast check before emitting final HTML.

