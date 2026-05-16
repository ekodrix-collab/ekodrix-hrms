import { getEmployeeById } from "@/actions/employees";
import { EmployeeDetailsTabs } from "@/components/admin/employees/employee-details-tabs";
import { notFound } from "next/navigation";

export default async function EmployeeDetailsPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const { profile, error } = await getEmployeeById(id);

    if (error || !profile) {
        return notFound();
    }

    return <EmployeeDetailsTabs employeeId={id} profile={profile} />;
}
