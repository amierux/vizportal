# Plan 5: Global Effects & Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Framer Motion animations and glassmorphism polish across the entire app — page transitions in the portal layout, sidebar animations, table row effects, form micro-interactions, notification polish, and modal/dialog entrance animations.

**Architecture:** Wrap portal layout children in PageTransition, enhance sidebar with active-item spring animation, add motion to existing table/form/dialog components via wrapper components or direct modifications.

**Tech Stack:** Framer Motion 12, existing components, Tailwind CSS 4

---

## File Structure

### New Files
```
src/components/layout/animated-sidebar.tsx     — Sidebar wrapper with active item spring + collapse animation
```

### Modified Files
```
src/app/(portal)/layout.tsx                     — Wrap children in PageTransition
src/components/layout/sidebar.tsx               — Add animation classes, spring active indicator
src/components/layout/header.tsx                — Add scroll shadow effect
src/app/globals.css                             — Add scroll shadow, input focus glow, button press utilities
```

---

### Task 1: Page Transition in Portal Layout

**Files:**
- Modify: `src/app/(portal)/layout.tsx`

- [ ] **Step 1: Add PageTransition wrapper**

Read the current layout. Import `PageTransition` and wrap the `{children}` in the main tag:

Add import:
```typescript
import { PageTransition } from "@/components/shared/page-transition";
```

Wrap children:
```tsx
<main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
  <PageTransition>
    {children}
  </PageTransition>
</main>
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(portal)/layout.tsx" && git commit -m "feat: add page transition animation to portal layout"
```

---

### Task 2: Global CSS Polish — Input Focus, Button Press, Scroll Shadow

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append new utility classes to globals.css**

Add after existing content:

```css
/* Input focus glow */
input:focus, textarea:focus, select:focus {
  box-shadow: 0 0 0 3px oklch(0.55 0.15 250 / 0.15);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.dark input:focus, .dark textarea:focus, .dark select:focus {
  box-shadow: 0 0 0 3px oklch(0.55 0.15 250 / 0.25);
}

/* Button press effect */
button:active:not(:disabled),
[role="button"]:active:not(:disabled) {
  transform: scale(0.97);
  transition: transform 0.1s ease;
}

/* Header scroll shadow */
.header-scroll-shadow {
  box-shadow: none;
  transition: box-shadow 0.2s ease;
}

.header-scroll-shadow.scrolled {
  box-shadow: 0 1px 3px oklch(0 0 0 / 0.08);
}

.dark .header-scroll-shadow.scrolled {
  box-shadow: 0 1px 3px oklch(0 0 0 / 0.3);
}

/* Table row hover with left accent */
.table-row-hover {
  position: relative;
  transition: background-color 0.15s ease;
}

.table-row-hover::before {
  content: "";
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 0;
  border-radius: 0 2px 2px 0;
  background: oklch(0.55 0.15 250);
  transition: width 0.2s ease;
}

.table-row-hover:hover {
  background-color: oklch(0.97 0 0);
}

.dark .table-row-hover:hover {
  background-color: oklch(0.2 0 0);
}

.table-row-hover:hover::before {
  width: 3px;
}

/* Semantic status colors */
.status-success { color: oklch(0.55 0.15 155); }
.status-warning { color: oklch(0.65 0.15 80); }
.status-error { color: oklch(0.55 0.2 25); }
.status-info { color: oklch(0.55 0.15 250); }
.status-neutral { color: oklch(0.55 0 0); }

/* Smooth scrollbar */
.smooth-scroll {
  scroll-behavior: smooth;
}

/* Modal backdrop enhancement */
.modal-backdrop {
  backdrop-filter: blur(8px);
  transition: backdrop-filter 0.2s ease;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css && git commit -m "feat: add input focus glow, button press, scroll shadow, table row hover, status colors"
```

---

### Task 3: Sidebar Animation Enhancement

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Enhance sidebar with animation classes**

Read the current sidebar.tsx. Apply these targeted changes:

1. Find the sidebar collapse/expand transition. If it uses a width transition, ensure it has `transition-all duration-200 ease-in-out` class.

2. Find the navigation items (likely `<Link>` or `<a>` elements in a list). Add to each nav item:
   - Active state: Add `relative` class. Before the text, add an active indicator:
   ```tsx
   {isActive && (
     <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
   )}
   ```
   - Hover state: Add `transition-colors duration-150` class

3. Find the collapse toggle button/chevron. Add a rotation class:
   ```tsx
   className={cn("transition-transform duration-200", collapsed && "rotate-180")}
   ```

4. Add `group` class to nav item container for group-hover effects.

**IMPORTANT:** Don't rewrite the entire file. Only add/modify the animation-related classes. The sidebar has complex role-based visibility logic that must stay untouched.

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx && git commit -m "feat: add sidebar active indicator, hover transitions, collapse animation"
```

---

### Task 4: Header Scroll Shadow

**Files:**
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Add scroll-triggered shadow to header**

Read the current header.tsx. It's a client component. Add a scroll listener that toggles a shadow class:

1. Add state and effect at the top of the component:
```typescript
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const main = document.querySelector("main");
  if (!main) return;
  const handler = () => setScrolled(main.scrollTop > 10);
  main.addEventListener("scroll", handler, { passive: true });
  return () => main.removeEventListener("scroll", handler);
}, []);
```

2. Add `header-scroll-shadow` class and conditionally add `scrolled` class to the header element:
```tsx
className={cn("..existing classes..", "header-scroll-shadow", scrolled && "scrolled")}
```

If the header doesn't already import `useState`/`useEffect`, add them. If it's not a client component, check if it has `"use client"` directive.

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/header.tsx && git commit -m "feat: add scroll-triggered shadow to header"
```

---

### Task 5: Wrap All Module Pages in PageTransition

**Files:**
- Modify: All module page files that don't already have PageTransition

Since we added PageTransition in the layout (Task 1), individual pages don't need it. But we should remove the old `animate-fade-in-up` class from any pages that still use it, since the layout now handles transitions.

- [ ] **Step 1: Find and remove old animation classes from pages**

Search for `animate-fade-in-up` across all page files:
```bash
grep -rn "animate-fade-in-up" src/app/ --include="*.tsx"
```

For each file found, remove the `animate-fade-in-up` class from the outer div. The PageTransition in the layout now handles entry animations.

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "refactor: remove redundant animate-fade-in-up — layout handles page transitions"
```

---

### Task 6: Build Verification

- [ ] **Step 1: TypeScript check**
```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npx tsc --noEmit 2>&1
```

- [ ] **Step 2: Tests**
```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm test 2>&1
```

- [ ] **Step 3: Commit fixes if needed**
```bash
git add -A && git commit -m "fix: resolve build issues from global effects polish"
```
