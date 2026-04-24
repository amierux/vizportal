"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, Folder, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderCreateDialog } from "@/components/workspace/folder-create-dialog";
import { ListCreateDialog } from "@/components/workspace/list-create-dialog";

type ListItem = { id: string; name: string };
type FolderItem = { id: string; name: string; icon: string; color: string; lists: ListItem[] };

type Props = {
  folders: FolderItem[];
  canCreateFolder: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listTemplates: any[];
};

export function FolderTreeSidebar({ folders, canCreateFolder, listTemplates }: Props) {
  const pathname = usePathname();
  // Auto-expand folder if currently inside it
  const activeFolderId = pathname.match(/\/folders\/([^/]+)/)?.[1];
  const activeListId = pathname.match(/\/lists\/([^/]+)/)?.[1];
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(activeFolderId ? [activeFolderId] : [])
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="w-64 shrink-0 border-r bg-sidebar flex flex-col h-full">
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        <h2 className="text-sm font-semibold tracking-wide text-sidebar-foreground">Workspace</h2>
        {canCreateFolder && <FolderCreateDialog />}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {folders.length === 0 ? (
          <p className="px-3 py-3 text-xs text-sidebar-foreground/50">No folders yet.</p>
        ) : (
          folders.map((folder) => {
            const isExpanded = expanded.has(folder.id);
            const isActive = activeFolderId === folder.id;
            return (
              <div key={folder.id}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out cursor-pointer",
                    isActive && !activeListId
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <button
                    onClick={() => toggle(folder.id)}
                    className="shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <Link
                    href={`/workspace/folders/${folder.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Folder className="h-5 w-5 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </Link>
                </div>
                {isExpanded && (
                  <div className="ml-6 border-l border-sidebar-border pl-3 mt-0.5 space-y-0.5">
                    {folder.lists.map((list) => (
                      <Link
                        key={list.id}
                        href={`/workspace/folders/${folder.id}/lists/${list.id}`}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out",
                          activeListId === list.id
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <List className="h-4 w-4 shrink-0" />
                        <span className="truncate">{list.name}</span>
                      </Link>
                    ))}
                    <ListCreateDialog folderId={folder.id} templates={listTemplates} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
