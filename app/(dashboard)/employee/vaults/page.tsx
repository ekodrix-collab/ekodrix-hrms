import { Metadata } from "next";
import { getVaultCatalogAction } from "@/actions/vaults";
import { EmployeeVaultsClient } from "@/components/employee/vaults/employee-vaults-client";

export const metadata: Metadata = {
  title: "Vaults | Employee",
  description: "Access shared project and common vault resources.",
};

export default async function EmployeeVaultsPage() {
  const catalogRes = await getVaultCatalogAction();
  const catalogData = catalogRes.ok && catalogRes.data ? catalogRes.data : null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <EmployeeVaultsClient initialCatalog={catalogData} />
    </div>
  );
}
