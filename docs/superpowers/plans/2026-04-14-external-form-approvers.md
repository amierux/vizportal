# External Form Approvers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow form approval steps to be assigned to external (non-user) email addresses, who receive a unique token link to approve/reject from a public page — mirroring the existing `/approvals/[token]` pattern used for leave/manual clock.

**Architecture:** Extend `form_approvers` and `form_submission_approval_steps` to support nullable `profile_id` alongside `approver_email` + `approver_name` + a UUID `token` on each step. The settings UI gains an "Add External Approver" section. On form submission, external steps trigger an email with a unique `/forms/approve/[token]` link handled by a public page outside the portal layout. A new server action `processFormApprovalByToken` handles decisions from the public page using the admin client (no auth needed).

**Tech Stack:** Next.js App Router (server components + `useActionState`), Supabase (PostgreSQL + service role client), Resend email via existing `sendEmail`, shadcn/ui components, TypeScript.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/00058_external_form_approvers.sql` | Create | DB schema changes |
| `src/types/database.ts` | Modify | TypeScript types for new columns |
| `src/components/forms/form-settings-panel.tsx` | Modify | UI: external approver input + serialization |
| `src/lib/actions/form-builder.ts` | Modify | Read new `approvers` JSON format, insert mixed approver types |
| `src/lib/utils/email.ts` | Modify | Add `buildFormApprovalEmail` helper |
| `src/lib/actions/form-submissions.ts` | Modify | `submitForm`: handle external steps + send email; `processFormApprovalByToken`: new action; `getMyPendingFormApprovals`: filter to `approver_id = auth.uid()` |
| `src/app/forms/approve/[token]/page.tsx` | Create | Public approval page (server component wrapper) |
| `src/components/forms/form-approval-public-page.tsx` | Create | Client component for public approve/reject UI |
| `src/proxy.ts` | Modify | Add `/forms/approve/` to `PUBLIC_ROUTES` |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/00058_external_form_approvers.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Allow external (non-user) approvers by email

-- form_approvers: make profile_id optional, add email + name
ALTER TABLE form_approvers ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE form_approvers ADD COLUMN approver_email TEXT;
ALTER TABLE form_approvers ADD COLUMN approver_name TEXT;
ALTER TABLE form_approvers ADD CONSTRAINT form_approvers_has_identity
  CHECK (profile_id IS NOT NULL OR approver_email IS NOT NULL);

-- form_submission_approval_steps: make approver_id optional, add email + name + token
ALTER TABLE form_submission_approval_steps ALTER COLUMN approver_id DROP NOT NULL;
ALTER TABLE form_submission_approval_steps ADD COLUMN approver_email TEXT;
ALTER TABLE form_submission_approval_steps ADD COLUMN approver_name TEXT;
ALTER TABLE form_submission_approval_steps ADD COLUMN token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL;
ALTER TABLE form_submission_approval_steps ADD CONSTRAINT form_submission_approval_steps_has_identity
  CHECK (approver_id IS NOT NULL OR approver_email IS NOT NULL);

CREATE INDEX idx_form_submission_approval_steps_token ON form_submission_approval_steps(token);
```

- [ ] **Step 2: Push migration**

Run from repo root (with `export PATH="/Users/m3n6/.local/node/bin:$PATH"`):
```bash
npx supabase db push
```

Expected: migration applied without error. If Supabase CLI prompts, confirm.

- [ ] **Step 3: Verify migration applied**

```bash
npx supabase db diff --schema public 2>&1 | grep -E "approver_email|approver_name|token"
```

Expected: no diff output for those columns (they are now in the remote schema).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00058_external_form_approvers.sql
git commit -m "feat: migrate DB to support external approvers on form approval steps"
```

---

### Task 2: Update TypeScript Database Types

**Files:**
- Modify: `src/types/database.ts` — lines around `form_approvers` (1893–1910) and `form_submission_approval_steps` (1931–1956)

- [ ] **Step 1: Update `form_approvers` Row/Insert/Update**

Replace the current `form_approvers` block (lines 1893–1910):

```typescript
      form_approvers: {
        Row: {
          id: string;
          form_approval_config_id: string;
          profile_id: string | null;
          approver_email: string | null;
          approver_name: string | null;
          step_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_approval_config_id: string;
          profile_id?: string | null;
          approver_email?: string | null;
          approver_name?: string | null;
          step_order: number;
        };
        Update: {
          step_order?: number;
          approver_email?: string | null;
          approver_name?: string | null;
        };
        Relationships: [];
      };
```

- [ ] **Step 2: Update `form_submission_approval_steps` Row/Insert/Update**

Replace the current `form_submission_approval_steps` block (lines 1931–1956):

```typescript
      form_submission_approval_steps: {
        Row: {
          id: string;
          submission_approval_id: string;
          approver_id: string | null;
          approver_email: string | null;
          approver_name: string | null;
          token: string;
          step_order: number;
          status: "pending" | "approved" | "rejected";
          comment: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_approval_id: string;
          approver_id?: string | null;
          approver_email?: string | null;
          approver_name?: string | null;
          token?: string;
          step_order: number;
          status?: "pending" | "approved" | "rejected";
          comment?: string | null;
          decided_at?: string | null;
        };
        Update: {
          status?: "pending" | "approved" | "rejected";
          comment?: string | null;
          decided_at?: string | null;
        };
        Relationships: [];
      };
```

- [ ] **Step 3: Build to confirm types compile**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run build 2>&1 | tail -20
```

Expected: build passes (or only pre-existing errors, none from `database.ts`).

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: extend database types for external form approvers"
```

---

### Task 3: Add Email Helper

**Files:**
- Modify: `src/lib/utils/email.ts`

The existing file has `buildApprovalEmail`, `buildStatusEmail`, `buildReminderEmail`. We add a form-specific builder at the end.

- [ ] **Step 1: Append `buildFormApprovalEmail` to `src/lib/utils/email.ts`**

Add the following after the last export in the file:

```typescript
export function buildFormApprovalEmail(params: {
  approverName: string;
  submitterName: string;
  formName: string;
  approvalUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `[VizPortal] Approval needed: "${params.formName}" from ${params.submitterName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Form Approval Request</h2>
        <p>Hi ${params.approverName},</p>
        <p><strong>${params.submitterName}</strong> submitted a response to <strong>"${params.formName}"</strong> that requires your approval.</p>
        <p>Click the link below to review and approve or reject:</p>
        <a href="${params.approvalUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
          Review &amp; Decide
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          This link is your unique access — do not share it.
        </p>
      </div>
    `,
  };
}
```

- [ ] **Step 2: Verify lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/email.ts
git commit -m "feat: add buildFormApprovalEmail email helper"
```

---

### Task 4: Update Form Settings Panel UI

**Files:**
- Modify: `src/components/forms/form-settings-panel.tsx`

The component currently stores `ApproverEntry = { profile_id, name, email }` and serializes as JSON array of profile_id strings via `approval_approver_ids`. We need to:

1. Change `ApproverEntry` to a union type
2. Add external approver input fields (name + email)
3. Change hidden input from `approval_approver_ids` (string array) to `approvers` (object array)
4. Update remove handler — external approvers have no `profile_id`, use a generated client-side id
5. Update display list to show "External" badge

- [ ] **Step 1: Replace the type and state in `form-settings-panel.tsx`**

Replace lines 23–27 (the `ApproverEntry` type):

```typescript
type ApproverEntry =
  | { type: "user"; key: string; profile_id: string; name: string; email: string }
  | { type: "external"; key: string; name: string; email: string };
```

- [ ] **Step 2: Update `deriveInitialApprovers` to return the new union type**

Replace the `deriveInitialApprovers` function (lines 41–59):

```typescript
/** Derive initial approvers from the form's nested approval config (v2 shape). */
function deriveInitialApprovers(form: Record<string, unknown>): ApproverEntry[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = (form.form_approval_configs as any) ?? null;
  if (!config) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvers: any[] = Array.isArray(config.form_approvers)
    ? config.form_approvers
    : [];
  return approvers
    .sort((a, b) => a.step_order - b.step_order)
    .map((a): ApproverEntry => {
      if (a.profile_id) {
        return {
          type: "user",
          key: a.profile_id,
          profile_id: a.profile_id,
          name: a.profiles
            ? [a.profiles.first_name, a.profiles.last_name].filter(Boolean).join(" ") ||
              a.profiles.email
            : a.profile_id,
          email: a.profiles?.email ?? "",
        };
      }
      return {
        type: "external",
        key: `ext-${a.approver_email}`,
        name: a.approver_name ?? "",
        email: a.approver_email ?? "",
      };
    });
}
```

- [ ] **Step 3: Update component state and handlers**

In the `FormSettingsPanel` function, update these sections:

Replace the `addedIds` and `filteredProfiles` block (lines 97–107):

```typescript
  // Filtered profile list (exclude already-added internal approvers)
  const addedIds = new Set(
    approvers.filter((a) => a.type === "user").map((a) => (a as { type: "user"; profile_id: string }).profile_id)
  );
  const filteredProfiles = profiles.filter((p) => {
    if (addedIds.has(p.id)) return false;
    if (!approverSearch) return true;
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").toLowerCase();
    return (
      fullName.includes(approverSearch.toLowerCase()) ||
      (p.email ?? "").toLowerCase().includes(approverSearch.toLowerCase())
    );
  });
```

Replace the `addApprover` function (lines 109–114):

```typescript
  function addApprover(profile: { id: string; first_name: string | null; last_name: string | null; email: string }) {
    const name =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;
    setApprovers((prev) => [
      ...prev,
      { type: "user", key: profile.id, profile_id: profile.id, name, email: profile.email },
    ]);
    setApproverSearch("");
  }
```

Replace the `removeApprover` function (lines 116–118):

```typescript
  function removeApprover(key: string) {
    setApprovers((prev) => prev.filter((a) => a.key !== key));
  }
```

Add the following state and handler for external approvers, right after `removeApprover`:

```typescript
  // External approver form state
  const [extName, setExtName] = useState("");
  const [extEmail, setExtEmail] = useState("");

  function addExternalApprover() {
    const trimmedName = extName.trim();
    const trimmedEmail = extEmail.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) return;
    if (approvers.some((a) => a.email.toLowerCase() === trimmedEmail)) return; // already added
    setApprovers((prev) => [
      ...prev,
      { type: "external", key: `ext-${trimmedEmail}`, name: trimmedName, email: trimmedEmail },
    ]);
    setExtName("");
    setExtEmail("");
  }
```

- [ ] **Step 4: Update the hidden input and the approver list display**

In the JSX, replace the hidden input at line 134–136:

```tsx
        <input
          type="hidden"
          name="approvers"
          value={JSON.stringify(
            approvers.map((a) =>
              a.type === "user"
                ? { type: "user", profile_id: a.profile_id }
                : { type: "external", email: a.email, name: a.name }
            )
          )}
        />
```

Remove the old `approval_approver_ids` hidden input entirely.

- [ ] **Step 5: Update the approvers list render (lines 234–262)**

Replace the approvers map block:

```tsx
                <div className="space-y-1.5">
                  {approvers.map((approver, index) => (
                    <div
                      key={approver.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {approvalMode === "hierarchical" && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          Step {index + 1}
                        </Badge>
                      )}
                      {approver.type === "external" && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          External
                        </Badge>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{approver.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{approver.email}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => removeApprover(approver.key)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
```

- [ ] **Step 6: Add the External Approver input section**

After the existing "Add Approver" (internal search) block and before the closing `</CardContent>`, add:

```tsx
              <Separator />

              {/* Add External Approver */}
              <div className="space-y-1.5">
                <Label className="text-sm">Add External Approver</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Full name"
                    value={extName}
                    onChange={(e) => setExtName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={extEmail}
                    onChange={(e) => setExtEmail(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExternalApprover}
                    disabled={!extName.trim() || !extEmail.trim()}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add External
                  </Button>
                </div>
              </div>
```

- [ ] **Step 7: Build and lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/forms/form-settings-panel.tsx
git commit -m "feat: form-settings-panel supports external email approvers"
```

---

### Task 5: Update `updateFormSettings` Action

**Files:**
- Modify: `src/lib/actions/form-builder.ts` — the `updateFormSettings` function (lines 384–508)

The action currently reads `approval_approver_ids` (JSON string array of UUIDs). We change it to read `approvers` (JSON array of `{ type, profile_id?, email?, name? }` objects).

- [ ] **Step 1: Replace the approval section inside `updateFormSettings`**

Find the block starting at line 439 (`if (parsed.data.approval_enabled) {`) and replace it with:

```typescript
  if (parsed.data.approval_enabled) {
    const approvalMode =
      (formData.get("approval_mode") as "hierarchical" | "any_one" | "any_order") ?? "hierarchical";

    // New format: JSON array of { type, profile_id?, email?, name? }
    const approversRaw = formData.get("approvers") as string | null;
    type ApproverInput =
      | { type: "user"; profile_id: string }
      | { type: "external"; email: string; name: string };
    let approversInput: ApproverInput[] = [];

    if (approversRaw) {
      try {
        approversInput = JSON.parse(approversRaw);
      } catch {
        return { error: "Invalid approvers JSON" };
      }
    }

    // Upsert approval config
    const { data: existingConfig } = await supabase
      .from("form_approval_configs")
      .select("id")
      .eq("form_id", formId)
      .single();

    let configId: string;

    if (existingConfig) {
      configId = existingConfig.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("form_approval_configs")
        .update({ approval_mode: approvalMode })
        .eq("id", configId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("form_approvers")
        .delete()
        .eq("form_approval_config_id", configId);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newConfig, error: configError } = await (supabase as any)
        .from("form_approval_configs")
        .insert({ form_id: formId, approval_mode: approvalMode })
        .select("id")
        .single();

      if (configError || !newConfig) return { error: "Failed to create approval config" };
      configId = newConfig.id;
    }

    if (approversInput.length > 0) {
      const approverInserts = approversInput.map((a, index) => {
        if (a.type === "user") {
          return {
            form_approval_config_id: configId,
            profile_id: a.profile_id,
            approver_email: null,
            approver_name: null,
            step_order: index + 1,
          };
        }
        return {
          form_approval_config_id: configId,
          profile_id: null,
          approver_email: a.email,
          approver_name: a.name,
          step_order: index + 1,
        };
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("form_approvers").insert(approverInserts);
    }
  } else {
    // Remove approval config if disabled
    await supabase.from("form_approval_configs").delete().eq("form_id", formId);
  }
```

- [ ] **Step 2: Build and lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/form-builder.ts
git commit -m "feat: updateFormSettings reads new approvers JSON format, inserts external approvers"
```

---

### Task 6: Update `submitForm` — Handle External Approvers + Send Email

**Files:**
- Modify: `src/lib/actions/form-submissions.ts`

The approval section in `submitForm` currently treats all approvers as internal (`profile_id` based). We need to:

1. Fetch `approver_email` + `approver_name` from `form_approvers`
2. For external approvers: insert step with `approver_id = null`, `approver_email`, `approver_name` set. Token auto-generated by DB.
3. For external approvers: fetch the generated token, send email via `buildFormApprovalEmail`
4. For internal: existing notification logic, but only send in-app notification when `profile_id` exists

- [ ] **Step 1: Add the email import at the top of `form-submissions.ts`**

The file currently imports:
```typescript
import { sendNotification } from "@/lib/actions/notifications";
```

Add after that line:
```typescript
import { sendEmail, buildFormApprovalEmail } from "@/lib/utils/email";
import { getSystemSetting } from "@/lib/utils/settings";
```

- [ ] **Step 2: Replace the approval section in `submitForm` (lines 196–261)**

Find the comment `// Trigger new v2 approval flow if enabled` and replace the entire `if (form.approval_enabled) { ... }` block with:

```typescript
  // Trigger new v2 approval flow if enabled
  if (form.approval_enabled) {
    try {
      // Fetch approval config + approvers — admin client so public submissions can read
      const { data: approvalConfig } = await db
        .from("form_approval_configs")
        .select(
          `
          id,
          approval_mode,
          form_approvers(profile_id, approver_email, approver_name, step_order)
        `
        )
        .eq("form_id", formId)
        .single();

      if (
        approvalConfig &&
        Array.isArray(approvalConfig.form_approvers) &&
        approvalConfig.form_approvers.length > 0
      ) {
        type FormApprover = {
          profile_id: string | null;
          approver_email: string | null;
          approver_name: string | null;
          step_order: number;
        };
        const approvers: FormApprover[] = (
          approvalConfig.form_approvers as FormApprover[]
        ).sort((a, b) => a.step_order - b.step_order);

        const approvalMode: "hierarchical" | "any_one" | "any_order" =
          approvalConfig.approval_mode ?? "hierarchical";

        // Create the submission approval record
        const { data: approvalRecord } = await db
          .from("form_submission_approvals")
          .insert({
            submission_id: submissionId,
            status: "pending",
            approval_mode: approvalMode,
          })
          .select("id")
          .single();

        if (approvalRecord) {
          // Insert step records — token auto-generated by DB DEFAULT
          const stepInserts = approvers.map((a) => ({
            submission_approval_id: approvalRecord.id,
            approver_id: a.profile_id ?? null,
            approver_email: a.approver_email ?? null,
            approver_name: a.approver_name ?? null,
            step_order: a.step_order,
            status: "pending" as const,
          }));

          // Insert and get back tokens for external steps
          const { data: insertedSteps } = await db
            .from("form_submission_approval_steps")
            .insert(stepInserts)
            .select("id, approver_id, approver_email, approver_name, step_order, token");

          // Determine who to notify now:
          // hierarchical: only first; any_one + any_order: all
          const toNotify =
            approvalMode === "hierarchical"
              ? [approvers[0]]
              : approvers;

          const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";

          for (const approver of toNotify) {
            if (approver.profile_id) {
              // Internal approver — in-app notification
              await sendNotification({
                companyId: form.company_id,
                recipientId: approver.profile_id,
                type: "form_approval_requested",
                title: "Form approval requested",
                message: `A new submission for "${form.name}" requires your approval.`,
                link: `/forms/${formId}/submissions`,
              });
            } else if (approver.approver_email && insertedSteps) {
              // External approver — email with token link
              const step = (insertedSteps as Array<{
                approver_email: string | null;
                token: string;
              }>).find((s) => s.approver_email === approver.approver_email);

              if (step?.token) {
                const approvalUrl = `${appUrl}/forms/approve/${step.token}`;
                const { subject, html } = buildFormApprovalEmail({
                  approverName: approver.approver_name ?? approver.approver_email,
                  submitterName: submitterName,
                  formName: form.name,
                  approvalUrl,
                });
                await sendEmail({ to: approver.approver_email, subject, html });
              }
            }
          }
        }
      }
    } catch (err) {
      // Non-fatal: approval creation failure should not block submission
      console.warn("Form approval chain skipped:", err);
    }
  }
```

- [ ] **Step 3: Build and lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/form-submissions.ts src/lib/utils/email.ts
git commit -m "feat: submitForm sends email to external form approvers with token link"
```

---

### Task 7: Add `processFormApprovalByToken` Action

**Files:**
- Modify: `src/lib/actions/form-submissions.ts` — append new exported function

This mirrors `processFormApproval` but looks up the step by `token` using the admin client (no auth). Contains the same three-mode logic (hierarchical / any_order / any_one).

- [ ] **Step 1: Append the new action to `form-submissions.ts`**

Add after the last function in the file:

```typescript
/**
 * Process a form approval step via token — for external (non-user) approvers.
 * Uses admin client — no authentication required.
 * Identical mode logic to processFormApproval.
 */
export async function processFormApprovalByToken(
  token: string,
  decision: "approved" | "rejected",
  comment?: string
) {
  const db = getAdminClient();

  // Fetch the step by token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: step } = await (db as any)
    .from("form_submission_approval_steps")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (!step) return { error: "Approval step not found or already decided" };

  // Update this step
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .from("form_submission_approval_steps")
    .update({
      status: decision,
      comment: comment ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", step.id);

  // Fetch all steps for this approval record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allSteps } = await (db as any)
    .from("form_submission_approval_steps")
    .select("id, approver_id, step_order, status, approver_email, approver_name, token")
    .eq("submission_approval_id", step.submission_approval_id)
    .order("step_order", { ascending: true });

  // Fetch the approval record for mode + submission_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: approvalRecord } = await (db as any)
    .from("form_submission_approvals")
    .select("id, submission_id, approval_mode, status")
    .eq("id", step.submission_approval_id)
    .single();

  if (!approvalRecord || !allSteps) return { error: "Approval record not found" };

  // Fetch submission + form for notifications
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submission } = await (db as any)
    .from("form_submissions")
    .select("id, submitted_by, company_id, forms:form_id(id, name)")
    .eq("id", approvalRecord.submission_id)
    .single();

  const mode: "hierarchical" | "any_one" | "any_order" = approvalRecord.approval_mode;

  let finalStatus: "approved" | "rejected" | null = null;
  const updatedSteps = (allSteps as Array<{ id: string; status: string }>).map((s) =>
    s.id === step.id ? { ...s, status: decision } : s
  );

  if (mode === "hierarchical") {
    if (decision === "rejected") {
      finalStatus = "rejected";
    } else {
      const allApproved = updatedSteps.every((s) => s.status === "approved");
      if (allApproved) {
        finalStatus = "approved";
      } else {
        // Notify next pending approver
        const nextStep = (allSteps as Array<{
          id: string;
          status: string;
          approver_id: string | null;
          approver_email: string | null;
          approver_name: string | null;
          token: string;
        }>).find((s) => s.id !== step.id && s.status === "pending");

        if (nextStep && submission) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const form = (submission as any).forms;
          if (nextStep.approver_id) {
            await sendNotification({
              companyId: submission.company_id,
              recipientId: nextStep.approver_id,
              type: "form_approval_requested",
              title: "Form approval requested",
              message: `A new submission for "${form?.name ?? "a form"}" requires your approval.`,
              link: `/forms/${form?.id}/submissions`,
            });
          } else if (nextStep.approver_email) {
            const appUrl = (await getSystemSetting("app_url")) ?? "https://vizportal.vercel.app";
            const approvalUrl = `${appUrl}/forms/approve/${nextStep.token}`;
            const { subject, html } = buildFormApprovalEmail({
              approverName: nextStep.approver_name ?? nextStep.approver_email,
              submitterName: submission.submitted_by ?? "A respondent",
              formName: form?.name ?? "a form",
              approvalUrl,
            });
            await sendEmail({ to: nextStep.approver_email, subject, html });
          }
        }
      }
    }
  } else if (mode === "any_order") {
    if (decision === "rejected") {
      finalStatus = "rejected";
    } else {
      const allApproved = updatedSteps.every((s) => s.status === "approved");
      if (allApproved) finalStatus = "approved";
    }
  } else {
    // any_one
    if (decision === "approved") {
      finalStatus = "approved";
    } else {
      const allRejected = updatedSteps.every((s) => s.status === "rejected");
      if (allRejected) finalStatus = "rejected";
    }
  }

  if (finalStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("form_submission_approvals")
      .update({ status: finalStatus })
      .eq("id", approvalRecord.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("form_submissions")
      .update({ status: finalStatus })
      .eq("id", approvalRecord.submission_id);

    // Notify submitter (in-app only — they must be an internal user)
    if (submission?.submitted_by) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const form = (submission as any).forms;
      const actionLabel = finalStatus === "approved" ? "approved" : "rejected";
      await sendNotification({
        companyId: submission.company_id,
        recipientId: submission.submitted_by,
        type:
          finalStatus === "approved"
            ? "form_submission_approved"
            : "form_submission_rejected",
        title: `Form submission ${actionLabel}`,
        message: `Your submission for "${form?.name ?? "a form"}" has been ${actionLabel}.${comment ? ` Comment: ${comment}` : ""}`,
        link: `/forms/my-forms`,
      });
    }

    if (submission?.forms) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      revalidatePath(`/forms/${(submission.forms as any).id}/submissions`);
    }
  }

  return { success: true, finalStatus };
}
```

- [ ] **Step 2: Build and lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/form-submissions.ts
git commit -m "feat: add processFormApprovalByToken for external approver decisions"
```

---

### Task 8: Update `getMyPendingFormApprovals` — Filter to Internal Only

**Files:**
- Modify: `src/lib/actions/form-submissions.ts` — `getMyPendingFormApprovals` function (lines 424–457)

External approvers have no `approver_id` and use the token link. The pending approvals inbox is for internal users only — ensure the query explicitly filters to `approver_id = user.id` (it already does, but we add a `not.is('approver_id', null)` guard to be explicit and future-proof).

- [ ] **Step 1: Update the query in `getMyPendingFormApprovals`**

Find the `.eq("approver_id", user.id)` line inside `getMyPendingFormApprovals` and confirm it is present. Also add `.not("approver_id", "is", null)` before it for clarity. The full query should read:

```typescript
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("form_submission_approval_steps")
    .select(
      `
      *,
      form_submission_approvals(
        id,
        status,
        approval_mode,
        form_submissions(
          id,
          submitted_at,
          respondent_name,
          respondent_email,
          forms:form_id(id, name)
        )
      )
    `
    )
    .not("approver_id", "is", null)
    .eq("approver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
```

- [ ] **Step 2: Build and lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/form-submissions.ts
git commit -m "fix: getMyPendingFormApprovals explicitly filters to internal approvers only"
```

---

### Task 9: Public Approval Client Component

**Files:**
- Create: `src/components/forms/form-approval-public-page.tsx`

This is a client component that renders form submission data + approve/reject form. It mirrors `src/components/approvals/approval-public-page.tsx` but for form submissions.

- [ ] **Step 1: Create the client component**

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { processFormApprovalByToken } from "@/lib/actions/form-submissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock } from "lucide-react";

type FormApprovalPublicPageProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  step: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submissionData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formDef: any;
  token: string;
};

async function handleDecision(
  _prevState: { error: string } | { success: boolean } | null,
  formData: FormData
) {
  const token = formData.get("token") as string;
  const decision = formData.get("decision") as "approved" | "rejected";
  const comment = (formData.get("comment") as string) || undefined;
  return processFormApprovalByToken(token, decision, comment);
}

export function FormApprovalPublicPage({
  step,
  submissionData,
  formDef,
  token,
}: FormApprovalPublicPageProps) {
  const [state, formAction, isPending] = useActionState(handleDecision, null);
  const [decided, setDecided] = useState(step.status !== "pending");

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Decision recorded successfully");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDecided(true);
    }
    if (state && "error" in state) toast.error((state as { error: string }).error);
  }, [state]);

  if (decided && step.status !== "pending") {
    return (
      <Card>
        <CardHeader className="text-center">
          {step.status === "approved" ? (
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          ) : (
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
          )}
          <CardTitle>Already Decided</CardTitle>
          <CardDescription>
            This request was {step.status}
            {step.decided_at ? ` on ${new Date(step.decided_at).toLocaleDateString()}` : ""}.
          </CardDescription>
        </CardHeader>
        {step.comment && (
          <CardContent>
            <p className="text-sm text-muted-foreground">Comment: {step.comment}</p>
          </CardContent>
        )}
      </Card>
    );
  }

  if (decided) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <CardTitle>Decision Recorded</CardTitle>
          <CardDescription>Thank you for your response.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Build a readable list of submitted field values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Array<{ label: string; value: string }> = [];
  if (formDef && Array.isArray(formDef.form_sections)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const section of formDef.form_sections as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const field of (section.form_fields ?? []) as any[]) {
        const value = submissionData?.[field.id];
        if (value !== undefined && value !== null && value !== "") {
          fields.push({ label: field.label, value: String(value) });
        }
      }
    }
  }

  const submitterLabel =
    submissionData?.respondent_name ??
    (step.form_submission_approvals?.form_submissions?.respondent_name ?? "Anonymous");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{formDef?.name ?? "Form Submission"}</CardTitle>
        </div>
        <CardDescription>
          Submitted by <strong>{submitterLabel}</strong>
        </CardDescription>
        <Badge variant="outline" className="w-fit">Pending your approval</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length > 0 && (
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Submitted Data</p>
            {fields.map((f) => (
              <div key={f.label} className="text-sm">
                <span className="font-medium">{f.label}:</span>{" "}
                <span className="text-muted-foreground">{f.value}</span>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea id="comment" name="comment" placeholder="Add a comment..." rows={3} />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              name="decision"
              value="approved"
              className="flex-1"
              disabled={isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              type="submit"
              name="decision"
              value="rejected"
              variant="destructive"
              className="flex-1"
              disabled={isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Build and lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/form-approval-public-page.tsx
git commit -m "feat: add FormApprovalPublicPage client component for external approvers"
```

---

### Task 10: Public Approval Page (Server Component + Route)

**Files:**
- Create: `src/app/forms/approve/[token]/page.tsx`
- Modify: `src/proxy.ts`

The page fetches data server-side using the admin client (no auth) and renders the client component. It also handles "not found" and "already decided" states gracefully.

- [ ] **Step 1: Create the directory and page file**

```bash
mkdir -p /Users/m3n6/ClaudeGravity/vizportal/src/app/forms/approve/[token]
```

Then create `src/app/forms/approve/[token]/page.tsx`:

```tsx
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { FormApprovalPublicPage } from "@/components/forms/form-approval-public-page";

type Params = Promise<{ token: string }>;

/** Admin client — bypasses RLS, for public token-based page */
function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function FormApproveTokenPage({ params }: { params: Params }) {
  const { token } = await params;
  const db = getAdminClient();

  // Fetch the step by token, joining up through submission to form definition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: step } = await (db as any)
    .from("form_submission_approval_steps")
    .select(
      `
      *,
      form_submission_approvals(
        id,
        status,
        approval_mode,
        form_submissions(
          id,
          data,
          respondent_name,
          respondent_email,
          submitted_by,
          forms:form_id(
            id,
            name,
            form_sections(
              id,
              name,
              position,
              form_fields(id, label, position)
            )
          )
        )
      )
    `
    )
    .eq("token", token)
    .single();

  if (!step) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvalRecord = (step as any).form_submission_approvals;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submission = approvalRecord?.form_submissions as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formDef = submission?.forms as any;

  // Sort sections and fields by position
  if (formDef?.form_sections && Array.isArray(formDef.form_sections)) {
    formDef.form_sections.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
    for (const section of formDef.form_sections) {
      if (Array.isArray(section.form_fields)) {
        section.form_fields.sort(
          (a: { position: number }, b: { position: number }) => a.position - b.position
        );
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <FormApprovalPublicPage
          step={step}
          submissionData={submission?.data ?? {}}
          formDef={formDef}
          token={token}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `/forms/approve/` to PUBLIC_ROUTES in `src/proxy.ts`**

Replace the current line:
```typescript
const PUBLIC_ROUTES = ["/login", "/set-password", "/approvals/", "/forms/public/"];
```

With:
```typescript
const PUBLIC_ROUTES = ["/login", "/set-password", "/approvals/", "/forms/public/", "/forms/approve/"];
```

- [ ] **Step 3: Build and lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run build 2>&1 | tail -30 && npm run lint 2>&1 | tail -10
```

Expected: no errors. The new route `/forms/approve/[token]` appears in the build output as `ƒ (Dynamic)`.

- [ ] **Step 4: Commit**

```bash
git add src/app/forms/approve/[token]/page.tsx src/proxy.ts
git commit -m "feat: add public /forms/approve/[token] page for external form approvers"
```

---

### Task 11: Final Build, Deploy, and Verify

- [ ] **Step 1: Full build + lint**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npm run build && npm run lint
```

Expected: both pass clean.

- [ ] **Step 2: Push migration to Supabase (if not yet pushed)**

```bash
npx supabase db push
```

- [ ] **Step 3: Deploy to Vercel production**

```bash
export PATH="/Users/m3n6/.local/node/bin:$PATH" && npx --yes vercel --prod --yes
```

Note the deployment URL from the output.

- [ ] **Step 4: Smoke-test externally** (manual)

  1. Open a form in Settings → add an external approver (name + email)
  2. Submit the form
  3. Check the approver email for the token link
  4. Open the link — confirm form data preview + approve/reject UI is visible without login
  5. Approve → confirm submitter receives in-app notification + submission status updates
  6. Try the same link again → confirm "Already Decided" state

- [ ] **Step 5: Final commit summary**

```bash
git log --oneline -10
```

---

## Self-Review Against Spec

| Spec Requirement | Covered by Task |
|---|---|
| Migration `00058_external_form_approvers.sql` | Task 1 |
| `form_approvers` type changes | Task 2 |
| `form_submission_approval_steps` type changes (+ token) | Task 2 |
| Form Settings Panel UI — external approver input | Task 4 |
| Hidden input format change to `approvers` JSON objects | Task 4 |
| `updateFormSettings` reads new format | Task 5 |
| `submitForm` — external step creation + email | Task 6 |
| `buildFormApprovalEmail` helper | Task 3 |
| `processFormApprovalByToken` new action | Task 7 |
| `getMyPendingFormApprovals` internal-only filter | Task 8 |
| `/forms/approve/[token]` public page | Task 10 |
| `FormApprovalPublicPage` client component | Task 9 |
| `/forms/approve/` added to PUBLIC_ROUTES | Task 10 |
| Deploy to prod | Task 11 |
