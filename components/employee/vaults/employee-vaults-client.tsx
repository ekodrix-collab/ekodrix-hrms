"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getVaultCatalogAction } from "@/actions/vaults";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, ShieldCheck, Users } from "lucide-react";

type VaultScope = "project" | "common";

interface CatalogVault {
  id: string;
  name: string;
  description: string | null;
  vault_scope: VaultScope;
  project_id: string | null;
  project_name: string | null;
  member_count: number;
  entry_count: number;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
}

interface CatalogData {
  role: "admin" | "employee";
  organizationId: string | null;
  vaults: CatalogVault[];
}

interface EmployeeVaultsClientProps {
  initialCatalog: CatalogData | null;
}

export function EmployeeVaultsClient({ initialCatalog }: EmployeeVaultsClientProps) {
  const { data } = useQuery({
    queryKey: ["vault-catalog"],
    queryFn: async () => {
      const res = await getVaultCatalogAction();
      return res.ok ? (res.data as CatalogData) : null;
    },
    initialData: initialCatalog,
  });

  const vaults = data?.vaults ?? [];
  const commonVaults = vaults.filter((vault) => vault.vault_scope === "common");
  const projectVaults = vaults.filter((vault) => vault.vault_scope === "project");

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Vault Access</CardTitle>
          <CardDescription>
            View and update vaults where you were granted access. Edit rights depend on admin permissions.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-base">Common Vault</CardTitle>
          <CardDescription>Shared references used across the organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {commonVaults.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No common vault has been shared with you.
            </p>
          ) : (
            commonVaults.map((vault) => (
              <div key={vault.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{vault.name}</p>
                  <Badge variant={vault.can_edit ? "default" : "outline"}>
                    {vault.can_edit ? "Edit" : "View"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{vault.description ?? "No description"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {vault.member_count} members
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5" />
                    {vault.entry_count} entries
                  </span>
                </div>
                <div className="mt-4">
                  <Link href={`/employee/vaults/${vault.id}`}>
                    <Button variant="outline" className="w-full">
                      Open Common Vault
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-base">Project Vaults</CardTitle>
          <CardDescription>Project-level credentials and references shared with you.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {projectVaults.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No project vaults are currently assigned to your account.
            </p>
          ) : (
            projectVaults.map((vault) => (
              <div key={vault.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{vault.project_name ?? vault.name}</p>
                  <Badge variant={vault.can_edit ? "default" : "outline"}>
                    {vault.can_edit ? "Edit" : "View"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{vault.description ?? "No description"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {vault.member_count} members
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5" />
                    {vault.entry_count} entries
                  </span>
                </div>
                <div className="mt-4">
                  <Link href={`/employee/vaults/${vault.id}`}>
                    <Button variant="outline" className="w-full">
                      Open Vault
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
