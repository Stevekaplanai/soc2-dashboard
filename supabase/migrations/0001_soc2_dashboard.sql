-- ============================================================================
-- SOC2 Dashboard — Migration 0001
-- ============================================================================
-- Creates: soc2_controls, soc2_evidence, soc2_audit_log tables
-- Creates: soc2_control_status VIEW (computed, not a table)
-- Creates: soc2_evidence_files storage bucket (private)
-- Creates: Row Level Security policies
--
-- Run this in Supabase SQL Editor. Then run seed.sql to populate controls.
-- ============================================================================

-- ============ TABLE: soc2_controls ============
CREATE TABLE IF NOT EXISTS soc2_controls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'CC'
              CHECK (category IN ('CC', 'A', 'PI', 'C', 'P')),
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'not_started'
              CHECK (status IN ('not_started', 'in_review', 'passing')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE soc2_controls IS 'SOC2 Trust Services Criteria controls. Seeded once, rarely changes.';

-- ============ TABLE: soc2_evidence ============
CREATE TABLE IF NOT EXISTS soc2_evidence (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id           UUID NOT NULL REFERENCES soc2_controls(id) ON DELETE CASCADE,
  file_url             TEXT NOT NULL,
  file_name            TEXT NOT NULL,
  uploaded_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ai_proposed_controls JSONB,
  ai_confidence        TEXT
                       CHECK (ai_confidence IN ('high', 'medium', 'low') OR ai_confidence IS NULL),
  review_status        TEXT NOT NULL DEFAULT 'pending'
                       CHECK (review_status IN ('pending', 'accepted', 'rejected')),
  reviewed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  notes                TEXT,
  -- Compliance firewall: accepted evidence must have a reviewer
  CONSTRAINT soc2_evidence_accepted_requires_reviewer CHECK (
    review_status != 'accepted' OR reviewed_by IS NOT NULL
  )
);

CREATE INDEX idx_soc2_evidence_control ON soc2_evidence(control_id);
CREATE INDEX idx_soc2_evidence_status ON soc2_evidence(review_status);
CREATE INDEX idx_soc2_evidence_uploaded_by ON soc2_evidence(uploaded_by);

COMMENT ON TABLE soc2_evidence IS 'Evidence files linked to SOC2 controls. review_status is the compliance firewall — only admins can accept.';

-- ============ TABLE: soc2_audit_log ============
CREATE TABLE IF NOT EXISTS soc2_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action        TEXT NOT NULL CHECK (action IN ('uploaded', 'accepted', 'rejected')),
  evidence_id   UUID REFERENCES soc2_evidence(id) ON DELETE CASCADE,
  control_id    UUID REFERENCES soc2_controls(id) ON DELETE CASCADE,
  performed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note          TEXT
);

CREATE INDEX idx_soc2_audit_log_evidence ON soc2_audit_log(evidence_id);
CREATE INDEX idx_soc2_audit_log_control ON soc2_audit_log(control_id);

COMMENT ON TABLE soc2_audit_log IS 'Immutable audit trail — who approved what and when. Non-negotiable for SOC2.';

-- ============ VIEW: soc2_control_status ============
-- The dashboard reads this view. Always current — no sync jobs.
CREATE OR REPLACE VIEW soc2_control_status AS
SELECT
  c.id           AS control_id,
  c.code,
  c.title,
  c.category,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM soc2_evidence e
      WHERE e.control_id = c.id AND e.review_status = 'accepted'
    ) THEN 'passing'
    WHEN EXISTS (
      SELECT 1 FROM soc2_evidence e
      WHERE e.control_id = c.id AND e.review_status = 'pending'
    ) THEN 'in_review'
    ELSE 'not_started'
  END AS status,
  (SELECT count(*) FROM soc2_evidence e WHERE e.control_id = c.id) AS evidence_count,
  (SELECT max(e.uploaded_at) FROM soc2_evidence e WHERE e.control_id = c.id) AS last_evidence_at
FROM soc2_controls c;

COMMENT ON VIEW soc2_control_status IS 'Computed view: control status based on accepted/pending evidence. Dashboard reads this.';

-- ============ STORAGE BUCKET ============
-- Create the evidence-files bucket as private
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-files', 'evidence-files', false)
ON CONFLICT (id) DO NOTHING;

-- ============ ROW LEVEL SECURITY ============

-- soc2_controls: readable by any authenticated user, writable only by service role
ALTER TABLE soc2_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "controls_select_authenticated"
  ON soc2_controls FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "controls_all_service_role"
  ON soc2_controls FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- soc2_control_status view: readable by authenticated users
CREATE POLICY "control_status_select_authenticated"
  ON soc2_control_status FOR SELECT
  TO authenticated USING (true);

-- soc2_evidence: users see only their own evidence; admins see all
ALTER TABLE soc2_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_select_own_or_admin"
  ON soc2_evidence FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' = 'admin'
    )
  );
CREATE POLICY "evidence_insert_authenticated"
  ON soc2_evidence FOR INSERT
  TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "evidence_update_own"
  ON soc2_evidence FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "evidence_all_service_role"
  ON soc2_evidence FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- soc2_audit_log: readable by admins, insert by authenticated
ALTER TABLE soc2_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select_admin"
  ON soc2_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' = 'admin'
    )
  );
CREATE POLICY "audit_log_insert_authenticated"
  ON soc2_audit_log FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "audit_log_all_service_role"
  ON soc2_audit_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Storage policies for evidence-files bucket
CREATE POLICY "evidence_files_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'evidence-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "evidence_files_select_own_or_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evidence-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
      )
    )
  );
CREATE POLICY "evidence_files_all_service_role"
  ON storage.objects FOR ALL
  TO service_role USING (bucket_id = 'evidence-files') WITH CHECK (bucket_id = 'evidence-files');

-- ============ HELPER: updated_at trigger for soc2_controls ============
CREATE OR REPLACE FUNCTION soc2_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS soc2_controls_updated_at ON soc2_controls;
CREATE TRIGGER soc2_controls_updated_at
  BEFORE UPDATE ON soc2_controls
  FOR EACH ROW
  EXECUTE FUNCTION soc2_set_updated_at();

-- Done
-- Now run /supabase/seed.sql to populate the controls table.