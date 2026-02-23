import { getAdminInboxAction } from "@/actions/inbox";
import { InboxClient } from "@/components/admin/inbox/inbox-client";

export default async function AdminInboxPage() {
    const res = await getAdminInboxAction();
    const items = res.ok ? res.data || [] : [];

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-[1000px] mx-auto animate-in fade-in duration-700">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">
                    Admin Inbox
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                    Review and act on pending items across the platform.
                </p>
            </div>

            <InboxClient initialItems={items} />
        </div>
    );
}
