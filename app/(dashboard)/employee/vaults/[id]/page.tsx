import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVaultDetailAction } from "@/actions/vaults";
import { VaultDetailClient } from "@/components/vaults/vault-detail-client";

export const metadata: Metadata = {
  title: "Vault Workspace | Employee",
  description: "View and manage entries in vaults where you have access.",
};

export default async function EmployeeVaultDetailPage({ params }: { params: { id: string } }) {
  const detailRes = await getVaultDetailAction(params.id);

  if (!detailRes.ok || !detailRes.data) {
    return notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <VaultDetailClient vaultId={params.id} basePath="/employee/vaults" initialData={detailRes.data} />
    </div>
  );
}
