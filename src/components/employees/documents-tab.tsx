"use client";

import { useState } from "react";
import { uploadDocument, deleteDocument } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Upload, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { EmployeeDocument } from "@/types";

type DocumentsTabProps = {
  profileId: string;
  documents: EmployeeDocument[];
  canUpload: boolean;
  canDelete: boolean;
};

export function DocumentsTab({
  profileId,
  documents,
  canUpload,
  canDelete,
}: DocumentsTabProps) {
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(formData: FormData) {
    setIsUploading(true);
    formData.append("profile_id", profileId);
    const result = await uploadDocument(formData);
    setIsUploading(false);
    if (result.error) toast.error(result.error);
    else toast.success("Document uploaded");
  }

  async function handleDelete(id: string, fileUrl: string) {
    if (!confirm("Delete this document?")) return;
    const result = await deleteDocument(id, fileUrl);
    if (result.error) toast.error(result.error);
    else toast.success("Document deleted");
  }

  return (
    <div className="space-y-6">
      {canUpload && (
        <form action={handleUpload} className="space-y-4 rounded-lg border p-4">
          <h4 className="font-medium">Upload Document</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select name="document_type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" required />
            </div>
          </div>
          <Button type="submit" disabled={isUploading} size="sm">
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No documents
                </TableCell>
              </TableRow>
            )}
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  {DOCUMENT_TYPES.find((dt) => dt.value === doc.document_type)?.label ?? doc.document_type}
                </TableCell>
                <TableCell>{doc.file_name}</TableCell>
                <TableCell>{formatDate(doc.created_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id, doc.file_url)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
