import { redirect } from "next/navigation";

export default function LeaveSettingsRedirect() {
  redirect("/settings/employees");
}
