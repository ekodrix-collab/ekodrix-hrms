"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createVaultAction, getVaultCatalogAction, getVaultSetupDataAction } from "@/actions/vaults";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyRound, Plus, Shield, Users } from "lucide-react";

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

interface ProjectOption {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface EmployeeOption {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  department: string | null;
  role: string | null;
}

interface SetupData {
  projects: ProjectOption[];
  employees: EmployeeOption[];
}

interface AccessConfig {
  enabled: boolean;
  canEdit: boolean;
}

interface AdminVaultsClientProps {
  initialCatalog: CatalogData | null;
  initialSetup: SetupData | null;
}

const EMPTY_SETUP: SetupData = {
  projects: [],
  employees: [],
};

export function AdminVaultsClient({ initialCatalog, initialSetup }: AdminVaultsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<VaultScope>("project");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessMap, setAccessMap] = useState<Record<string, AccessConfig>>({});

  const { data: catalogData } = useQuery({
    queryKey: ["vault-catalog"],
    queryFn: async () => {
      const res = await getVaultCatalogAction();
      return res.ok ? (res.data as CatalogData) : null;
    },
    initialData: initialCatalog,
  });

  const { data: setupData = EMPTY_SETUP } = useQuery({
    queryKey: ["vault-setup"],
    queryFn: async () => {
      const res = await getVaultSetupDataAction();
      return res.ok ? (res.data as SetupData) : EMPTY_SETUP;
    },
    initialData: initialSetup ?? EMPTY_SETUP,
  });

  useEffect(() => {
    const next: Record<string, AccessConfig> = {};
    setupData.employees.forEach((employee) => {
      next[employee.id] = { enabled: false, canEdit: false };
    });
    setAccessMap(next);
  }, [setupData.employees]);

  const vaults = useMemo(() => catalogData?.vaults ?? [], [catalogData]);
  const commonVault = vaults.find((vault) => vault.vault_scope === "common") ?? null;
  const projectVaultMap = useMemo(() => {
    const map = new Map<string, CatalogVault>();
    vaults
      .filter((vault) => vault.vault_scope === "project" && vault.project_id)
      .forEach((vault) => {
        if (vault.project_id) map.set(vault.project_id, vault);
      });
    return map;
  }, [vaults]);

  const projectsWithVault = setupData.projects.filter((project) => projectVaultMap.has(project.id));
  const projectsWithoutVault = setupData.projects.filter((project) => !projectVaultMap.has(project.id));

  const openCreateDialog = (nextScope: VaultScope, project?: ProjectOption) => {
    setScope(nextScope);
    if (nextScope === "project" && project) {
      setSelectedProjectId(project.id);
      setName(`${project.name} Vault`);
      setDescription(project.description ?? "");
    } else if (nextScope === "common") {
      setSelectedProjectId("");
      setName("Common Vault");
      setDescription("Organization-wide shared credentials and reusable resources.");
    } else {
      setSelectedProjectId("");
      setName("");
      setDescription("");
    }
    setCreateOpen(true);
  };

  const handleAccessToggle = (userId: string, enabled: boolean) => {
    setAccessMap((current) => ({
      ...current,
      [userId]: {
        enabled,
        canEdit: enabled ? current[userId]?.canEdit ?? false : false,
      },
    }));
  };

  const handleEditToggle = (userId: string, canEdit: boolean) => {
    setAccessMap((current) => ({
      ...current,
      [userId]: {
        enabled: current[userId]?.enabled ?? false,
        canEdit,
      },
    }));
  };

  const handleCreateVault = async () => {
    if (!name.trim()) {
      toast.error("Vault name is required.");
      return;
    }
    if (scope === "project" && !selectedProjectId) {
      toast.error("Please select a project.");
      return;
    }

    const member_ids = Object.entries(accessMap)
      .filter(([, config]) => config.enabled)
      .map(([userId]) => userId);

    const editor_ids = Object.entries(accessMap)
      .filter(([, config]) => config.enabled && config.canEdit)
      .map(([userId]) => userId);

    setSaving(true);
    const res = await createVaultAction({
      vault_scope: scope,
      project_id: scope === "project" ? selectedProjectId : null,
      name,
      description,
      member_ids,
      editor_ids,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error(res.message ?? "Failed to create vault");
      return;
    }

    toast.success(res.existed ? "Vault already existed. Opened it." : "Vault created.");
    setCreateOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["vault-catalog"] });
    await queryClient.invalidateQueries({ queryKey: ["vault-setup"] });
    if (res.data?.id) {
      router.push(`/admin/vaults/${res.data.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Document Vault</CardTitle>
              <CardDescription>
                Manage project vaults and one common vault for shared organization content.
              </CardDescription>
            </div>
            <Button onClick={() => openCreateDialog("project")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Vault
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Common Vault</CardTitle>
                <CardDescription>Shared credentials and references across all teams.</CardDescription>
              </div>
              <Badge variant="outline">Organization</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {commonVault ? (
              <div className="rounded-2xl border p-4">
                <p className="font-semibold">{commonVault.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {commonVault.description ?? "No description"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {commonVault.member_count} members
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5" />
                    {commonVault.entry_count} entries
                  </span>
                </div>
                <div className="mt-4">
                  <Link href={`/admin/vaults/${commonVault.id}`}>
                    <Button>Open Common Vault</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-4">
                <p className="text-sm text-muted-foreground">No common vault exists yet.</p>
                <Button className="mt-3" onClick={() => openCreateDialog("common")}>
                  Create Common Vault
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-base">Projects Without Vault</CardTitle>
            <CardDescription>Create a dedicated vault where project-level credentials can be shared.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {projectsWithoutVault.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Every listed project already has a vault.
              </p>
            ) : (
              projectsWithoutVault.map((project) => (
                <div key={project.id} className="flex items-center justify-between gap-2 rounded-2xl border p-3">
                  <div>
                    <p className="font-semibold">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.status}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openCreateDialog("project", project)}>
                    Create
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-base">Project Vaults</CardTitle>
          <CardDescription>All vaults currently linked to projects.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {projectsWithVault.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              No project vaults created yet.
            </p>
          ) : (
            projectsWithVault.map((project) => {
              const vault = projectVaultMap.get(project.id);
              if (!vault) return null;
              return (
                <div key={vault.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{project.name}</p>
                    <Badge variant="outline">{vault.entry_count} entries</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vault.description ?? "No description"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {vault.member_count} members
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      {vault.can_edit ? "Editable" : "Restricted"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <Link href={`/admin/vaults/${vault.id}`}>
                      <Button variant="outline" className="w-full">
                        Open Vault
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Vault</DialogTitle>
            <DialogDescription>
              Configure access and permissions for this vault. Employees with edit rights can add and update entries.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="vault-scope">Vault Scope</Label>
              <Select value={scope} onValueChange={(value: VaultScope) => setScope(value)}>
                <SelectTrigger id="vault-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project Vault</SelectItem>
                  <SelectItem value="common">Common Vault</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope === "project" ? (
              <div className="grid gap-2">
                <Label htmlFor="vault-project">Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="vault-project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {setupData.projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="vault-name">Vault Name</Label>
              <Input
                id="vault-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter vault name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vault-description">Description</Label>
              <Textarea
                id="vault-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this vault stores and who should use it."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Employee Access</Label>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border p-3">
                {setupData.employees.map((employee) => {
                  const state = accessMap[employee.id] ?? { enabled: false, canEdit: false };
                  return (
                    <div key={employee.id} className="rounded-xl border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{employee.full_name ?? employee.email ?? "Employee"}</p>
                          <p className="text-[11px] text-muted-foreground">{employee.email ?? "No email"}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`access-${employee.id}`}
                              checked={state.enabled}
                              onCheckedChange={(checked) => handleAccessToggle(employee.id, checked === true)}
                            />
                            <Label htmlFor={`access-${employee.id}`} className="text-xs">
                              Access
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`edit-${employee.id}`}
                              checked={state.canEdit}
                              disabled={!state.enabled}
                              onCheckedChange={(checked) => handleEditToggle(employee.id, checked === true)}
                            />
                            <Label htmlFor={`edit-${employee.id}`} className="text-xs">
                              Edit
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVault} disabled={saving}>
              {saving ? "Creating..." : "Create Vault"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
