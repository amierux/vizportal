# Workspace Cycle 1: Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core workspace module — folder/list/task hierarchy with permissions, list and kanban views, My Tasks global view, remarks, attachments, checklists, templates, and in-app notifications.

**Architecture:** 12 new database tables for workspace hierarchy + 2 for notifications. Folder-level membership controls access (viewer/creator/editor/admin). Tasks support subtasks, remarks (append-only comments), checklists (with templates), and attachments. Views are client components that render the same task data in different layouts. Notifications are a generic system with bell icon in header.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres, Auth, Storage), Tailwind + shadcn/ui, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-04-14-workspace-timesheet-design.md` — Sections 1-5, 8, 9.1-9.2

---

## File Structure

```
vizportal/
├── supabase/migrations/
│   ├── 00040_create_workspace_folders.sql
│   ├── 00041_create_workspace_lists.sql
│   ├── 00042_create_workspace_tasks.sql
│   ├── 00043_create_workspace_checklists.sql
│   ├── 00044_create_workspace_templates.sql
│   └── 00045_create_notifications.sql
├── src/
│   ├── app/(portal)/
│   │   ├── workspace/
│   │   │   ├── page.tsx                                  # My Tasks global view
│   │   │   ├── folders/
│   │   │   │   ├── page.tsx                              # Browse folders
│   │   │   │   └── [folderId]/
│   │   │   │       ├── page.tsx                          # Folder view
│   │   │   │       └── lists/[listId]/page.tsx           # List view
│   │   │   └── tasks/[taskId]/page.tsx                   # Task detail
│   │   └── settings/workspace/page.tsx                   # Templates
│   ├── components/
│   │   ├── workspace/
│   │   │   ├── folder-card.tsx                           # Folder card in browse view
│   │   │   ├── folder-create-dialog.tsx                  # Create folder
│   │   │   ├── folder-settings-dialog.tsx                # Edit folder, manage members/statuses
│   │   │   ├── list-sidebar.tsx                          # Sidebar listing lists in a folder
│   │   │   ├── list-create-dialog.tsx                    # Create list (from scratch or template)
│   │   │   ├── task-list-view.tsx                        # List/table view of tasks
│   │   │   ├── task-kanban-view.tsx                      # Kanban board view
│   │   │   ├── task-create-dialog.tsx                    # Create task/subtask
│   │   │   ├── task-detail-panel.tsx                     # Full task detail (remarks, checklists, etc)
│   │   │   ├── task-remarks.tsx                          # Remarks thread
│   │   │   ├── task-checklists.tsx                       # Checklists with items
│   │   │   ├── task-attachments.tsx                      # Attachment list + upload
│   │   │   ├── task-subtasks.tsx                         # Subtask list
│   │   │   ├── task-time-log.tsx                         # Log time on task (placeholder for cycle 2)
│   │   │   ├── view-switcher.tsx                         # Tabs to switch List/Kanban/Gantt/Calendar
│   │   │   └── my-tasks-view.tsx                         # My Tasks grouped view
│   │   ├── notifications/
│   │   │   └── notification-bell.tsx                     # Bell icon + dropdown
│   │   └── settings/
│   │       └── workspace-templates.tsx                   # Template management
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── workspace-folders.ts                      # Folder CRUD + members + statuses
│   │   │   ├── workspace-lists.ts                        # List CRUD
│   │   │   ├── workspace-tasks.ts                        # Task CRUD + subtasks + remarks + attachments + checklists
│   │   │   ├── workspace-templates.ts                    # Template CRUD
│   │   │   └── notifications.ts                          # Notification CRUD + send
│   │   └── validations/
│   │       └── workspace.ts                              # Zod schemas
│   └── types/
│       ├── database.ts                                   # MODIFY — 14 new tables
│       └── index.ts                                      # MODIFY — new type aliases
```

---

## Task 1: Database Migrations

**Files:**
- Create: 6 migration files

- [ ] **Step 1: Create migration 00040 — workspace folders + members + statuses**

Create `vizportal/supabase/migrations/00040_create_workspace_folders.sql`:

```sql
-- Workspace folders
CREATE TABLE workspace_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1' NOT NULL,
  icon TEXT DEFAULT '📁' NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_folders_company ON workspace_folders(company_id);

CREATE TRIGGER workspace_folders_updated_at
  BEFORE UPDATE ON workspace_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workspace_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders they are members of"
  ON workspace_folders FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND (
      id IN (SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid())
      OR has_any_role(ARRAY['admin', 'hr'])
    )
  );

CREATE POLICY "TL/DM/Director can create folders"
  ON workspace_folders FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id()
    AND has_any_role(ARRAY['team_leader', 'dept_manager', 'director', 'admin'])
  );

CREATE POLICY "Folder admins can update"
  ON workspace_folders FOR UPDATE
  USING (
    company_id = get_user_company_id()
    AND (
      id IN (SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid() AND permission = 'admin')
      OR has_any_role(ARRAY['admin'])
    )
  );

CREATE POLICY "Folder admins can delete"
  ON workspace_folders FOR DELETE
  USING (
    company_id = get_user_company_id()
    AND (
      id IN (SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid() AND permission = 'admin')
      OR has_any_role(ARRAY['admin'])
    )
  );

-- Folder members
CREATE TABLE workspace_folder_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES workspace_folders(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  permission TEXT CHECK (permission IN ('viewer', 'creator', 'editor', 'admin')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(folder_id, profile_id)
);

CREATE INDEX idx_workspace_folder_members_folder ON workspace_folder_members(folder_id);
CREATE INDEX idx_workspace_folder_members_profile ON workspace_folder_members(profile_id);

ALTER TABLE workspace_folder_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folder members"
  ON workspace_folder_members FOR SELECT
  USING (
    folder_id IN (SELECT id FROM workspace_folders WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Folder admins can manage members"
  ON workspace_folder_members FOR ALL
  USING (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid() AND permission = 'admin'
    )
    OR has_role('admin')
  );

-- Folder statuses
CREATE TABLE workspace_folder_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES workspace_folders(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_done BOOLEAN DEFAULT false NOT NULL,
  requires_approval BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_folder_statuses_folder ON workspace_folder_statuses(folder_id);

ALTER TABLE workspace_folder_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folder statuses"
  ON workspace_folder_statuses FOR SELECT
  USING (
    folder_id IN (SELECT id FROM workspace_folders WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Folder admins can manage statuses"
  ON workspace_folder_statuses FOR ALL
  USING (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid() AND permission = 'admin'
    )
    OR has_role('admin')
  );
```

- [ ] **Step 2: Create migration 00041 — workspace lists + list statuses**

Create `vizportal/supabase/migrations/00041_create_workspace_lists.sql`:

```sql
CREATE TABLE workspace_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES workspace_folders(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  status_override BOOLEAN DEFAULT false NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_lists_folder ON workspace_lists(folder_id);

CREATE TRIGGER workspace_lists_updated_at
  BEFORE UPDATE ON workspace_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workspace_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lists in accessible folders"
  ON workspace_lists FOR SELECT
  USING (
    folder_id IN (
      SELECT id FROM workspace_folders WHERE company_id = get_user_company_id()
      AND (
        id IN (SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid())
        OR has_any_role(ARRAY['admin', 'hr'])
      )
    )
  );

CREATE POLICY "Creators+ can create lists"
  ON workspace_lists FOR INSERT
  WITH CHECK (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members
      WHERE profile_id = auth.uid() AND permission IN ('creator', 'editor', 'admin')
    )
    OR has_role('admin')
  );

CREATE POLICY "Editors+ can update lists"
  ON workspace_lists FOR UPDATE
  USING (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members
      WHERE profile_id = auth.uid() AND permission IN ('editor', 'admin')
    )
    OR has_role('admin')
  );

CREATE POLICY "Admins can delete lists"
  ON workspace_lists FOR DELETE
  USING (
    folder_id IN (
      SELECT folder_id FROM workspace_folder_members
      WHERE profile_id = auth.uid() AND permission = 'admin'
    )
    OR has_role('admin')
  );

-- List status overrides
CREATE TABLE workspace_list_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES workspace_lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_done BOOLEAN DEFAULT false NOT NULL,
  requires_approval BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_list_statuses_list ON workspace_list_statuses(list_id);

ALTER TABLE workspace_list_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view list statuses"
  ON workspace_list_statuses FOR SELECT
  USING (
    list_id IN (SELECT id FROM workspace_lists WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Editors+ can manage list statuses"
  ON workspace_list_statuses FOR ALL
  USING (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      JOIN workspace_folder_members wfm ON wfm.folder_id = wl.folder_id
      WHERE wfm.profile_id = auth.uid() AND wfm.permission IN ('editor', 'admin')
    )
    OR has_role('admin')
  );
```

- [ ] **Step 3: Create migration 00042 — workspace tasks + remarks + attachments**

Create `vizportal/supabase/migrations/00042_create_workspace_tasks.sql`:

```sql
CREATE TABLE workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES workspace_lists(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  parent_task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status_id UUID NOT NULL,
  assignee_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  start_date DATE,
  target_end_date DATE,
  completed_at TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')) DEFAULT 'none' NOT NULL,
  position INTEGER NOT NULL,
  is_recurring BOOLEAN DEFAULT false NOT NULL,
  recurrence_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_tasks_list ON workspace_tasks(list_id);
CREATE INDEX idx_workspace_tasks_assignee ON workspace_tasks(assignee_id);
CREATE INDEX idx_workspace_tasks_parent ON workspace_tasks(parent_task_id);
CREATE INDEX idx_workspace_tasks_status ON workspace_tasks(status_id);

CREATE TRIGGER workspace_tasks_updated_at
  BEFORE UPDATE ON workspace_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in accessible folders"
  ON workspace_tasks FOR SELECT
  USING (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      WHERE wl.folder_id IN (
        SELECT folder_id FROM workspace_folder_members WHERE profile_id = auth.uid()
      )
    )
    OR has_any_role(ARRAY['admin', 'hr'])
  );

CREATE POLICY "Creators+ can create tasks"
  ON workspace_tasks FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      WHERE wl.folder_id IN (
        SELECT folder_id FROM workspace_folder_members
        WHERE profile_id = auth.uid() AND permission IN ('creator', 'editor', 'admin')
      )
    )
    OR has_role('admin')
  );

CREATE POLICY "Editors+ can update tasks"
  ON workspace_tasks FOR UPDATE
  USING (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      WHERE wl.folder_id IN (
        SELECT folder_id FROM workspace_folder_members
        WHERE profile_id = auth.uid() AND permission IN ('editor', 'admin')
      )
    )
    OR created_by = auth.uid()
    OR assignee_id = auth.uid()
    OR has_role('admin')
  );

CREATE POLICY "Admins can delete tasks"
  ON workspace_tasks FOR DELETE
  USING (
    list_id IN (
      SELECT wl.id FROM workspace_lists wl
      WHERE wl.folder_id IN (
        SELECT folder_id FROM workspace_folder_members
        WHERE profile_id = auth.uid() AND permission = 'admin'
      )
    )
    OR created_by = auth.uid()
    OR has_role('admin')
  );

-- Task remarks
CREATE TABLE workspace_task_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_task_remarks_task ON workspace_task_remarks(task_id);

ALTER TABLE workspace_task_remarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task remarks"
  ON workspace_task_remarks FOR SELECT
  USING (
    task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Members can add remarks"
  ON workspace_task_remarks FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Task attachments
CREATE TABLE workspace_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_task_attachments_task ON workspace_task_attachments(task_id);

ALTER TABLE workspace_task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task attachments"
  ON workspace_task_attachments FOR SELECT
  USING (
    task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Members can add attachments"
  ON workspace_task_attachments FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can delete own attachments"
  ON workspace_task_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR has_role('admin'));
```

- [ ] **Step 4: Create migration 00043 — checklists + items**

Create `vizportal/supabase/migrations/00043_create_workspace_checklists.sql`:

```sql
CREATE TABLE workspace_task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_checklists_task ON workspace_task_checklists(task_id);

ALTER TABLE workspace_task_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklists"
  ON workspace_task_checklists FOR SELECT
  USING (
    task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Members can manage checklists"
  ON workspace_task_checklists FOR ALL
  USING (
    task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
  );

CREATE TABLE workspace_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES workspace_task_checklists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false NOT NULL,
  position INTEGER NOT NULL,
  assignee_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_workspace_checklist_items_checklist ON workspace_checklist_items(checklist_id);

ALTER TABLE workspace_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist items"
  ON workspace_checklist_items FOR SELECT
  USING (
    checklist_id IN (
      SELECT id FROM workspace_task_checklists
      WHERE task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
    )
  );

CREATE POLICY "Members can manage checklist items"
  ON workspace_checklist_items FOR ALL
  USING (
    checklist_id IN (
      SELECT id FROM workspace_task_checklists
      WHERE task_id IN (SELECT id FROM workspace_tasks WHERE company_id = get_user_company_id())
    )
  );
```

- [ ] **Step 5: Create migration 00044 — templates**

Create `vizportal/supabase/migrations/00044_create_workspace_templates.sql`:

```sql
CREATE TABLE workspace_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE workspace_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates"
  ON workspace_checklist_templates FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage templates"
  ON workspace_checklist_templates FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));

CREATE TABLE workspace_list_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE workspace_list_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view list templates"
  ON workspace_list_templates FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admin can manage list templates"
  ON workspace_list_templates FOR ALL
  USING (company_id = get_user_company_id() AND has_role('admin'));
```

- [ ] **Step 6: Create migration 00045 — notifications**

Create `vizportal/supabase/migrations/00045_create_notifications.sql`:

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_profile_read ON notifications(profile_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  in_app BOOLEAN DEFAULT true NOT NULL,
  email BOOLEAN DEFAULT false NOT NULL,
  UNIQUE(profile_id, event_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  USING (profile_id = auth.uid());
```

- [ ] **Step 7: Push migrations + commit**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
npx supabase db push
git add supabase/migrations/
git commit -m "feat: add workspace and notifications migrations — folders, lists, tasks, checklists, templates"
```

---

## Task 2: Database Types + Routes + Navigation

**Files:**
- Modify: `vizportal/src/types/database.ts` — add 14 table types
- Modify: `vizportal/src/types/index.ts` — add type aliases
- Modify: `vizportal/src/lib/constants.ts` — add routes
- Modify: `vizportal/src/components/layout/header.tsx` — add page titles
- Modify: `vizportal/src/components/layout/sidebar.tsx` — add Workspace
- Modify: `vizportal/src/components/settings/settings-nav.tsx` — add Workspace tab

Add all 14 table types matching the migration schemas: `workspace_folders`, `workspace_folder_members`, `workspace_folder_statuses`, `workspace_lists`, `workspace_list_statuses`, `workspace_tasks`, `workspace_task_remarks`, `workspace_task_attachments`, `workspace_task_checklists`, `workspace_checklist_items`, `workspace_checklist_templates`, `workspace_list_templates`, `notifications`, `notification_preferences`.

Type aliases: `WorkspaceFolder`, `WorkspaceFolderMember`, `WorkspaceFolderStatus`, `WorkspaceList`, `WorkspaceListStatus`, `WorkspaceTask`, `WorkspaceTaskRemark`, `WorkspaceTaskAttachment`, `WorkspaceTaskChecklist`, `WorkspaceChecklistItem`, `WorkspaceChecklistTemplate`, `WorkspaceListTemplate`, `Notification`, `NotificationPreference`.

Routes: `/workspace`, `/workspace/folders`, `/settings/workspace`.

Sidebar: "Workspace" with `LayoutGrid` icon before Attendance, roles: [].

Settings nav: "Workspace" tab, admin only.

- [ ] **Step 1: Add all types, routes, navigation**
- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/types/ src/lib/constants.ts src/components/layout/ src/components/settings/settings-nav.tsx
git commit -m "feat: add workspace types, routes, and navigation"
```

---

## Task 3: Validation Schemas

**Files:**
- Create: `vizportal/src/lib/validations/workspace.ts`

```typescript
import { z } from "zod";

export const folderSchema = z.object({
  name: z.string().min(1, "Folder name is required"),
  description: z.string().optional(),
  color: z.string().default("#6366f1"),
  icon: z.string().default("📁"),
});

export type FolderInput = z.infer<typeof folderSchema>;

export const listSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
});

export type ListInput = z.infer<typeof listSchema>;

export const taskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  target_end_date: z.string().optional().nullable(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).default("none"),
});

export type TaskInput = z.infer<typeof taskSchema>;

export const statusSchema = z.object({
  name: z.string().min(1, "Status name is required"),
  color: z.string().min(1),
  is_done: z.boolean().default(false),
  requires_approval: z.boolean().default(false),
});

export type StatusInput = z.infer<typeof statusSchema>;

export const remarkSchema = z.object({
  content: z.string().min(1, "Remark cannot be empty"),
});

export type RemarkInput = z.infer<typeof remarkSchema>;
```

- [ ] **Step 1: Create validation file**
- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/lib/validations/workspace.ts
git commit -m "feat: add workspace validation schemas"
```

---

## Task 4: Folder Server Actions

**Files:**
- Create: `vizportal/src/lib/actions/workspace-folders.ts`

Actions:
- `createFolder(_prevState, formData)` — creates folder + adds creator as admin member + seeds default statuses (To Do, In Progress, Review, Done)
- `getFolders()` — returns folders user is a member of
- `getFolder(folderId)` — single folder with members + statuses
- `updateFolder(_prevState, formData)` — update name/description/color/icon
- `deleteFolder(folderId)` — archive
- `addFolderMember(folderId, profileId, permission)` — add member
- `removeFolderMember(folderId, profileId)` — remove member
- `updateFolderMemberPermission(folderId, profileId, permission)` — change permission
- `addFolderStatus(_prevState, formData)` — add custom status
- `updateFolderStatus(statusId, data)` — update status
- `deleteFolderStatus(statusId)` — remove status
- `reorderFolderStatuses(folderId, statusIds)` — reorder

- [ ] **Step 1: Create folder actions file with all functions**
- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/lib/actions/workspace-folders.ts
git commit -m "feat: add workspace folder server actions — CRUD, members, statuses"
```

---

## Task 5: List Server Actions

**Files:**
- Create: `vizportal/src/lib/actions/workspace-lists.ts`

Actions:
- `createList(_prevState, formData)` — creates list in a folder with next position
- `getLists(folderId)` — all lists in a folder
- `getList(listId)` — single list with statuses
- `updateList(_prevState, formData)` — update name/description
- `deleteList(listId)` — archive
- `createListFromTemplate(folderId, templateId)` — create list from template with pre-populated statuses and tasks

- [ ] **Step 1: Create list actions file**
- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/lib/actions/workspace-lists.ts
git commit -m "feat: add workspace list server actions"
```

---

## Task 6: Task Server Actions

**Files:**
- Create: `vizportal/src/lib/actions/workspace-tasks.ts`

Actions:
- `createTask(_prevState, formData)` — create task or subtask, send notification to assignee
- `getTasks(listId, filters?)` — tasks for a list with subtasks, sorted by position
- `getTask(taskId)` — single task with subtasks, remarks, checklists, attachments
- `getMyTasks()` — all tasks assigned to current user across all folders/lists
- `updateTask(_prevState, formData)` — update any task field
- `updateTaskStatus(taskId, statusId)` — change status (separate for approval flow later)
- `deleteTask(taskId)` — delete task
- `reorderTasks(listId, taskIds)` — reorder

Remarks:
- `addRemark(_prevState, formData)` — add remark to task
- `getRemarks(taskId)` — all remarks with user info

Attachments:
- `addAttachment(taskId, file)` — upload to storage, create record
- `deleteAttachment(attachmentId)` — delete file and record

Checklists:
- `addChecklist(taskId, name)` — create empty checklist
- `addChecklistFromTemplate(taskId, templateId)` — create from template
- `updateChecklist(checklistId, name)` — rename
- `deleteChecklist(checklistId)` — delete
- `addChecklistItem(checklistId, name)` — add item
- `toggleChecklistItem(itemId, isChecked)` — check/uncheck
- `deleteChecklistItem(itemId)` — remove item

- [ ] **Step 1: Create task actions file with all functions**
- [ ] **Step 2: Verify build + commit**

```bash
npm run build
git add src/lib/actions/workspace-tasks.ts
git commit -m "feat: add workspace task server actions — CRUD, remarks, attachments, checklists"
```

---

## Task 7: Notification Actions + Bell Component

**Files:**
- Create: `vizportal/src/lib/actions/notifications.ts`
- Create: `vizportal/src/components/notifications/notification-bell.tsx`
- Modify: `vizportal/src/app/(portal)/layout.tsx` — add bell to header area

Actions:
- `sendNotification(params)` — create notification record (+ send email if user preference says so)
- `getMyNotifications(limit?)` — recent notifications for current user
- `getUnreadCount()` — count of unread notifications
- `markAsRead(notificationId)` — mark single as read
- `markAllAsRead()` — mark all as read

Bell component:
- Client component with `useEffect` polling every 30 seconds for unread count
- Bell icon with red badge showing count
- Click opens dropdown panel with recent 20 notifications
- Each notification: title, message, relative time, click to navigate (uses `link` field)
- "Mark all read" button at top

- [ ] **Step 1: Create notification actions**
- [ ] **Step 2: Create bell component**
- [ ] **Step 3: Add bell to portal layout header**
- [ ] **Step 4: Verify build + commit**

```bash
npm run build
git add src/lib/actions/notifications.ts src/components/notifications/notification-bell.tsx src/app/\(portal\)/layout.tsx
git commit -m "feat: add notification system — bell icon, dropdown, mark read"
```

---

## Task 8: Template Actions + Settings Page

**Files:**
- Create: `vizportal/src/lib/actions/workspace-templates.ts`
- Create: `vizportal/src/components/settings/workspace-templates.tsx`
- Create: `vizportal/src/app/(portal)/settings/workspace/page.tsx`

Template actions:
- `getChecklistTemplates()` — all templates for company
- `createChecklistTemplate(_prevState, formData)` — name + items JSON
- `deleteChecklistTemplate(id)` — delete
- `getListTemplates()` — all list templates
- `createListTemplate(_prevState, formData)` — name + template_data JSON
- `deleteListTemplate(id)` — delete
- `saveListAsTemplate(listId, name)` — snapshot current list as template

Settings component: two sections — Checklist Templates (CRUD table) and List Templates (CRUD table).

- [ ] **Step 1: Create template actions**
- [ ] **Step 2: Create templates settings component + page**
- [ ] **Step 3: Verify build + commit**

```bash
npm run build
git add src/lib/actions/workspace-templates.ts src/components/settings/workspace-templates.tsx src/app/\(portal\)/settings/workspace/
git commit -m "feat: add workspace template management — checklist + list templates"
```

---

## Task 9: Workspace UI Components (Core)

**Files:**
- Create: `vizportal/src/components/workspace/folder-card.tsx`
- Create: `vizportal/src/components/workspace/folder-create-dialog.tsx`
- Create: `vizportal/src/components/workspace/folder-settings-dialog.tsx`
- Create: `vizportal/src/components/workspace/list-sidebar.tsx`
- Create: `vizportal/src/components/workspace/list-create-dialog.tsx`
- Create: `vizportal/src/components/workspace/view-switcher.tsx`

Components:
1. **folder-card.tsx** — Card showing folder name, icon, color bar, member count, list count. Clickable → navigates to folder.
2. **folder-create-dialog.tsx** — Dialog form: name, description, color picker, icon. Uses `createFolder` action.
3. **folder-settings-dialog.tsx** — Tabbed dialog: General (edit name/desc/color), Members (add/remove/change permission), Statuses (add/edit/reorder with drag, approval toggle). Complex component.
4. **list-sidebar.tsx** — Sidebar within folder view showing all lists. Clickable to select. Add list button.
5. **list-create-dialog.tsx** — Dialog: name, option to create from template (dropdown of available templates).
6. **view-switcher.tsx** — Tab bar: List | Kanban | Gantt | Calendar. Gantt and Calendar show "Coming soon" placeholder for Cycle 2.

- [ ] **Step 1: Create all 6 components**
- [ ] **Step 2: Verify build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/workspace/
git commit -m "feat: add workspace folder and list UI components"
```

---

## Task 10: Task UI Components

**Files:**
- Create: `vizportal/src/components/workspace/task-create-dialog.tsx`
- Create: `vizportal/src/components/workspace/task-detail-panel.tsx`
- Create: `vizportal/src/components/workspace/task-remarks.tsx`
- Create: `vizportal/src/components/workspace/task-checklists.tsx`
- Create: `vizportal/src/components/workspace/task-attachments.tsx`
- Create: `vizportal/src/components/workspace/task-subtasks.tsx`

Components:
1. **task-create-dialog.tsx** — Dialog: name, description, assignee (user autocomplete), start date, target end date, priority dropdown, parent_task_id (hidden, for subtask creation). Uses `createTask` action.
2. **task-detail-panel.tsx** — Full task detail view. Header: name (inline editable), status dropdown, priority badge, assignee, dates. Body: description (textarea), Subtasks section, Checklists section, Attachments section. Footer: Remarks thread (always visible).
3. **task-remarks.tsx** — Append-only thread. Shows all remarks with user avatar, name, content, timestamp. Input at bottom to add new remark. Auto-scrolls to bottom.
4. **task-checklists.tsx** — Multiple checklists per task. Each: name, progress bar, items with checkboxes. Add from template or create blank. Add/delete items.
5. **task-attachments.tsx** — File list with download/delete. Upload button.
6. **task-subtasks.tsx** — List of subtasks with status badge, assignee. Add subtask button opens task-create-dialog with parent_task_id set.

- [ ] **Step 1: Create all 6 components**
- [ ] **Step 2: Verify build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/workspace/
git commit -m "feat: add workspace task UI — detail panel, remarks, checklists, attachments, subtasks"
```

---

## Task 11: List View + Kanban View

**Files:**
- Create: `vizportal/src/components/workspace/task-list-view.tsx`
- Create: `vizportal/src/components/workspace/task-kanban-view.tsx`
- Create: `vizportal/src/components/workspace/my-tasks-view.tsx`

Components:
1. **task-list-view.tsx** — Table view: rows = tasks (indented subtasks), columns = name, PIC, status dropdown, priority badge, start date, target end, progress (checklist items checked/total). Sortable, filterable by status/assignee/priority. Grouped by status (collapsible). Click task name → opens task detail.
2. **task-kanban-view.tsx** — Board: columns = statuses (in position order). Cards: task name, assignee avatar, priority color dot, due date, subtask count badge. Cards are draggable between columns (updates task status on drop).
3. **my-tasks-view.tsx** — Groups tasks by: Overdue (target_end_date < today), Today, Upcoming (next 7 days), Later, No Due Date. Same row format as list view. Filterable.

- [ ] **Step 1: Create all 3 view components**
- [ ] **Step 2: Verify build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/workspace/
git commit -m "feat: add workspace views — list, kanban, my tasks"
```

---

## Task 12: Workspace Pages

**Files:**
- Create: `vizportal/src/app/(portal)/workspace/page.tsx` — My Tasks
- Create: `vizportal/src/app/(portal)/workspace/folders/page.tsx` — Browse folders
- Create: `vizportal/src/app/(portal)/workspace/folders/[folderId]/page.tsx` — Folder view
- Create: `vizportal/src/app/(portal)/workspace/folders/[folderId]/lists/[listId]/page.tsx` — List view
- Create: `vizportal/src/app/(portal)/workspace/tasks/[taskId]/page.tsx` — Task detail

Pages:
1. **My Tasks** — fetch `getMyTasks()`, render `MyTasksView`
2. **Browse Folders** — fetch `getFolders()`, render grid of `FolderCard` + `FolderCreateDialog` button
3. **Folder View** — fetch `getFolder(folderId)` + `getLists(folderId)`, render `ListSidebar` + folder settings button. If a list is not selected, show folder overview (all tasks across lists in selected view).
4. **List View** — fetch `getList(listId)` + `getTasks(listId)` + statuses. Render `ViewSwitcher` + selected view (list/kanban). Task create button.
5. **Task Detail** — fetch `getTask(taskId)`, render `TaskDetailPanel`.

- [ ] **Step 1: Create all 5 pages**
- [ ] **Step 2: Verify build + lint + commit**

```bash
npm run build && npm run lint
git add src/app/\(portal\)/workspace/
git commit -m "feat: add workspace pages — my tasks, folders, folder view, list view, task detail"
```

---

## Task 13: Final Integration + Deploy

- [ ] **Step 1: Run full verification**

```bash
cd /Users/m3n6/ClaudeGravity/vizportal
export PATH="/Users/m3n6/.local/node/bin:$PATH"
npm test && npm run build && npm run lint
```

- [ ] **Step 2: Push migrations**

```bash
npx supabase db push
```

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod --yes
```
