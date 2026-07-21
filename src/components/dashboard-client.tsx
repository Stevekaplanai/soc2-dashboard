"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UploadEvidence } from "@/components/upload-evidence";
import {
  CATEGORY_LABELS,
  STATUS_VARIANT,
  STATUS_LABEL,
  type ControlStatusRow,
  type ControlCategory,
} from "@/lib/types";
import { ChevronDown, Plus } from "lucide-react";

interface GroupedData {
  category: ControlCategory;
  controls: ControlStatusRow[];
}

export function DashboardClient({
  grouped,
}: {
  grouped: GroupedData[];
}) {
  const [expanded, setExpanded] = useState<Set<ControlCategory>>(
    new Set(grouped.map((g) => g.category))
  );
  const [uploadControl, setUploadControl] = useState<ControlStatusRow | null>(null);

  const toggle = (cat: ControlCategory) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <>
      <div className="space-y-6">
        {grouped.map(({ category, controls }) => (
          <section key={category} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <button
              onClick={() => toggle(category)}
              className="flex w-full items-center justify-between bg-neutral-50 px-4 py-3 text-left hover:bg-neutral-100"
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={`h-4 w-4 text-neutral-400 transition-transform ${
                    expanded.has(category) ? "" : "-rotate-90"
                  }`}
                />
                <span className="font-semibold">{CATEGORY_LABELS[category]}</span>
                <Badge variant="secondary" className="ml-2">
                  {controls.length} controls
                </Badge>
              </div>
              <span className="text-sm text-neutral-500">
                {controls.filter((c) => c.status === "passing").length}/{controls.length} passing
              </span>
            </button>
            {expanded.has(category) && (
              <div className="divide-y divide-neutral-100">
                {controls.map((control) => (
                  <div
                    key={control.control_id}
                    className="flex flex-col gap-3 px-4 py-3 hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                      <Badge
                        variant={STATUS_VARIANT[control.status]}
                        className="w-24 justify-center"
                      >
                        {STATUS_LABEL[control.status]}
                      </Badge>
                      <div className="min-w-0">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                          <span className="font-mono text-sm font-medium text-neutral-900">
                            {control.code}
                          </span>
                          <span className="text-sm text-neutral-700">{control.title}</span>
                        </div>
                        {control.evidence_count > 0 && (
                          <p className="mt-0.5 text-xs text-neutral-400">
                            {control.evidence_count} evidence file(s)
                            {control.last_evidence_at &&
                              ` · last ${new Date(control.last_evidence_at).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadControl(control)}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="h-3 w-3" /> Add Evidence
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <Sheet
        open={!!uploadControl}
        onClose={() => setUploadControl(null)}
        title="Add Evidence"
        description={
          uploadControl
            ? `${uploadControl.code} — ${uploadControl.title}`
            : ""
        }
      >
        {uploadControl && (
          <UploadEvidence
            control={uploadControl}
            onSuccess={() => setUploadControl(null)}
          />
        )}
      </Sheet>
    </>
  );
}
