import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_NAMES } from "@/lib/constants";
import type { Role } from "@/types";

type RoleTableProps = { roles: Role[] };

export function RoleTable({ roles }: RoleTableProps) {
  return (
    <div>
      <h3 className="mb-4 text-lg font-medium">Roles</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No roles defined
                </TableCell>
              </TableRow>
            )}
            {roles.map((role) => (
              <TableRow key={role.id} className="row-hover">
                <TableCell className="font-medium">
                  {ROLE_NAMES[role.name as keyof typeof ROLE_NAMES] ?? role.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {role.description ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
