"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users, List, Folder } from "lucide-react";

type FolderCardProps = {
  folder: {
    id: string;
    name: string;
    icon: string;
    color: string;
    memberCount: number;
    listCount: number;
  };
};

export function FolderCard({ folder }: FolderCardProps) {
  return (
    <Link href={`/workspace/folders/${folder.id}`}>
      <Card className="card-hover relative overflow-hidden cursor-pointer">
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
          style={{ backgroundColor: folder.color }}
        />
        <CardContent className="pl-5 py-4">
          <div className="flex items-start gap-3">
            <Folder className="h-6 w-6 shrink-0 mt-0.5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{folder.name}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {folder.memberCount} member{folder.memberCount !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <List className="h-3 w-3" />
                  {folder.listCount} list{folder.listCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
