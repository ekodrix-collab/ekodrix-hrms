"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addVaultMemberAction,
  deleteVaultEntryAction,
  getVaultDetailAction,
  removeVaultMemberAction,
  updateVaultMemberPermissionAction,
  upsertVaultEntryAction,
} from "@/actions/vaults";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileText,
  Globe,
  ImageIcon,
  KeyRound,
  Link2,
  Lock,
  Pencil,
  Pin,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";

type VaultScope = "project" | "common";
type VaultEntryType = "credential" | "shared_note" | "image" | "file";

interface MemberProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  department: string | null;
  designation: string | null;
}

interface VaultMember {
  id: string;
  vault_id: string;
  user_id: string;
  can_edit: boolean;
  created_at: string;
  profiles: MemberProfile | null;
}

interface VaultEntry {
  id: string;
  vault_id: string;
  entry_type: VaultEntryType;
  title: string;
  platform: string | null;
  username: string | null;
  secret: string | null;
  url: string | null;
  details: string | null;
  attachment_url: string | null;
  is_pinned: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface VaultDetail {
  id: string;
  name: string;
  description: string | null;
  vault_scope: VaultScope;
  project_id: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  projects: { name: string } | null;
}

interface VaultPermission {
  role: "admin" | "employee";
  canEdit: boolean;
  canManageMembers: boolean;
}

interface VaultDetailData {
  vault: VaultDetail;
  members: VaultMember[];
  entries: VaultEntry[];
  permissions: VaultPermission;
}

interface MemberOption {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  department: string | null;
  role: string | null;
}

interface VaultDetailClientProps {
  vaultId: string;
  basePath: "/admin/vaults" | "/employee/vaults";
  initialData: VaultDetailData | null;
  memberOptions?: MemberOption[];
}

interface EntryFormState {
  entry_id?: string;
  entry_type: VaultEntryType;
  title: string;
  platform: string;
  username: string;
  secret: string;
  url: string;
  details: string;
  attachment_url: string;
  is_pinned: boolean;
}

const EMPTY_FORM: EntryFormState = {
  entry_type: "credential",
  title: "",
  platform: "",
  username: "",
  secret: "",
  url: "",
  details: "",
  attachment_url: "",
  is_pinned: false,
};

function getTypeIcon(type: VaultEntryType) {
  if (type === "credential") return <KeyRound className="h-4 w-4" />;
  if (type === "image") return <ImageIcon className="h-4 w-4" />;
  if (type === "file") return <FileText className="h-4 w-4" />;
  return <ShieldCheck className="h-4 w-4" />;
}

export function VaultDetailClient({ vaultId, basePath, initialData, memberOptions = [] }: VaultDetailClientProps) {
  const queryClient = useQueryClient();
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormState>(EMPTY_FORM);
  const [memberId, setMemberId] = useState("");
  const [memberCanEdit, setMemberCanEdit] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["vault-detail", vaultId],
    queryFn: async () => {
      const res = await getVaultDetailAction(vaultId);
      return res.ok ? res.data : null;
    },
    initialData,
  });

  const permissions = data?.permissions;
  const vault = data?.vault;
  const members = useMemo(() => data?.members ?? [], [data?.members]);
  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);

  const availableMemberOptions = useMemo(() => {
    const existing = new Set(members.map((member) => member.user_id));
    return memberOptions.filter((option) => !existing.has(option.id));
  }, [memberOptions, members]);

  const refreshVault = async () => {
    await queryClient.invalidateQueries({ queryKey: ["vault-detail", vaultId] });
    await queryClient.invalidateQueries({ queryKey: ["vault-catalog"] });
  };

  const handleAddMember = async () => {
    if (!memberId) {
      toast.error("Select an employee first.");
      return;
    }
    setAddingMember(true);
    const res = await addVaultMemberAction({
      vault_id: vaultId,
      user_id: memberId,
      can_edit: memberCanEdit,
    });
    setAddingMember(false);

    if (!res.ok) {
      toast.error(res.message ?? "Failed to add member");
      return;
    }

    toast.success("Vault access updated.");
    setMemberId("");
    setMemberCanEdit(false);
    await refreshVault();
  };

  const handleToggleEditPermission = async (member: VaultMember) => {
    const res = await updateVaultMemberPermissionAction({
      member_id: member.id,
      can_edit: !member.can_edit,
    });
    if (!res.ok) {
      toast.error(res.message ?? "Failed to update permission");
      return;
    }
    toast.success("Member permission updated.");
    await refreshVault();
  };

  const handleRemoveMember = async (member: VaultMember) => {
    const confirmed = window.confirm("Remove this member from the vault?");
    if (!confirmed) return;

    const res = await removeVaultMemberAction(member.id);
    if (!res.ok) {
      toast.error(res.message ?? "Failed to remove member");
      return;
    }
    toast.success("Member removed.");
    await refreshVault();
  };

  const openCreateEntry = () => {
    setEntryForm(EMPTY_FORM);
    setEntryDialogOpen(true);
  };

  const openEditEntry = (entry: VaultEntry) => {
    setEntryForm({
      entry_id: entry.id,
      entry_type: entry.entry_type,
      title: entry.title,
      platform: entry.platform ?? "",
      username: entry.username ?? "",
      secret: entry.secret ?? "",
      url: entry.url ?? "",
      details: entry.details ?? "",
      attachment_url: entry.attachment_url ?? "",
      is_pinned: entry.is_pinned,
    });
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!entryForm.title.trim()) {
      toast.error("Entry title is required.");
      return;
    }

    setSavingEntry(true);
    const res = await upsertVaultEntryAction({
      vault_id: vaultId,
      entry_id: entryForm.entry_id,
      entry_type: entryForm.entry_type,
      title: entryForm.title,
      platform: entryForm.platform,
      username: entryForm.username,
      secret: entryForm.secret,
      url: entryForm.url,
      details: entryForm.details,
      attachment_url: entryForm.attachment_url,
      is_pinned: entryForm.is_pinned,
    });
    setSavingEntry(false);

    if (!res.ok) {
      toast.error(res.message ?? "Failed to save entry");
      return;
    }

    toast.success(entryForm.entry_id ? "Entry updated." : "Entry created.");
    setEntryDialogOpen(false);
    setEntryForm(EMPTY_FORM);
    await refreshVault();
  };

  const handleDeleteEntry = async (entryId: string) => {
    const confirmed = window.confirm("Delete this vault entry?");
    if (!confirmed) return;

    const res = await deleteVaultEntryAction(entryId);
    if (!res.ok) {
      toast.error(res.message ?? "Failed to delete entry");
      return;
    }

    toast.success("Entry deleted.");
    await refreshVault();
  };

  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Loading vault...</p>;
  }

  if (!data || !vault || !permissions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vault not available</CardTitle>
          <CardDescription>This vault could not be loaded with your current access.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={basePath}>
          <Button variant="ghost" className="h-9 px-3">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vaults
          </Button>
        </Link>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              {vault.vault_scope === "common" ? "Common Vault" : "Project Vault"}
            </Badge>
            {permissions.canEdit ? (
              <Badge className="text-[10px] uppercase tracking-widest">Edit Access</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
                View Only
              </Badge>
            )}
          </div>
          <CardTitle className="text-2xl">{vault.name}</CardTitle>
          <CardDescription>
            {vault.vault_scope === "project"
              ? `Project: ${vault.projects?.name ?? "Unknown Project"}`
              : "Organization-wide common content vault"}
          </CardDescription>
          {vault.description ? <p className="text-sm text-muted-foreground">{vault.description}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Access Members</CardTitle>
            <CardDescription>People who can open this vault and optionally edit it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {permissions.canManageMembers ? (
              <div className="space-y-3 rounded-2xl border p-3">
                <Label htmlFor="vault-member-select" className="text-xs uppercase tracking-wider">
                  Add Employee
                </Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger id="vault-member-select">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMemberOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.full_name ?? option.email ?? "Employee"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="member-edit-toggle"
                    checked={memberCanEdit}
                    onCheckedChange={(checked) => setMemberCanEdit(checked === true)}
                  />
                  <Label htmlFor="member-edit-toggle" className="text-sm">
                    Grant edit permission
                  </Label>
                </div>

                <Button className="w-full" onClick={handleAddMember} disabled={!memberId || addingMember}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {addingMember ? "Adding..." : "Add Member"}
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                  No members added yet.
                </p>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="rounded-2xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                          <AvatarFallback>{member.profiles?.full_name?.charAt(0) ?? "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">
                            {member.profiles?.full_name ?? member.profiles?.email ?? "Employee"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{member.profiles?.email ?? "No email"}</p>
                        </div>
                      </div>
                      <Badge variant={member.can_edit ? "default" : "outline"}>
                        {member.can_edit ? "Editor" : "Viewer"}
                      </Badge>
                    </div>

                    {permissions.canManageMembers ? (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => handleToggleEditPermission(member)}
                        >
                          {member.can_edit ? "Make Viewer" : "Make Editor"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveMember(member)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Vault Entries</CardTitle>
                <CardDescription>Credentials, shared notes, links, and image/file references.</CardDescription>
              </div>
              {permissions.canEdit ? (
                <Button onClick={openCreateEntry}>Add Entry</Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No entries yet. {permissions.canEdit ? "Create the first one from Add Entry." : "Ask an editor to add entries."}
              </p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border">
                          {getTypeIcon(entry.entry_type)}
                        </span>
                        <p className="font-semibold">{entry.title}</p>
                        <Badge variant="outline" className="capitalize">
                          {entry.entry_type.replace("_", " ")}
                        </Badge>
                        {entry.is_pinned ? (
                          <Badge variant="secondary">
                            <Pin className="mr-1 h-3 w-3" />
                            Pinned
                          </Badge>
                        ) : null}
                      </div>
                      {entry.platform ? (
                        <p className="text-xs text-muted-foreground">Platform: {entry.platform}</p>
                      ) : null}
                    </div>

                    {permissions.canEdit ? (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEntry(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2 text-sm">
                    {entry.username ? (
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Username:</span>
                        <span>{entry.username}</span>
                      </div>
                    ) : null}

                    {entry.secret ? (
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Password:</span>
                        <span>{showSecret[entry.id] ? entry.secret : "••••••••••••"}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setShowSecret((current) => ({ ...current, [entry.id]: !current[entry.id] }))
                          }
                        >
                          {showSecret[entry.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    ) : null}

                    {entry.url ? (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Open URL
                          <Link2 className="h-3 w-3" />
                        </a>
                      </div>
                    ) : null}

                    {entry.attachment_url ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={entry.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Open Attachment
                          <Link2 className="h-3 w-3" />
                        </a>
                      </div>
                    ) : null}

                    {entry.details ? <p className="rounded-xl bg-muted/40 p-3 text-sm leading-relaxed">{entry.details}</p> : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{entryForm.entry_id ? "Edit Vault Entry" : "Add Vault Entry"}</DialogTitle>
            <DialogDescription>
              Store credentials, shared notes, links, and image/file references securely in this vault.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="entry-type">Entry Type</Label>
              <Select
                value={entryForm.entry_type}
                onValueChange={(value: VaultEntryType) => setEntryForm((current) => ({ ...current, entry_type: value }))}
              >
                <SelectTrigger id="entry-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credential">Credential</SelectItem>
                  <SelectItem value="shared_note">Shared Note</SelectItem>
                  <SelectItem value="image">Image Reference</SelectItem>
                  <SelectItem value="file">File Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="entry-title">Title</Label>
              <Input
                id="entry-title"
                value={entryForm.title}
                onChange={(event) => setEntryForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Example: Figma Admin Login"
              />
            </div>

            {entryForm.entry_type === "credential" ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="entry-platform">Platform</Label>
                    <Input
                      id="entry-platform"
                      value={entryForm.platform}
                      onChange={(event) => setEntryForm((current) => ({ ...current, platform: event.target.value }))}
                      placeholder="Figma, AWS, Jira"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="entry-username">Username / Email</Label>
                    <Input
                      id="entry-username"
                      value={entryForm.username}
                      onChange={(event) => setEntryForm((current) => ({ ...current, username: event.target.value }))}
                      placeholder="user@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="entry-secret">Password / Secret</Label>
                    <Input
                      id="entry-secret"
                      value={entryForm.secret}
                      onChange={(event) => setEntryForm((current) => ({ ...current, secret: event.target.value }))}
                      placeholder="Secret value"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="entry-url">URL</Label>
                    <Input
                      id="entry-url"
                      value={entryForm.url}
                      onChange={(event) => setEntryForm((current) => ({ ...current, url: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </>
            ) : null}

            {(entryForm.entry_type === "image" || entryForm.entry_type === "file") ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="entry-attachment">Attachment URL</Label>
                  <Input
                    id="entry-attachment"
                    value={entryForm.attachment_url}
                    onChange={(event) =>
                      setEntryForm((current) => ({ ...current, attachment_url: event.target.value }))
                    }
                    placeholder="https://.../asset"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="entry-link">Optional Link</Label>
                  <Input
                    id="entry-link"
                    value={entryForm.url}
                    onChange={(event) => setEntryForm((current) => ({ ...current, url: event.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="entry-details">Notes</Label>
              <Textarea
                id="entry-details"
                rows={4}
                value={entryForm.details}
                onChange={(event) => setEntryForm((current) => ({ ...current, details: event.target.value }))}
                placeholder="Optional context, usage guidance, or troubleshooting notes."
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="entry-pinned"
                checked={entryForm.is_pinned}
                onCheckedChange={(checked) =>
                  setEntryForm((current) => ({ ...current, is_pinned: checked === true }))
                }
              />
              <Label htmlFor="entry-pinned">Pin this entry</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEntry} disabled={savingEntry}>
              {savingEntry ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
