"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
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
    <aside className="w-64 shrink-0 border-r bg-card flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Workspace</h2>
        {canCreateFolder && <FolderCreateDialog />}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {folders.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No folders yet.</p>
        ) : (
          folders.map((folder) => {
            const isExpanded = expanded.has(folder.id);
            const isActive = activeFolderId === folder.id;
            return (
              <div key={folder.id}>
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1.5 text-sm group hover:bg-accent",
                    isActive && !activeListId && "bg-accent"
                  )}
                >
                  <button
                    onClick={() => toggle(folder.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <Link
                    href={`/workspace/folders/${folder.id}`}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <span className="text-base">{folder.icon ?? "📁"}</span>
                    <span className="truncate font-medium">{folder.name}</span>
                  </Link>
                </div>
                {isExpanded && (
                  <div className="ml-5 border-l pl-2 mt-0.5 space-y-0.5">
                    {folder.lists.map((list) => (
                      <Link
                        key={list.id}
                        href={`/workspace/folders/${folder.id}/lists/${list.id}`}
                        className={cn(
                          "block rounded-md px-2 py-1 text-sm hover:bg-accent",
                          activeListId === list.id && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        {list.name}
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
