"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircleQuestion,
  X,
} from "lucide-react";
import { reviewEvidenceAction } from "@/lib/actions";
import type { AiProposedControl, Evidence } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ReviewAction = "accept" | "reject" | "ask";

export function ReviewQueueClient({ evidence }: { evidence: Evidence[] }) {
  const [items, setItems] = useState(evidence);
  const [busyAction, setBusyAction] = useState<Record<string, ReviewAction>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      evidence.map((item) => [
        item.id,
        item.ai_confidence === "high"
          ? "Claude proposal reviewed; evidence verified against the control."
          : item.notes ?? "",
      ])
    )
  );
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function fetchUrls() {
      const entries = await Promise.all(
        items.map(async (item) => {
          try {
            const response = await fetch("/api/signed-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: item.file_url }),
            });
            if (!response.ok) return [item.id, ""] as const;
            const data = (await response.json()) as { url?: string };
            return [item.id, data.url ?? ""] as const;
          } catch {
            return [item.id, ""] as const;
          }
        })
      );
      if (active) setSignedUrls(Object.fromEntries(entries));
    }

    fetchUrls();
    return () => {
      active = false;
    };
  }, [items]);

  async function handleAction(item: Evidence, action: ReviewAction) {
    const reviewerNote = (notes[item.id] ?? "").trim();
    if ((action === "reject" || action === "ask") && !reviewerNote) {
      setMessages((current) => ({
        ...current,
        [item.id]: "Add a reviewer note before taking this action.",
      }));
      return;
    }

    setBusyAction((current) => ({ ...current, [item.id]: action }));
    setMessages((current) => ({ ...current, [item.id]: "" }));

    const formData = new FormData();
    formData.append("evidence_id", item.id);
    formData.append("action", action);
    formData.append("notes", reviewerNote);
    const result = await reviewEvidenceAction(formData);

    if (result.error) {
      setMessages((current) => ({ ...current, [item.id]: result.error }));
    } else if (action === "ask") {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, notes: reviewerNote }
            : currentItem
        )
      );
      setMessages((current) => ({
        ...current,
        [item.id]: "More-information request logged. Evidence remains pending.",
      }));
    } else {
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    }

    setBusyAction((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  }

  function confidenceClasses(confidence: string | null) {
    if (confidence === "high") return "border-green-300 bg-green-50";
    if (confidence === "medium") return "border-yellow-300 bg-yellow-50";
    if (confidence === "low") return "border-red-300 bg-red-50";
    return "border-neutral-200 bg-white";
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className={confidenceClasses(item.ai_confidence)}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-neutral-900">
                    {item.control_code}
                  </span>
                  <span className="text-sm text-neutral-700">{item.control_title}</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4 text-neutral-400" />
                  <span className="max-w-full truncate text-sm font-medium">
                    {item.file_name}
                  </span>
                  {signedUrls[item.id] && (
                    <a
                      href={signedUrls[item.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-700 hover:underline"
                    >
                      View file <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <p className="mt-1 text-xs text-neutral-500">
                  Uploaded by {item.uploader_email || item.uploaded_by} on{" "}
                  {new Date(item.uploaded_at).toLocaleString()}
                </p>

                {item.ai_proposed_controls?.length ? (
                  <div className="mt-4 rounded-md border border-neutral-200 bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
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
                    <div className="space-y-2">
                      {item.ai_proposed_controls.map(
                        (proposal: AiProposedControl, index: number) => (
                          <div key={`${proposal.control_code}-${index}`} className="text-sm">
                            <span className="font-mono font-medium">
                              {proposal.control_code}
                            </span>{" "}
                            <span className="text-neutral-600">
                              — {proposal.control_title}
                            </span>
                            <span className="ml-2 text-xs text-neutral-500">
                              ({proposal.confidence})
                            </span>
                            <p className="mt-0.5 text-xs leading-5 text-neutral-500">
                              {proposal.reasoning}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                    {item.ai_confidence === "low" && (
                      <p className="mt-3 text-xs font-medium text-red-700">
                        Claude is not sure about this. Review it carefully before
                        accepting.
                      </p>
                    )}
                    {item.ai_confidence === "medium" && (
                      <p className="mt-3 text-xs font-medium text-yellow-700">
                        Verify that the file satisfies this control before accepting.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-neutral-200 bg-white/70 p-3">
                    <p className="text-xs text-neutral-500">
                      No AI proposal is available yet. Review the file manually.
                    </p>
                  </div>
                )}

                <label
                  htmlFor={`review-note-${item.id}`}
                  className="mt-4 block text-xs font-semibold uppercase tracking-wide text-neutral-500"
                >
                  Reviewer note
                </label>
                <textarea
                  id={`review-note-${item.id}`}
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white p-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  placeholder="Required when rejecting or asking for more information"
                  rows={3}
                  value={notes[item.id] ?? ""}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />

                {messages[item.id] && (
                  <p
                    className={`mt-2 text-sm ${
                      messages[item.id].startsWith("More-information")
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                    role="status"
                  >
                    {messages[item.id]}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-44 lg:grid-cols-1">
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleAction(item, "accept")}
                  disabled={Boolean(busyAction[item.id])}
                >
                  {busyAction[item.id] === "accept" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleAction(item, "reject")}
                  disabled={Boolean(busyAction[item.id])}
                >
                  {busyAction[item.id] === "reject" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(item, "ask")}
                  disabled={Boolean(busyAction[item.id])}
                >
                  {busyAction[item.id] === "ask" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MessageCircleQuestion className="h-3 w-3" />
                  )}
                  Ask for more
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
