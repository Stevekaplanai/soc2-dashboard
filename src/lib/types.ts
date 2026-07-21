export type ControlCategory = "CC" | "A" | "PI" | "C" | "P";

export type ControlStatus = "passing" | "not_started" | "in_review";

export type EvidenceReviewStatus = "pending" | "accepted" | "rejected";

export interface Control {
  id: string;
  code: string;
  title: string;
  category: ControlCategory;
  description: string;
  status: ControlStatus;
}

export interface ControlStatusRow {
  control_id: string;
  code: string;
  title: string;
  category: ControlCategory;
  status: ControlStatus;
  evidence_count: number;
  last_evidence_at: string | null;
}

export interface Evidence {
  id: string;
  control_id: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
  ai_proposed_controls: AiProposedControl[] | null;
  ai_confidence: string | null;
  review_status: EvidenceReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  // Joined fields (optional)
  control_code?: string;
  control_title?: string;
  uploader_email?: string;
}

export interface AiProposedControl {
  control_code: string;
  control_title: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

export interface AuditLog {
  id: string;
  action: "accepted" | "rejected" | "uploaded";
  evidence_id: string;
  control_id: string;
  performed_by: string;
  performed_at: string;
  note: string | null;
}

export const CATEGORY_LABELS: Record<ControlCategory, string> = {
  CC: "Security (Common Criteria)",
  A: "Availability",
  PI: "Processing Integrity",
  C: "Confidentiality",
  P: "Privacy",
};

export const STATUS_VARIANT: Record<ControlStatus, "success" | "warning" | "destructive"> = {
  passing: "success",
  in_review: "warning",
  not_started: "destructive",
};

export const STATUS_LABEL: Record<ControlStatus, string> = {
  passing: "Passing",
  in_review: "In Review",
  not_started: "Not Started",
};