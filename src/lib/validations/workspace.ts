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
