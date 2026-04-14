"use client";

import { useState } from "react";
import { updateContributionRow, updateTaxBracketRow } from "@/lib/actions/contribution-tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import type { PhContributionTable, PhTaxBracket } from "@/types";

type ContributionTablesEditorProps = {
  sssBrackets: PhContributionTable[];
  philhealthBrackets: PhContributionTable[];
  pagibigBrackets: PhContributionTable[];
  taxBrackets: PhTaxBracket[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type ContributionRowEditorProps = {
  row: PhContributionTable;
};

function ContributionRowEditor({ row }: ContributionRowEditorProps) {
  const [empShare, setEmpShare] = useState(String(row.employee_share));
  const [erShare, setErShare] = useState(String(row.employer_share));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateContributionRow(row.id, Number(empShare), Number(erShare));
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success("Row updated");
  }

  return (
    <TableRow className="row-hover">
      <TableCell className="font-mono text-sm">
        {formatCurrency(row.salary_from)} – {formatCurrency(row.salary_to)}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={empShare}
          onChange={(e) => setEmpShare(e.target.value)}
          className="w-28 h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={erShare}
          onChange={(e) => setErShare(e.target.value)}
          className="w-28 h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

type TaxRowEditorProps = {
  row: PhTaxBracket;
};

function TaxRowEditor({ row }: TaxRowEditorProps) {
  const [taxRate, setTaxRate] = useState(String(row.tax_rate));
  const [baseTax, setBaseTax] = useState(String(row.base_tax));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateTaxBracketRow(row.id, Number(taxRate), Number(baseTax));
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success("Row updated");
  }

  return (
    <TableRow className="row-hover">
      <TableCell className="font-mono text-sm">
        {formatCurrency(row.compensation_from)} – {formatCurrency(row.compensation_to)}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.001"
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          className="w-24 h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={baseTax}
          onChange={(e) => setBaseTax(e.target.value)}
          className="w-28 h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
        No data for this year
      </TableCell>
    </TableRow>
  );
}

export function ContributionTablesEditor({
  sssBrackets,
  philhealthBrackets,
  pagibigBrackets,
  taxBrackets,
}: ContributionTablesEditorProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <div>
            <CardTitle className="text-base">PH Contribution &amp; Tax Tables</CardTitle>
            <CardDescription className="mt-1">
              SSS, PhilHealth, Pag-IBIG contribution brackets and BIR withholding tax brackets for 2025.
              Rows are editable inline.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sss">
          <TabsList className="mb-4">
            <TabsTrigger value="sss">SSS</TabsTrigger>
            <TabsTrigger value="philhealth">PhilHealth</TabsTrigger>
            <TabsTrigger value="pagibig">Pag-IBIG</TabsTrigger>
            <TabsTrigger value="tax">Tax</TabsTrigger>
          </TabsList>

          {/* SSS */}
          <TabsContent value="sss">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salary Range</TableHead>
                    <TableHead>Employee Share (₱)</TableHead>
                    <TableHead>Employer Share (₱)</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sssBrackets.length === 0 ? (
                    <EmptyRow colSpan={4} />
                  ) : (
                    sssBrackets.map((row) => (
                      <ContributionRowEditor key={row.id} row={row} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* PhilHealth */}
          <TabsContent value="philhealth">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salary Range</TableHead>
                    <TableHead>Employee Share (₱)</TableHead>
                    <TableHead>Employer Share (₱)</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {philhealthBrackets.length === 0 ? (
                    <EmptyRow colSpan={4} />
                  ) : (
                    philhealthBrackets.map((row) => (
                      <ContributionRowEditor key={row.id} row={row} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Pag-IBIG */}
          <TabsContent value="pagibig">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salary Range</TableHead>
                    <TableHead>Employee Share (₱)</TableHead>
                    <TableHead>Employer Share (₱)</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagibigBrackets.length === 0 ? (
                    <EmptyRow colSpan={4} />
                  ) : (
                    pagibigBrackets.map((row) => (
                      <ContributionRowEditor key={row.id} row={row} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Tax */}
          <TabsContent value="tax">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compensation Range</TableHead>
                    <TableHead>Tax Rate</TableHead>
                    <TableHead>Base Tax (₱)</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxBrackets.length === 0 ? (
                    <EmptyRow colSpan={4} />
                  ) : (
                    taxBrackets.map((row) => (
                      <TaxRowEditor key={row.id} row={row} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
