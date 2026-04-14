"use client";

import { useRef, useTransition } from "react";
import { addAttachment, deleteAttachment } from "@/lib/actions/workspace-tasks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDate, formatFullName } from "@/lib/utils/format";
import { Paperclip, Trash2, Download, Upload } from "lucide-react";

type Attachment = {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type TaskAttachmentsProps = {
  attachments: Attachment[];
  taskId: string;
};

export function TaskAttachments({ attachments, taskId }: TaskAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await addAttachment(taskId, formData);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("File uploaded");
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDelete(attachmentId: string) {
    startTransition(async () => {
      const result = await deleteAttachment(attachmentId);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Attachment removed");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-xs font-normal">({attachments.length})</span>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={isPending}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {isPending ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No attachments yet.</p>
      )}

      <div className="space-y-1.5">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm bg-muted/20"
          >
            <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{att.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {att.profiles
                  ? formatFullName(att.profiles.first_name, att.profiles.last_name)
                  : "Unknown"}{" "}
                · {formatDate(att.created_at)}
              </p>
            </div>
            <a href={att.file_url} target="_blank" rel="noopener noreferrer" download={att.file_name}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => handleDelete(att.id)}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
