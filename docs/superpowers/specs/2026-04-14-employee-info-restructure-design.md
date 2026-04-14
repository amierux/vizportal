# Employee Information Restructure — Design Spec

**Date:** 2026-04-14
**Project:** VizPortal
**Scope:** Rename Employees module, move My Profile inside it, role-gate All Members tab

---

## 1. Changes

### 1.1 Sidebar

- Rename "Employees" to "Employee Information" in sidebar nav
- Remove "My Profile" from sidebar nav
- Icon stays the same (Users)

### 1.2 Bottom Tabs (Mobile)

- Remove "Profile" tab
- "Employees" tab renamed to "Employee Info"

### 1.3 Employee Information Page (`/employees`)

Current page shows the employee directory table. Replace with a tabbed layout:

**Tab 1: My Profile** (visible to all)
- Shows the current `/profile` page content (profile form, avatar, etc.)
- This is the default tab for non-admin users

**Tab 2: All Members** (visible to admin, HR, business_manager, director only)
- Shows the current employee directory table (search, filters, pagination)
- This is the default tab for admin/HR users

### 1.4 Routes

- `/employees` — the main page with tabs (all authenticated)
- `/employees/[id]` — employee detail page (unchanged, existing role gates)
- `/profile` — redirects to `/employees` (My Profile tab)

### 1.5 Route Role Map Update

```typescript
"/employees": [],  // Changed from restricted to all authenticated
```

### 1.6 Header Title

```typescript
"/employees": "Employee Information",
```

### 1.7 Files to Modify

- `src/components/layout/sidebar.tsx` — rename label, remove My Profile
- `src/components/layout/bottom-tabs.tsx` — rename, remove Profile tab
- `src/components/layout/header.tsx` — update page title
- `src/lib/constants.ts` — update route role map
- `src/app/(portal)/employees/page.tsx` — add tabs (My Profile + All Members)
- `src/app/(portal)/profile/page.tsx` — redirect to /employees

### 1.8 Data Flow

The employees page needs to:
1. Fetch current user's profile data (for My Profile tab)
2. Fetch employee directory data (for All Members tab, only if user has permission)
3. Determine which tab to show as default based on role
