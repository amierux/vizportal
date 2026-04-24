"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DeptStats = {
  department: string;
  attendanceRate: number;
  lateRate: number;
  taskCompletion: number;
};

type Props = {
  data: DeptStats[];
};

export function DepartmentComparisonWidget({ data }: Props) {
  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Department Comparison</p>
      </div>
      <div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Bar dataKey="attendanceRate" name="Attendance Rate" fill="#22c55e" radius={2} />
              <Bar dataKey="lateRate" name="Late Rate" fill="#eab308" radius={2} />
              <Bar dataKey="taskCompletion" name="Task Completion" fill="#6366f1" radius={2} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
