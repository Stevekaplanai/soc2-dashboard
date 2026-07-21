-- SOC2 Dashboard: controls, evidence, computed status, review audit log, and RLS.
-- Run this migration before supabase/seed.sql.

create table if not exists public.controls (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  category text not null check (category in ('CC', 'A', 'PI', 'C', 'P')),
  description text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_review', 'passing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  uploaded_at timestamptz not null default now(),
  ai_proposed_controls jsonb,
  ai_confidence text check (ai_confidence in ('high', 'medium', 'low')),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  constraint accepted_evidence_requires_human_review check (
    review_status <> 'accepted'
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists evidence_control_id_idx on public.evidence(control_id);
create index if not exists evidence_review_status_idx on public.evidence(review_status);
create index if not exists evidence_uploaded_by_idx on public.evidence(uploaded_by);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null
    check (action in ('uploaded', 'accepted', 'rejected', 'requested_more_info')),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  performed_by uuid references auth.users(id) on delete set null,
  performed_at timestamptz not null default now(),
  note text
);

create index if not exists audit_log_evidence_id_idx on public.audit_log(evidence_id);
create index if not exists audit_log_control_id_idx on public.audit_log(control_id);

-- Views cannot have RLS policies. security_invoker makes this view obey the
-- controls/evidence policies of the user who reads it.
create or replace view public.control_status
with (security_invoker = true) as
select
  c.id as control_id,
  c.code,
  c.title,
  c.category,
  case
    when count(e.id) filter (where e.review_status = 'accepted') > 0 then 'passing'
    when count(e.id) filter (where e.review_status = 'pending') > 0 then 'in_review'
    else 'not_started'
  end as status,
  count(e.id) filter (where e.review_status = 'accepted')::integer as evidence_count,
  max(e.uploaded_at) filter (where e.review_status = 'accepted') as last_evidence_at
from public.controls c
left join public.evidence e on e.control_id = c.id
group by c.id, c.code, c.title, c.category;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-files',
  'evidence-files',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create or replace function public.review_evidence(
  p_evidence_id uuid,
  p_review_action text,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_control_id uuid;
  audit_action text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_review_action not in ('accept', 'reject', 'ask') then
    raise exception 'Invalid review action' using errcode = '22023';
  end if;

  if p_review_action in ('reject', 'ask') and nullif(btrim(p_review_note), '') is null then
    raise exception 'A reviewer note is required' using errcode = '22023';
  end if;

  update public.evidence
  set
    review_status = case
      when p_review_action = 'accept' then 'accepted'
      when p_review_action = 'reject' then 'rejected'
      else 'pending'
    end,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    notes = nullif(btrim(p_review_note), '')
  where id = p_evidence_id and review_status = 'pending'
  returning control_id into target_control_id;

  if target_control_id is null then
    raise exception 'Pending evidence not found' using errcode = 'P0002';
  end if;

  audit_action := case p_review_action
    when 'accept' then 'accepted'
    when 'reject' then 'rejected'
    else 'requested_more_info'
  end;

  insert into public.audit_log (
    action, evidence_id, control_id, performed_by, note
  ) values (
    audit_action, p_evidence_id, target_control_id, auth.uid(),
    nullif(btrim(p_review_note), '')
  );
end;
$$;

revoke all on function public.review_evidence(uuid, text, text) from public, anon;
grant execute on function public.review_evidence(uuid, text, text) to authenticated;

alter table public.controls enable row level security;
alter table public.evidence enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "controls_select_authenticated" on public.controls;
create policy "controls_select_authenticated"
  on public.controls for select to authenticated using (true);

drop policy if exists "evidence_select_own_or_admin" on public.evidence;
create policy "evidence_select_own_or_admin"
  on public.evidence for select to authenticated
  using ((select auth.uid()) = uploaded_by or (select public.is_admin()));

drop policy if exists "evidence_insert_authenticated" on public.evidence;
create policy "evidence_insert_authenticated"
  on public.evidence for insert to authenticated
  with check (
    (select auth.uid()) = uploaded_by
    and review_status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

drop policy if exists "audit_log_select_admin" on public.audit_log;
create policy "audit_log_select_admin"
  on public.audit_log for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "evidence_files_upload_own" on storage.objects;
create policy "evidence_files_upload_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "evidence_files_select_own_or_admin" on storage.objects;
create policy "evidence_files_select_own_or_admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'evidence-files'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

revoke all on public.controls, public.evidence, public.audit_log from anon;
revoke all on public.audit_log from authenticated;
grant select on public.controls, public.control_status to authenticated;
grant select, insert on public.evidence to authenticated;
grant select on public.audit_log to authenticated;
grant select, insert, update, delete on public.controls, public.evidence, public.audit_log to service_role;
grant select on public.control_status to service_role;

create or replace function public.set_controls_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists controls_updated_at on public.controls;
create trigger controls_updated_at
before update on public.controls
for each row execute function public.set_controls_updated_at();

comment on table public.controls is 'Seeded SOC2 Trust Services Criteria. Status is computed by control_status.';
comment on table public.evidence is 'Private evidence with AI proposals and a mandatory human review gate.';
comment on view public.control_status is 'Live control status computed from pending and accepted evidence.';
comment on table public.audit_log is 'Immutable record of evidence uploads and human review actions.';
