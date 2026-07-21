"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeEvidenceWithClaude } from "@/lib/claude";

export async function uploadEvidenceAction(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const file = formData.get("file") as File;
  const control_id = formData.get("control_id") as string;

  if (!file || !control_id) {
    return { error: "Missing file or control." };
  }

  // Size check (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { error: "File too large. Max 10MB." };
  }

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to upload evidence." };
  }

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop()?.toLowerCase();
  const filePath = `${user.id}/${control_id}/${Date.now()}-${file.name}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("evidence-files")
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  // Insert evidence row
  const { data: evidenceRow, error: dbError } = await supabase
    .from("evidence")
    .insert({
      control_id,
      file_url: filePath,
      file_name: file.name,
      uploaded_by: user.id,
      review_status: "pending",
    })
    .select("id")
    .single();

  if (dbError) {
    return { error: `Database error: ${dbError.message}` };
  }

  // Write to audit log
  await supabase.from("audit_log").insert({
    action: "uploaded",
    evidence_id: evidenceRow.id,
    control_id,
    performed_by: user.id,
    note: `Uploaded ${file.name}`,
  });

  // Fire AI analysis asynchronously (non-blocking)
  // If it fails, evidence still exists — admin can review manually.
  analyzeEvidenceWithClaude(evidenceRow.id).catch(() => {
    // Silently fail — evidence is still reviewable
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/review");
  revalidatePath("/");

  return { success: true };
}

export async function reviewEvidenceAction(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const evidence_id = formData.get("evidence_id") as string;
  const action = formData.get("action") as "accept" | "reject" | "ask";
  const notes = (formData.get("notes") as string) || "";
  const control_id = formData.get("control_id") as string;

  if (!evidence_id || !action) {
    return { error: "Missing required fields." };
  }

  // Check admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const userRole = user.app_metadata?.role || user.user_metadata?.role;
  if (userRole !== "admin") {
    return { error: "Only admins can review evidence." };
  }

  let review_status: "accepted" | "rejected" | "pending";
  let auditAction: "accepted" | "rejected";

  if (action === "accept") {
    review_status = "accepted";
    auditAction = "accepted";
  } else if (action === "reject") {
    if (!notes) {
      return { error: "Notes are required when rejecting." };
    }
    review_status = "rejected";
    auditAction = "rejected";
  } else {
    // "ask" — keep pending but store notes
    review_status = "pending";
    await supabase
      .from("evidence")
      .update({ notes })
      .eq("id", evidence_id);
    revalidatePath("/dashboard/review");
    return { success: true };
  }

  const { error } = await supabase
    .from("evidence")
    .update({
      review_status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq("id", evidence_id);

  if (error) {
    return { error: `Failed to update: ${error.message}` };
  }

  // Write audit log
  await supabase.from("audit_log").insert({
    action: auditAction,
    evidence_id,
    control_id,
    performed_by: user.id,
    note: notes || null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/review");
  revalidatePath("/");

  return { success: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/");
  revalidatePath("/dashboard");
}