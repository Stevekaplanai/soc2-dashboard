import mammoth from "mammoth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiProposedControl } from "@/lib/types";

type ClaudeTextBlock = { type: "text"; text: string };

function isAiProposedControl(value: unknown): value is AiProposedControl {
  if (!value || typeof value !== "object") return false;
  const control = value as Record<string, unknown>;
  return (
    typeof control.control_code === "string" &&
    typeof control.control_title === "string" &&
    ["high", "medium", "low"].includes(String(control.confidence)) &&
    typeof control.reasoning === "string"
  );
}

function parseClaudeResponse(responseText: string, validCodes: Set<string>) {
  const jsonText = responseText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed: unknown = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(isAiProposedControl)
    .filter((control) => validCodes.has(control.control_code));
}

/**
 * Claude proposes possible controls; only a named admin can approve evidence.
 * This function never writes review_status, reviewed_by, or reviewed_at.
 */
export async function analyzeEvidenceWithClaude(evidenceId: string) {
  const adminClient = createAdminClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!adminClient || !apiKey) return;

  const { data: evidence } = await adminClient
    .from("evidence")
    .select("id, file_url, file_name")
    .eq("id", evidenceId)
    .single();
  if (!evidence) return;

  const { data: controls } = await adminClient
    .from("controls")
    .select("code, title, description, category")
    .order("code");
  if (!controls?.length) return;

  const { data: signedUrlData } = await adminClient.storage
    .from("evidence-files")
    .createSignedUrl(evidence.file_url, 120);
  if (!signedUrlData?.signedUrl) return;

  const controlsList = controls
    .map(
      (control) =>
        `- ${control.code} (${control.category}): ${control.title} — ${control.description}`
    )
    .join("\n");
  const system = `You are a SOC2 compliance assistant. Analyze the supplied evidence and propose only the Trust Services Criteria controls it may support.

Controls:
${controlsList}

Return only a JSON array. Each item must contain control_code, control_title, confidence (high, medium, or low), and reasoning (one sentence). Never claim that evidence is approved.`;

  const extension = evidence.file_name.split(".").pop()?.toLowerCase();
  let content: Array<Record<string, unknown>>;

  if (extension === "pdf") {
    content = [
      {
        type: "document",
        source: { type: "url", url: signedUrlData.signedUrl },
      },
      { type: "text", text: "Map this PDF to the most relevant SOC2 controls." },
    ];
  } else if (["png", "jpg", "jpeg"].includes(extension ?? "")) {
    content = [
      {
        type: "image",
        source: { type: "url", url: signedUrlData.signedUrl },
      },
      { type: "text", text: "Map this image to the most relevant SOC2 controls." },
    ];
  } else if (extension === "docx") {
    const fileResponse = await fetch(signedUrlData.signedUrl);
    if (!fileResponse.ok) return;
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    const { value } = await mammoth.extractRawText({ buffer });
    if (!value.trim()) return;
    content = [
      {
        type: "text",
        text: `Map this DOCX text to the most relevant SOC2 controls.\n\n${value.slice(0, 100_000)}`,
      },
    ];
  } else {
    return;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content }],
    }),
  });
  if (!response.ok) return;

  const result = (await response.json()) as { content?: ClaudeTextBlock[] };
  const responseText = result.content?.find((block) => block.type === "text")?.text;
  if (!responseText) return;

  let proposedControls: AiProposedControl[];
  try {
    proposedControls = parseClaudeResponse(
      responseText,
      new Set(controls.map((control) => control.code))
    );
  } catch {
    return;
  }

  const confidences = proposedControls.map((control) => control.confidence);
  const overallConfidence = confidences.includes("high")
    ? "high"
    : confidences.includes("medium")
      ? "medium"
      : "low";

  await adminClient
    .from("evidence")
    .update({
      ai_proposed_controls: proposedControls,
      ai_confidence: overallConfidence,
    })
    .eq("id", evidenceId)
    .eq("review_status", "pending");
}
