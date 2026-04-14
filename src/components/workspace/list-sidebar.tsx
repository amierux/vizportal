"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ListCreateDialog } from "./list-create-dialog";
import { List } from "lucide-react";

type WorkspaceList = {
  id: string;
  name: string;
};

type ListSidebarProps = {
  lists: WorkspaceList[];
  folderId: string;
  folderName?: string;
  activeListId?: string;
  templates?: { id: string; name: string }[];
};

export function ListSidebar({
  lists,
  folderId,
  folderName,
  activeListId,
  templates = [],
}: ListSidebarProps) {
  return (
    <aside className="w-56 shrink-0 flex flex-col border-r bg-muted/20 min-h-full">
      {folderName && (
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {folderName}
          </p>
        </div>
      )}
      <nav className="flex-1 py-2 overflow-y-auto">
        {lists.length === 0 && (
          <p className="px-4 py-2 text-xs text-muted-foreground">No lists yet</p>
        )}
        {lists.map((list) => (
          <Link
            key={list.id}
            href={`/workspace/folders/${folderId}/lists/${list.id}`}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted",
              activeListId === list.id
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground"
            )}
          >
            <List className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{list.name}</span>
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <ListCreateDialog folderId={folderId} templates={templates} />
      </div>
    </aside>
  );
}
