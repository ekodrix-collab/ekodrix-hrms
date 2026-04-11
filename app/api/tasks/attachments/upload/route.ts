import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const supabase = createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const taskId = formData.get("taskId") as string;
        const file = formData.get("file") as File;

        if (!taskId || !file) {
            return NextResponse.json({ error: "Missing taskId or file" }, { status: 400 });
        }

        // 1. Upload to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${taskId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("task-attachments")
            .upload(filePath, file);

        if (uploadError) {
            console.error("Storage Upload Error:", uploadError);
            return NextResponse.json({ error: "Failed to upload to storage" }, { status: 500 });
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from("task-attachments")
            .getPublicUrl(filePath);

        // 3. Save to Database
        const { data: attachment, error: dbError } = await supabase
            .from("task_attachments")
            .insert({
                task_id: taskId,
                image_url: publicUrl,
            })
            .select("*")
            .single();

        if (dbError) {
            console.error("DB Insert Error:", dbError);
            // Cleanup: delete from storage if DB insert fails
            await supabase.storage.from("task-attachments").remove([filePath]);
            return NextResponse.json({ error: "Failed to save attachment metadata" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, attachment });
    } catch (err) {
        console.error("Upload Route Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
