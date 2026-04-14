"use client";

import { useActionState, useEffect, useRef } from "react";
import { addRemark } from "@/lib/actions/workspace-tasks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatFullName } from "@/lib/utils/format";
import { MessageCircle } from "lucide-react";

type Remark = {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

type TaskRemarksProps = {
  remarks: Remark[];
  taskId: string;
};

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TaskRemarks({ remarks, taskId }: TaskRemarksProps) {
  const [state, formAction, isPending] = useActionState(addRemark, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        Remarks
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {remarks.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No remarks yet.</p>
        )}
        {remarks.map((remark) => (
          <div key={remark.id} className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium overflow-hidden">
              {remark.profiles?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={remark.profiles.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {(remark.profiles?.first_name?.[0] ?? "") +
                    (remark.profiles?.last_name?.[0] ?? "")}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">
                  {remark.profiles
                    ? formatFullName(remark.profiles.first_name, remark.profiles.last_name)
                    : "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getRelativeTime(remark.created_at)}
                </span>
              </div>
              <p className="text-sm text-foreground mt-0.5 break-words">{remark.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Remark */}
      <form ref={formRef} action={formAction} className="flex gap-2">
        <input type="hidden" name="task_id" value={taskId} />
        <textarea
          name="content"
          placeholder="Write a remark..."
          required
          rows={2}
          className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
        />
        <Button type="submit" size="sm" disabled={isPending} className="self-end">
          {isPending ? "Adding..." : "Add"}
        </Button>
      </form>
    </div>
  );
}
