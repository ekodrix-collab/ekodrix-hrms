import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
    try {
        const supabase = createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Only admins can delete attachments" }, { status: 403 });
        }

        const { attachmentId } = await req.json();

        if (!attachmentId) {
            return NextResponse.json({ error: "Missing attachmentId" }, { status: 400 });
        }

        // 1. Get attachment info to find storage path
        const { data: attachment, error: fetchError } = await supabase
            .from("task_attachments")
            .select("*")
            .eq("id", attachmentId)
            .single();

        if (fetchError || !attachment) {
            return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
        }

        // 2. Extract path from URL
        // URL format: .../storage/v1/object/public/task-attachments/taskId/fileName
        const urlParts = attachment.image_url.split("task-attachments/");
        if (urlParts.length < 2) {
            return NextResponse.json({ error: "Invalid image URL format" }, { status: 500 });
        }
        const storagePath = urlParts[1];

        // 3. Delete from Storage
        const { error: storageError } = await supabase.storage
            .from("task-attachments")
            .remove([storagePath]);

        if (storageError) {
            console.error("Storage Delete Error:", storageError);
            // We continue to delete from DB even if storage delete fails (to keep DB clean)
        }

        // 4. Delete from Database
        const { error: dbError } = await supabase
            .from("task_attachments")
            .delete()
            .eq("id", attachmentId);

        if (dbError) {
            console.error("DB Delete Error:", dbError);
            return NextResponse.json({ error: "Failed to delete from database" }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Delete Route Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
