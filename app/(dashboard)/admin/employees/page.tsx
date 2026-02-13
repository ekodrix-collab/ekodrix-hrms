import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getOrganizationEmployees } from "@/actions/invitations";
import { EmployeeList } from "@/components/admin/employee-list";

export default async function AdminEmployeesPage() {
  const { employees, error } = await getOrganizationEmployees();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization&apos;s employees and invitations.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/employees/invite">
            <Plus className="mr-2 h-4 w-4" />
            Invite Employee
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 p-4 text-center text-sm text-destructive bg-destructive/5">
          {error}
        </div>
      ) : (
        <EmployeeList employees={employees} />
      )}
    </div>
  );
}

