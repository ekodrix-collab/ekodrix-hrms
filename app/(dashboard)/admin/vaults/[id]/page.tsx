import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVaultDetailAction, getVaultSetupDataAction } from "@/actions/vaults";
import { VaultDetailClient } from "@/components/vaults/vault-detail-client";

export const metadata: Metadata = {
  title: "Vault Workspace | Admin",
  description: "Manage vault entries and member access.",
};

export default async function AdminVaultDetailPage({ params }: { params: { id: string } }) {
  const [detailRes, setupRes] = await Promise.all([
    getVaultDetailAction(params.id),
    getVaultSetupDataAction(),
  ]);
  const memberOptions = setupRes.ok && setupRes.data ? setupRes.data.employees : [];

  if (!detailRes.ok || !detailRes.data) {
    return notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <VaultDetailClient
        vaultId={params.id}
        basePath="/admin/vaults"
        initialData={detailRes.data}
        memberOptions={memberOptions}
      />
    </div>
  );
}
