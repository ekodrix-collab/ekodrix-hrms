import { Metadata } from "next";
import { getVaultCatalogAction, getVaultSetupDataAction } from "@/actions/vaults";
import { AdminVaultsClient } from "@/components/admin/vaults/admin-vaults-client";

export const metadata: Metadata = {
  title: "Vaults | Admin",
  description: "Manage project and common vaults for shared credentials and documents.",
};

export default async function AdminVaultsPage() {
  const [catalogRes, setupRes] = await Promise.all([getVaultCatalogAction(), getVaultSetupDataAction()]);
  const catalogData = catalogRes.ok && catalogRes.data ? catalogRes.data : null;
  const setupData = setupRes.ok && setupRes.data ? setupRes.data : null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <AdminVaultsClient initialCatalog={catalogData} initialSetup={setupData} />
    </div>
  );
}
