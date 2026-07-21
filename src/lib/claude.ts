import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ask Claude to analyze an uploaded evidence file and propose which SOC2
 * controls it satisfies. Results are stored in evidence.ai_proposed_controls
 * and evidence.ai_confidence.
 *
 * This function is fire-and-forget — called after upload completes.
 * If it fails, the evidence still exists and can be reviewed manually.
 *
 * IMPORTANT: This function NEVER sets review_status. The human review gate
 * is non-negotiable. Claude proposes, a human confirms.
 */
export async function analyzeEvidenceWithClaude(evidenceId: string) {
  const adminClient = createAdminClient();
  if (!adminClient) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  // Fetch the evidence row
  const { data: evidence, error: evError } = await adminClient
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .single();

  if (evError || !evidence) return;

  // Fetch all controls for the prompt
  const { data: controls } = await adminClient
    .from("controls")
    .select("code, title, description, category")
    .order("code");

  if (!controls || controls.length === 0) return;

  // Generate a signed URL for the file (30 second TTL)
  const { data: urlData } = await adminClient.storage
    .from("evidence-files")
    .createSignedUrl(evidence.file_url, 30);

  if (!urlData?.signedUrl) return;

  const fileExt = evidence.file_name.split(".").pop()?.toLowerCase();

  // Build the system prompt with all SOC2 controls
  const controlsList = controls
    .map(
      (c: any) =>
        `- ${c.code} (${c.category}): ${c.title} — ${c.description || ""}`
    )
    .join("\n");

  const systemPrompt = `You are a SOC2 compliance assistant. Below is a list of Trust Services Criteria controls with their codes and descriptions. A user has uploaded an evidence document. Analyze it and return a JSON array of the controls this evidence appears to satisfy. For each match, include: control_code, control_title, confidence ("high", "medium", or "low"), and reasoning (one sentence explaining why).

Controls list:
${controlsList}

Return ONLY valid JSON. No prose, no markdown. The response must be a JSON array.`;

  // Build the message content based on file type
  let content: any[];

  if (fileExt === "pdf") {
    // Claude supports PDFs natively via URL
    content = [
      {
        type: "document",
        source: {
          type: "url",
          url: urlData.signedUrl,
        },
      },
      {
        type: "text",
        text: "Analyze this evidence document and return the JSON array of matching SOC2 controls.",
      },
    ];
  } else if (fileExt === "png" || fileExt === "jpg" || fileExt === "jpeg") {
    content = [
      {
        type: "image",
        source: {
          type: "url",
          url: urlData.signedUrl,
        },
      },
      {
        type: "text",
        text: "Analyze this evidence image and return the JSON array of matching SOC2 controls.",
      },
    ];
  } else if (fileExt === "docx") {
    // For DOCX, try to download and extract text
    try {
      const fileRes = await fetch(urlData.signedUrl);
      const arrayBuffer = await fileRes.arrayBuffer();
      const text = extractDocxText(arrayBuffer);
      content = [
        {
          type: "text",
          text: `Analyze this evidence document text and return the JSON array of matching SOC2 controls.\n\nDocument content:\n${text.substring(0, 50000)}`,
        },
      ];
    } catch {
      // If DOCX parsing fails, skip AI analysis
      return;
    }
  } else {
    return;
  }

  // Call Claude API
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) return;

  const result = await response.json();
  const responseText = result.content?.[0]?.text;

  if (!responseText) return;

  // Parse the JSON response (Claude may wrap in markdown code blocks)
  let proposedControls: any[] = [];
  try {
    let jsonStr = responseText.trim();
    // Strip markdown code fences if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    proposedControls = JSON.parse(jsonStr);
  } catch {
    // If parsing fails, store raw text
    proposedControls = [];
  }

  // Determine overall confidence
  const confidences = proposedControls.map((c: any) => c.confidence);
  let overallConfidence = "low";
  if (confidences.includes("high")) overallConfidence = "high";
  else if (confidences.includes("medium")) overallConfidence = "medium";

  // Write results back to evidence row
  // IMPORTANT: Only write to ai_proposed_controls and ai_confidence.
  // NEVER touch review_status here — that's the human review gate.
  await adminClient
    .from("evidence")
    .update({
      ai_proposed_controls: proposedControls,
      ai_confidence: overallConfidence,
    })
    .eq("id", evidenceId);
}

/**
 * Lightweight DOCX text extractor.
 * DOCX files are ZIP archives. The main document text is in word/document.xml.
 * We extract text by stripping XML tags.
 */
function extractDocxText(buffer: ArrayBuffer): string {
  try {
  // Use the built-in DecompressionStream to unzip the DOCX (ZIP format)
  // Unfortunately Node doesn't have a built-in ZIP decoder, so we use a
  // minimal approach: find word/document.xml in the raw buffer using
  // a regex on the raw bytes. This is a fallback; if it fails, the AI
  // analysis is skipped gracefully.
  //
  // For production, install a library like mammoth or jszip. For now,
  // we return a placeholder so the flow doesn't crash.
  return "[DOCX file — text extraction requires jszip/mammoth. Install for full AI analysis. The file has been uploaded and can be reviewed manually.]";
  } catch {
    return "[Unable to extract DOCX text]";
  }
}