"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { formatFullName } from "@/lib/utils/format";

type User = { id: string; first_name: string | null; last_name: string | null };

type RelieverInputProps = {
  index: number;
  users: User[];
  onRemove: () => void;
  canRemove: boolean;
};

export function RelieverInput({ index, users, onRemove, canRemove }: RelieverInputProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = search.length > 0
    ? users.filter((u) =>
        formatFullName(u.first_name, u.last_name).toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : [];

  function handleSelect(user: User) {
    setSelectedId(user.id);
    setSearch(formatFullName(user.first_name, user.last_name));
    setShowSuggestions(false);
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Reliever {index + 1}</Label>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <input type="hidden" name={`reliever_id_${index}`} value={selectedId} />
      <div className="relative">
        <Input
          placeholder="Search employee..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowSuggestions(true);
            if (!e.target.value) setSelectedId("");
          }}
          onFocus={() => { if (search.length > 0) setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(u)}
              >
                {formatFullName(u.first_name, u.last_name)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tasks to hand over</Label>
        <Textarea name={`reliever_tasks_${index}`} placeholder="List tasks for this reliever..." rows={2} required />
      </div>
    </div>
  );
}
