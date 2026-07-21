"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { analyzeEvidenceWithClaude } from "@/lib/claude";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg", "image/jpg"],
  jpeg: ["image/jpeg"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
};

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function storageSafeFileName(fileName: string, extension: string) {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized && sanitized !== `.${extension}`
    ? sanitized
    : `evidence.${extension}`;
}

export async function uploadEvidenceAction(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  if (!supabase || !adminClient) {
    return { error: "The server is not fully configured." };
  }

  const fileValue = formData.get("file");
  const controlId = formData.get("control_id");

  if (!(fileValue instanceof File) || typeof controlId !== "string") {
    return { error: "Choose a file and control before uploading." };
  }

  if (fileValue.size === 0 || fileValue.size > MAX_FILE_SIZE) {
    return { error: "The file must be between 1 byte and 10MB." };
  }

  const extension = getExtension(fileValue.name);
  const allowedMimeTypes = ALLOWED_FILE_TYPES[extension];
  if (!allowedMimeTypes || !allowedMimeTypes.includes(fileValue.type)) {
    return { error: "Unsupported file type. Use PDF, PNG, JPG, or DOCX." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Log in before uploading evidence." };
  }

  const { data: control } = await supabase
    .from("controls")
    .select("id")
    .eq("id", controlId)
    .maybeSingle();

  if (!control) {
    return { error: "That SOC2 control could not be found." };
  }

  const safeFileName = storageSafeFileName(fileValue.name, extension);
  const filePath = `${user.id}/${controlId}/${Date.now()}-${safeFileName}`;
  const { error: uploadError } = await supabase.storage
    .from("evidence-files")
    .upload(filePath, fileValue, {
      contentType: fileValue.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: evidenceRow, error: databaseError } = await supabase
    .from("evidence")
    .insert({
      control_id: controlId,
      file_url: filePath,
      file_name: fileValue.name,
      uploaded_by: user.id,
      review_status: "pending",
    })
    .select("id")
    .single();

  if (databaseError || !evidenceRow) {
    await adminClient.storage.from("evidence-files").remove([filePath]);
    return { error: `Database error: ${databaseError?.message ?? "Unknown error"}` };
  }

  const { error: auditError } = await adminClient.from("audit_log").insert({
    action: "uploaded",
    evidence_id: evidenceRow.id,
    control_id: controlId,
    performed_by: user.id,
    note: `Uploaded ${fileValue.name}`,
  });

  if (auditError) {
    await Promise.all([
      adminClient.from("evidence").delete().eq("id", evidenceRow.id),
      adminClient.storage.from("evidence-files").remove([filePath]),
    ]);
    return { error: "The upload could not be added to the audit trail." };
  }

  after(async () => {
    await analyzeEvidenceWithClaude(evidenceRow.id);
    revalidatePath("/dashboard/review");
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

  const evidenceId = formData.get("evidence_id");
  const action = formData.get("action");
  const notesValue = formData.get("notes");
  const notes = typeof notesValue === "string" ? notesValue.trim() : "";

  if (
    typeof evidenceId !== "string" ||
    typeof action !== "string" ||
    !["accept", "reject", "ask"].includes(action)
  ) {
    return { error: "The review request is invalid." };
  }

  if ((action === "reject" || action === "ask") && !notes) {
    return { error: "Add a note before rejecting or asking for more information." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Log in before reviewing evidence." };
  }

  if (user.app_metadata?.role !== "admin") {
    return { error: "Only admins can review evidence." };
  }

  const { error } = await supabase.rpc("review_evidence", {
    p_evidence_id: evidenceId,
    p_review_action: action,
    p_review_note: notes || null,
  });

  if (error) {
    return { error: `Review failed: ${error.message}` };
  }

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
