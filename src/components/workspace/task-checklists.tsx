"use client";

import { useState, useTransition } from "react";
import {
  addChecklist,
  addChecklistFromTemplate,
  toggleChecklistItem,
  addChecklistItem,
  deleteChecklistItem,
  deleteChecklist,
} from "@/lib/actions/workspace-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckSquare, Plus, Trash2, X } from "lucide-react";

type ChecklistItem = {
  id: string;
  name: string;
  is_checked: boolean;
  position: number;
  assignee_id?: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Checklist = {
  id: string;
  name: string;
  workspace_checklist_items: ChecklistItem[];
};

type ChecklistTemplate = {
  id: string;
  name: string;
};

type TaskChecklistsProps = {
  checklists: Checklist[];
  taskId: string;
  checklistTemplates?: ChecklistTemplate[];
};

export function TaskChecklists({
  checklists,
  taskId,
  checklistTemplates = [],
}: TaskChecklistsProps) {
  const [isPending, startTransition] = useTransition();
  const [newChecklistName, setNewChecklistName] = useState("");
  const [addItemInputs, setAddItemInputs] = useState<Record<string, string>>({});
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  function handleAddChecklist() {
    if (!newChecklistName.trim()) return;
    startTransition(async () => {
      const result = await addChecklist(taskId, newChecklistName.trim());
      if (result && "error" in result) toast.error(result.error);
      else {
        toast.success("Checklist added");
        setNewChecklistName("");
        setShowAddChecklist(false);
      }
    });
  }

  function handleAddFromTemplate() {
    if (!selectedTemplate) return;
    startTransition(async () => {
      const result = await addChecklistFromTemplate(taskId, selectedTemplate);
      if (result && "error" in result) toast.error(result.error);
      else {
        toast.success("Checklist added from template");
        setSelectedTemplate("");
        setShowAddChecklist(false);
      }
    });
  }

  function handleToggleItem(itemId: string, currentChecked: boolean) {
    startTransition(async () => {
      const result = await toggleChecklistItem(itemId, !currentChecked);
      if (result && "error" in result) toast.error(result.error);
    });
  }

  function handleAddItem(checklistId: string) {
    const name = addItemInputs[checklistId]?.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await addChecklistItem(checklistId, name);
      if (result && "error" in result) toast.error(result.error);
      else {
        setAddItemInputs((prev) => ({ ...prev, [checklistId]: "" }));
      }
    });
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => {
      const result = await deleteChecklistItem(itemId);
      if (result && "error" in result) toast.error(result.error);
    });
  }

  function handleDeleteChecklist(checklistId: string) {
    startTransition(async () => {
      const result = await deleteChecklist(checklistId);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Checklist removed");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <CheckSquare className="h-4 w-4" />
        Checklists
      </div>

      {/* Existing checklists */}
      {checklists.map((cl) => {
        const items = cl.workspace_checklist_items.slice().sort((a, b) => a.position - b.position);
        const total = items.length;
        const checked = items.filter((i) => i.is_checked).length;
        const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

        return (
          <div key={cl.id} className="space-y-2 border rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cl.name}</p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {checked}/{total}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteChecklist(cl.id)}
                disabled={isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Items */}
            <div className="space-y-1.5 mt-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => handleToggleItem(item.id, item.is_checked)}
                    className="h-4 w-4 cursor-pointer rounded"
                    disabled={isPending}
                  />
                  <span
                    className={`flex-1 text-sm ${item.is_checked ? "line-through text-muted-foreground" : ""}`}
                  >
                    {item.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add item to this checklist */}
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add item..."
                value={addItemInputs[cl.id] ?? ""}
                onChange={(e) =>
                  setAddItemInputs((prev) => ({ ...prev, [cl.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddItem(cl.id);
                  }
                }}
                className="h-7 text-sm"
                disabled={isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleAddItem(cl.id)}
                disabled={isPending || !addItemInputs[cl.id]?.trim()}
                className="h-7 px-2"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}

      {/* Add Checklist Section */}
      {showAddChecklist ? (
        <div className="space-y-3 border rounded-md p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Checklist name"
              value={newChecklistName}
              onChange={(e) => setNewChecklistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddChecklist();
                }
              }}
              className="flex-1"
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddChecklist}
              disabled={isPending || !newChecklistName.trim()}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddChecklist(false);
                setNewChecklistName("");
                setSelectedTemplate("");
              }}
            >
              Cancel
            </Button>
          </div>
          {checklistTemplates.length > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground shrink-0">Or from template:</span>
              <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v ?? "")}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {checklistTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFromTemplate}
                disabled={!selectedTemplate || isPending}
                className="h-8"
              >
                Use
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAddChecklist(true)}
          className="text-muted-foreground"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Checklist
        </Button>
      )}
    </div>
  );
}
