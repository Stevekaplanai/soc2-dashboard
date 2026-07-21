"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reviewEvidenceAction } from "@/lib/actions";
import type { Evidence, AiProposedControl } from "@/lib/types";
import { FileText, Check, X, MessageCircleQuestion, Loader2, ExternalLink } from "lucide-react";

interface ReviewQueueClientProps {
  evidence: Evidence[];
}

export function ReviewQueueClient({ evidence }: ReviewQueueClientProps) {
  const [items, setItems] = useState(evidence);
  const [actionStates, setActionStates] = useState<Record<string, string>>({});
  const [notesState, setNotesState] = useState<Record<string, string>>({});
  const [showNotes, setShowNotes] = useState<Set<string>>(new Set());
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Generate signed URLs for viewing files
  useEffect(() => {
    async function fetchUrls() {
      const urls: Record<string, string> = {};
      for (const item of items) {
        try {
          const res = await fetch("/api/signed-url", {
            method: "POST",
            body: JSON.stringify({ path: item.file_url }),
          });
          const data = await res.json();
          if (data.url) urls[item.id] = data.url;
        } catch {}
      }
      setSignedUrls(urls);
    }
    fetchUrls();
  }, [items]);

  const handleAction = async (
    itemId: string,
    action: "accept" | "reject" | "ask",
    control_id: string
  ) => {
    if (action === "reject" && !showNotes.has(itemId)) {
      setShowNotes(new Set([...showNotes, itemId]));
      return;
    }

    setActionStates({ ...actionStates, [itemId]: action });
    const notes = notesState[itemId] || "";

    const formData = new FormData();
    formData.append("evidence_id", itemId);
    formData.append("action", action);
    formData.append("notes", notes);
    formData.append("control_id", control_id);

    const result = await reviewEvidenceAction(formData);

    if (!result.error) {
      setItems(items.filter((i) => i.id !== itemId));
    }
    setActionStates({ ...actionStates, [itemId]: "" });
  };

  const confidenceColor = (conf: string | null) => {
    if (conf === "high") return "border-green-300 bg-green-50";
    if (conf === "medium") return "border-yellow-300 bg-yellow-50";
    if (conf === "low") return "border-red-300 bg-red-50";
    return "border-neutral-200 bg-white";
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className={confidenceColor(item.ai_confidence)}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Control info */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-neutral-900">
                    {item.control_code}
                  </span>
                  <span className="text-sm text-neutral-700">{item.control_title}</span>
                </div>

                {/* File info */}
                <div className="mt-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm font-medium">{item.file_name}</span>
                  {signedUrls[item.id] && (
                    <a
                      href={signedUrls[item.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      View File <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Uploader info */}
                <p className="mt-1 text-xs text-neutral-400">
                  Uploaded by {item.uploader_email || "unknown"} on{" "}
                  {new Date(item.uploaded_at).toLocaleString()}
                </p>

                {/* AI Proposal */}
                {item.ai_proposed_controls && item.ai_proposed_controls.length > 0 ? (
                  <div className="mt-3 rounded-md border border-neutral-200 bg-white p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-neutral-500">
                        Claude proposes
                      </span>
                      {item.ai_confidence && (
                        <Badge
                          variant={
                            item.ai_confidence === "high"
                              ? "success"
                              : item.ai_confidence === "medium"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {item.ai_confidence} confidence
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {item.ai_proposed_controls.map((p: AiProposedControl, idx: number) => (
                        <div key={idx} className="text-sm">
                          <span className="font-mono font-medium">{p.control_code}</span>{" "}
                          <span className="text-neutral-600">— {p.control_title}</span>
                          <span className="ml-2 text-xs text-neutral-400">
                            ({p.confidence})
                          </span>
                          <p className="ml-4 text-xs text-neutral-400">{p.reasoning}</p>
                        </div>
                      ))}
                    </div>
                    {item.ai_confidence === "low" && (
                      <p className="mt-2 text-xs text-red-600">
                        ⚠️ Claude is not sure about this — review carefully before accepting.
                      </p>
                    )}
                    {item.ai_confidence === "medium" && (
                      <p className="mt-2 text-xs text-yellow-600">
                        Verify this satisfies the control before accepting.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-400">
                      No AI proposal yet. Review the file manually.
                    </p>
                  </div>
                )}

                {/* Notes input (shown on reject) */}
                {showNotes.has(item.id) && (
                  <div className="mt-3">
                    <textarea
                      className="w-full rounded-md border border-neutral-300 p-2 text-sm"
                      placeholder="Explain why this evidence is being rejected..."
                      rows={3}
                      value={notesState[item.id] || ""}
                      onChange={(e) =>
                        setNotesState({ ...notesState, [item.id]: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleAction(item.id, "accept", item.control_id)}
                  disabled={actionStates[item.id] === "accept"}
                >
                  {actionStates[item.id] === "accept" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleAction(item.id, "reject", item.control_id)}
                  disabled={actionStates[item.id] === "reject"}
                >
                  {actionStates[item.id] === "reject" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(item.id, "ask", item.control_id)}
                >
                  <MessageCircleQuestion className="h-3 w-3" />
                  Ask for More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}