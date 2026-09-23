-- ════════════════════════════════════════════════════════════════════
--  CinnabyteHQ · demo seed data
--
--  Run AFTER migrations/001_initial_schema.sql
--  (Supabase → SQL Editor → Run, or automatically by `supabase db reset`).
--
--  ⚠ Development only: this file first EMPTIES every CinnabyteHQ table.
--
--  Timestamps are relative to now(), so the workspace looks current
--  whenever you seed it. Re-run it any time to reset the demo.
--
--  IDs are fixed and readable so the relationships are easy to follow:
--    profiles  10000000-…-00000000000N
--    projects  20000000-…-00000000000N
--    requests  30000000-…-00000000NNNN   (NNNN = request number)
--    tasks     40000000-…-0000000000NN
--    approvals 50000000-…-00000000000N
-- ════════════════════════════════════════════════════════════════════

begin;

truncate table
  public.activity_logs,
  public.approvals,
  public.tasks,
  public.requests,
  public.projects,
  public.profiles
restart identity cascade;


-- ─── Profiles ────────────────────────────────────────────────────────
-- Alex Johnson is the development user (DEV_USER_EMAIL in .env).

insert into public.profiles (id, full_name, email, role, job_title, team, created_at) values
  ('10000000-0000-4000-8000-000000000001', 'Alex Johnson', 'alex.johnson@cinnabyte.io', 'admin',   'Operations Manager',       'Operations',  now() - interval '400 days'),
  ('10000000-0000-4000-8000-000000000002', 'Sarah Chen',   'sarah.chen@cinnabyte.io',   'manager', 'Finance Lead',             'Finance',     now() - interval '380 days'),
  ('10000000-0000-4000-8000-000000000003', 'Mike Torres',  'mike.torres@cinnabyte.io',  'manager', 'Engineering Lead',         'Engineering', now() - interval '350 days'),
  ('10000000-0000-4000-8000-000000000004', 'Emma Garcia',  'emma.garcia@cinnabyte.io',  'member',  'Product Designer',         'Design',      now() - interval '300 days'),
  ('10000000-0000-4000-8000-000000000005', 'Daniel Kim',   'daniel.kim@cinnabyte.io',   'member',  'IT Administrator',         'IT',          now() - interval '280 days'),
  ('10000000-0000-4000-8000-000000000006', 'Sofia Reyes',  'sofia.reyes@cinnabyte.io',  'manager', 'People & Culture Manager', 'People',      now() - interval '260 days');


-- ─── Projects ────────────────────────────────────────────────────────

insert into public.projects (id, name, description, owner_id, status, progress, created_at, updated_at) values
  ('20000000-0000-4000-8000-000000000001', 'Website Redesign',
   'Refresh cinnabyte.io with the new brand system, a faster page architecture and a clearer pricing story for small teams.',
   '10000000-0000-4000-8000-000000000004', 'in_progress', 82, now() - interval '40 days', now() - interval '4 days'),

  ('20000000-0000-4000-8000-000000000002', 'Internal Portal',
   'One home for policies, tools and team directories, with single sign-on so people stop hunting for bookmarks.',
   '10000000-0000-4000-8000-000000000003', 'in_progress', 64, now() - interval '60 days', now() - interval '2 days'),

  ('20000000-0000-4000-8000-000000000003', 'Mobile Application',
   'The first Cinnabyte mobile app: requests, approvals and notifications on the go. On hold until the Android push-notification crash is fixed.',
   '10000000-0000-4000-8000-000000000003', 'on_hold', 41, now() - interval '50 days', now() - interval '65 minutes'),

  ('20000000-0000-4000-8000-000000000004', 'Second-floor Office Move',
   'Move Operations, Design and People to the renovated second floor with minimal disruption to day-to-day work.',
   '10000000-0000-4000-8000-000000000001', 'in_progress', 36, now() - interval '20 days', now() - interval '25 hours'),

  ('20000000-0000-4000-8000-000000000005', 'Onboarding Revamp',
   'Redesign the first 90 days for new hires: better equipment kits, clearer plans and a buddy for every newcomer.',
   '10000000-0000-4000-8000-000000000006', 'planning', 15, now() - interval '7 days', now() - interval '7 hours'),

  ('20000000-0000-4000-8000-000000000006', 'IT Asset Inventory',
   'Tag, log and reconcile every laptop, monitor and phone the company owns ahead of the annual audit.',
   '10000000-0000-4000-8000-000000000005', 'completed', 100, now() - interval '45 days', now() - interval '6 days');


-- ─── Requests ────────────────────────────────────────────────────────
-- 2 new · 3 in review · 4 in progress · 2 completed · 1 rejected

insert into public.requests (id, number, title, description, category, priority, status, requester_id, assignee_id, created_at, updated_at) values
  ('30000000-0000-4000-8000-000000001031', 1031, 'Premium video-conferencing plan',
   E'The sales team runs back-to-back customer calls and keeps hitting the 40-minute limit on our current plan.\n\nRequesting the premium tier for 12 seats (about $180/month) so demos don''t drop halfway through.',
   'finance', 'medium', 'rejected',
   '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002',
   now() - interval '16 days', now() - interval '12 days'),

  ('30000000-0000-4000-8000-000000001032', 1032, 'Update the remote-work policy in the handbook',
   'The employee handbook still describes the old two-days-in-office policy. Please update the remote-work section to reflect the flexible policy approved in August and publish the changes to the internal wiki.',
   'people', 'medium', 'completed',
   '10000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001',
   now() - interval '13 days', now() - interval '5 days'),

  ('30000000-0000-4000-8000-000000001033', 1033, 'Renew project-management software licenses',
   'The engineering team''s project-management subscription renews on September 30. We need 18 seats on the annual plan (up from 15) to cover the new hires.',
   'finance', 'low', 'completed',
   '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002',
   now() - interval '12 days', now() - interval '3 days'),

  ('30000000-0000-4000-8000-000000001034', 1034, 'Brand refresh assets for the customer portal',
   'The customer portal still uses the old logo, colors and icon set. We need updated assets — logo lockups, favicon, 24 product icons and an email header — that follow the new Cinnabyte brand guidelines before the portal relaunch.',
   'design', 'high', 'in_progress',
   '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004',
   now() - interval '8 days', now() - interval '23 hours'),

  ('30000000-0000-4000-8000-000000001035', 1035, 'Onboarding kits for October hires',
   'Three new hires start on October 5 (two engineers and one designer). Each needs a laptop, monitor, headset and the standard welcome pack, ready on their desks by October 2.',
   'it_equipment', 'medium', 'in_progress',
   '10000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001',
   now() - interval '7 days 2 hours', now() - interval '6 hours'),

  ('30000000-0000-4000-8000-000000001036', 1036, 'Design review for the onboarding flow',
   'Engineering has a first build of the new in-app onboarding flow (five screens). We would like a design review before it ships to beta users next week — especially the empty states and the permissions step on mobile.',
   'design', 'medium', 'in_progress',
   '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004',
   now() - interval '6 days 3 hours', now() - interval '4 hours'),

  ('30000000-0000-4000-8000-000000001037', 1037, 'VPN access for the remote QA team',
   'Our two contract QA engineers in Lisbon need VPN access to the staging environment before the mobile beta starts. Access should be limited to staging and expire on December 31.',
   'software_access', 'high', 'in_progress',
   '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005',
   now() - interval '2 days 5 hours', now() - interval '2 days 1 hour'),

  ('30000000-0000-4000-8000-000000001038', 1038, 'Q4 conference travel budget',
   'Requesting travel and registration budget for three people to attend OpsSummit in Austin (November 12–14): flights, two nights of accommodation and conference passes. Estimated total: $6,850.',
   'finance', 'medium', 'in_review',
   '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
   now() - interval '2 days 3 hours', now() - interval '2 days 2 hours'),

  ('30000000-0000-4000-8000-000000001039', 1039, 'Figma seat for a freelance illustrator',
   'We are bringing in a freelance illustrator for the website redesign from October 1 to November 15. They need an editor seat in our Figma organization with access to the Website and Brand projects only.',
   'software_access', 'medium', 'new',
   '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005',
   now() - interval '30 hours', now() - interval '2 hours'),

  ('30000000-0000-4000-8000-000000001040', 1040, 'Replace the meeting room display in 2B',
   E'The display in meeting room 2B has a dead strip of pixels down the left side and the HDMI input cuts out during calls. The warranty expired in March.\n\nI have sourced a 65" replacement for $1,180, including the wall mount and installation.',
   'facilities', 'low', 'in_review',
   '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001',
   now() - interval '28 hours', now() - interval '27 hours'),

  ('30000000-0000-4000-8000-000000001041', 1041, 'Laptop replacement for design work',
   E'My 2019 MacBook Pro struggles with large Figma files, and the battery has started to swell. IT flagged it as a safety issue during the last hardware check.\n\nRequesting a 16" MacBook Pro (M-series, 32 GB) so I can keep working on the website redesign without interruptions.',
   'it_equipment', 'high', 'in_review',
   '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005',
   now() - interval '26 hours', now() - interval '12 minutes'),

  ('30000000-0000-4000-8000-000000001042', 1042, 'Standing desks for the second-floor studio',
   'Four team members asked for sit-stand desks during the ergonomic review. The second-floor studio has room for them once the move is done. The vendor estimate is in the People shared drive.',
   'facilities', 'low', 'new',
   '10000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001',
   now() - interval '90 minutes', now() - interval '90 minutes');

-- Continue numbering new requests after the seeded ones (REQ-1043, …)
select setval(pg_get_serial_sequence('public.requests', 'number'), (select max(number) from public.requests));


-- ─── Approvals ───────────────────────────────────────────────────────
-- Finance and IT & Equipment go to Sarah (Finance); Facilities go to Alex (Operations).

insert into public.approvals (id, request_id, approver_id, status, comment, approved_at, created_at) values
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000001031', '10000000-0000-4000-8000-000000000002',
   'rejected', 'The current plan covers most of our usage. Please use the shared room account for long demos and let''s revisit with Q1 budgets.',
   now() - interval '12 days', now() - interval '15 days 20 hours'),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000001033', '10000000-0000-4000-8000-000000000002',
   'approved', 'Approved for the annual plan.', now() - interval '3 days 4 hours', now() - interval '11 days'),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000001035', '10000000-0000-4000-8000-000000000002',
   'approved', null, now() - interval '6 hours', now() - interval '3 days'),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000001038', '10000000-0000-4000-8000-000000000002',
   'pending', null, null, now() - interval '2 days 2 hours'),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000001040', '10000000-0000-4000-8000-000000000001',
   'pending', null, null, now() - interval '27 hours'),
  ('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000001041', '10000000-0000-4000-8000-000000000002',
   'pending', null, null, now() - interval '20 hours');


-- ─── Tasks ───────────────────────────────────────────────────────────

insert into public.tasks (id, title, description, project_id, assignee_id, priority, status, due_date, created_at, updated_at) values
  ('40000000-0000-4000-8000-000000000001', 'Review the Room 2B display replacement quote',
   'Check the $1,180 quote against the facilities budget before approving REQ-1040.',
   '20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'high', 'todo', current_date, now() - interval '27 hours', now() - interval '27 hours'),
  ('40000000-0000-4000-8000-000000000002', 'Order onboarding kits for October hires',
   'Place the order for three laptops, monitors and headsets with the approved vendor. Kits must arrive by October 2.',
   '20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'medium', 'in_progress', current_date + 1, now() - interval '6 hours', now() - interval '5 hours'),
  ('40000000-0000-4000-8000-000000000003', 'Update facilities documentation for the office move',
   'Refresh the floor plan, desk map and access-card instructions on the wiki.',
   '20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'low', 'completed', current_date - 1, now() - interval '6 days', now() - interval '25 hours'),
  ('40000000-0000-4000-8000-000000000004', 'Check deployment status of the portal beta',
   'Confirm the beta build is live on staging and that single sign-on works for the pilot group.',
   '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'medium', 'todo', current_date + 2, now() - interval '2 days', now() - interval '2 days'),
  ('40000000-0000-4000-8000-000000000005', 'Complete security awareness onboarding',
   'Annual security training module and phishing quiz.',
   '20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'low', 'completed', current_date, now() - interval '6 days', now() - interval '7 hours'),
  ('40000000-0000-4000-8000-000000000006', 'Confirm movers and floor plan with the landlord',
   'The landlord needs the final floor plan and mover schedule to book the service elevator.',
   '20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'high', 'todo', current_date - 1, now() - interval '5 days', now() - interval '5 days'),
  ('40000000-0000-4000-8000-000000000007', 'Finalize homepage hero illustrations',
   'Final artwork for the three homepage hero variants, exported for light and dark backgrounds.',
   '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'high', 'in_progress', current_date + 2, now() - interval '4 days', now() - interval '35 minutes'),
  ('40000000-0000-4000-8000-000000000008', 'QA the pricing page across breakpoints',
   'Check layout, copy and plan toggles on mobile, tablet and desktop in both themes.',
   '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'medium', 'todo', current_date + 5, now() - interval '3 days', now() - interval '3 days'),
  ('40000000-0000-4000-8000-000000000009', 'Migrate the blog to the new CMS',
   'Move 140 posts with redirects from the old URLs.',
   '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'medium', 'completed', current_date - 1, now() - interval '12 days', now() - interval '3 hours'),
  ('40000000-0000-4000-8000-000000000010', 'Set up single sign-on for the internal portal',
   'Connect the portal to the identity provider and map groups to portal roles.',
   '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 'high', 'in_progress', current_date + 1, now() - interval '8 days', now() - interval '2 days'),
  ('40000000-0000-4000-8000-000000000011', 'Write content guidelines for portal editors',
   'Tone, structure and ownership rules for pages published on the portal.',
   '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', 'low', 'todo', current_date + 8, now() - interval '5 days', now() - interval '5 days'),
  ('40000000-0000-4000-8000-000000000012', 'Fix the push-notification crash on Android',
   'Crash on Android 14 when a notification arrives while the app is backgrounded. Blocking the beta.',
   '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'high', 'in_progress', current_date - 2, now() - interval '6 days', now() - interval '2 days'),
  ('40000000-0000-4000-8000-000000000013', 'Prepare the mobile beta test plan',
   'Test scenarios, device matrix and the feedback form for 25 beta users.',
   '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'medium', 'todo', current_date + 4, now() - interval '3 days', now() - interval '3 days'),
  ('40000000-0000-4000-8000-000000000014', 'Draft a 30-60-90 day plan template',
   'A reusable template managers can fill in before a new hire''s first day.',
   '20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000006', 'medium', 'in_progress', current_date + 3, now() - interval '4 days', now() - interval '1 day'),
  ('40000000-0000-4000-8000-000000000015', 'Tag and log the remaining laptops',
   'Asset tags for the last 18 laptops and a reconciled inventory sheet.',
   '20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005', 'low', 'completed', current_date - 7, now() - interval '20 days', now() - interval '7 days');


-- ─── Activity logs ───────────────────────────────────────────────────
-- Every request's full history, plus project and task events.
-- The latest event of each request matches its current status.

insert into public.activity_logs (user_id, request_id, project_id, task_id, action, description, metadata, created_at) values
  -- Projects created
  ('10000000-0000-4000-8000-000000000003', null, '20000000-0000-4000-8000-000000000002', null, 'created', 'created project "Internal Portal"',
   '{"entity": "project", "title": "Internal Portal"}', now() - interval '60 days'),
  ('10000000-0000-4000-8000-000000000003', null, '20000000-0000-4000-8000-000000000003', null, 'created', 'created project "Mobile Application"',
   '{"entity": "project", "title": "Mobile Application"}', now() - interval '50 days'),
  ('10000000-0000-4000-8000-000000000005', null, '20000000-0000-4000-8000-000000000006', null, 'created', 'created project "IT Asset Inventory"',
   '{"entity": "project", "title": "IT Asset Inventory"}', now() - interval '45 days'),
  ('10000000-0000-4000-8000-000000000004', null, '20000000-0000-4000-8000-000000000001', null, 'created', 'created project "Website Redesign"',
   '{"entity": "project", "title": "Website Redesign"}', now() - interval '40 days'),
  ('10000000-0000-4000-8000-000000000001', null, '20000000-0000-4000-8000-000000000004', null, 'created', 'created project "Second-floor Office Move"',
   '{"entity": "project", "title": "Second-floor Office Move"}', now() - interval '20 days'),

  -- REQ-1031 · rejected
  ('10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000001031', null, null, 'created', 'created REQ-1031 "Premium video-conferencing plan"',
   '{"entity": "request", "title": "Premium video-conferencing plan"}', now() - interval '16 days'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000001031', null, null, 'status_changed', 'moved REQ-1031 from New to In review',
   '{"entity": "request", "title": "Premium video-conferencing plan", "from": "new", "to": "in_review"}', now() - interval '15 days 20 hours'),
  ('10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000001031', null, null, 'commented', 'commented on REQ-1031',
   '{"entity": "request", "title": "Premium video-conferencing plan", "comment": "Sales lost two demos last week when calls dropped at the limit."}', now() - interval '13 days'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000001031', null, null, 'rejected', 'rejected REQ-1031',
   '{"entity": "request", "title": "Premium video-conferencing plan", "from": "in_review", "to": "rejected", "comment": "The current plan covers most of our usage. Please use the shared room account for long demos and let''s revisit with Q1 budgets."}', now() - interval '12 days'),

  -- REQ-1032 · completed
  ('10000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000001032', null, null, 'created', 'created REQ-1032 "Update the remote-work policy in the handbook"',
   '{"entity": "request", "title": "Update the remote-work policy in the handbook"}', now() - interval '13 days'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000001032', null, null, 'status_changed', 'moved REQ-1032 from New to In progress',
   '{"entity": "request", "title": "Update the remote-work policy in the handbook", "from": "new", "to": "in_progress"}', now() - interval '11 days'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000001032', null, null, 'status_changed', 'moved REQ-1032 from In progress to Completed',
   '{"entity": "request", "title": "Update the remote-work policy in the handbook", "from": "in_progress", "to": "completed"}', now() - interval '5 days'),

  -- REQ-1033 · completed (after approval)
  ('10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000001033', null, null, 'created', 'created REQ-1033 "Renew project-management software licenses"',
   '{"entity": "request", "title": "Renew project-management software licenses"}', now() - interval '12 days'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000001033', null, null, 'status_changed', 'moved REQ-1033 from New to In review',
   '{"entity": "request", "title": "Renew project-management software licenses", "from": "new", "to": "in_review"}', now() - interval '11 days'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000001033', null, null, 'approved', 'approved REQ-1033',
   '{"entity": "request", "title": "Renew project-management software licenses", "from": "in_review", "to": "in_progress", "comment": "Approved for the annual plan."}', now() - interval '3 days 4 hours'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000001033', null, null, 'status_changed', 'moved REQ-1033 from In progress to Completed',
   '{"entity": "request", "title": "Renew project-management software licenses", "from": "in_progress", "to": "completed"}', now() - interval '3 days'),

  -- REQ-1034 · in progress
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000001034', null, null, 'created', 'created REQ-1034 "Brand refresh assets for the customer portal"',
   '{"entity": "request", "title": "Brand refresh assets for the customer portal"}', now() - interval '8 days'),
  ('10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000001034', null, null, 'status_changed', 'moved REQ-1034 from New to In progress',
   '{"entity": "request", "title": "Brand refresh assets for the customer portal", "from": "new", "to": "in_progress"}', now() - interval '7 days'),
  ('10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000001034', null, null, 'commented', 'commented on REQ-1034',
   '{"entity": "request", "title": "Brand refresh assets for the customer portal", "comment": "First round of product icons is in the Brand file. Feedback on the stroke weight is welcome."}', now() - interval '23 hours'),

  -- REQ-1035 · in progress (after approval)
  ('10000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000001035', null, null, 'created', 'created REQ-1035 "Onboarding kits for October hires"',
   '{"entity": "request", "title": "Onboarding kits for October hires"}', now() - interval '7 days 2 hours'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000001035', null, null, 'status_changed', 'moved REQ-1035 from New to In review',
   '{"entity": "request", "title": "Onboarding kits for October hires", "from": "new", "to": "in_review"}', now() - interval '3 days'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000001035', null, null, 'approved', 'approved REQ-1035',
   '{"entity": "request", "title": "Onboarding kits for October hires", "from": "in_review", "to": "in_progress"}', now() - interval '6 hours'),

  -- REQ-1036 · in progress
  ('10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000001036', null, null, 'created', 'created REQ-1036 "Design review for the onboarding flow"',
   '{"entity": "request", "title": "Design review for the onboarding flow"}', now() - interval '6 days 3 hours'),
  ('10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000001036', null, null, 'status_changed', 'moved REQ-1036 from New to In review',
   '{"entity": "request", "title": "Design review for the onboarding flow", "from": "new", "to": "in_review"}', now() - interval '5 days'),
  ('10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000001036', null, null, 'status_changed', 'moved REQ-1036 from In review to In progress',
   '{"entity": "request", "title": "Design review for the onboarding flow", "from": "in_review", "to": "in_progress"}', now() - interval '4 hours'),

  -- REQ-1037 · in progress
  ('10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000001037', null, null, 'created', 'created REQ-1037 "VPN access for the remote QA team"',
   '{"entity": "request", "title": "VPN access for the remote QA team"}', now() - interval '2 days 5 hours'),
  ('10000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000001037', null, null, 'status_changed', 'moved REQ-1037 from New to In progress',
   '{"entity": "request", "title": "VPN access for the remote QA team", "from": "new", "to": "in_progress"}', now() - interval '2 days 1 hour'),

  -- REQ-1038 · in review (awaiting Sarah)
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000001038', null, null, 'created', 'created REQ-1038 "Q4 conference travel budget"',
   '{"entity": "request", "title": "Q4 conference travel budget"}', now() - interval '2 days 3 hours'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000001038', null, null, 'status_changed', 'moved REQ-1038 from New to In review',
   '{"entity": "request", "title": "Q4 conference travel budget", "from": "new", "to": "in_review"}', now() - interval '2 days 2 hours'),

  -- REQ-1039 · new, then assigned
  ('10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000001039', null, null, 'created', 'created REQ-1039 "Figma seat for a freelance illustrator"',
   '{"entity": "request", "title": "Figma seat for a freelance illustrator"}', now() - interval '30 hours'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000001039', null, null, 'assigned', 'assigned REQ-1039 to Daniel Kim',
   '{"entity": "request", "title": "Figma seat for a freelance illustrator", "assignee_id": "10000000-0000-4000-8000-000000000005", "assignee_name": "Daniel Kim"}', now() - interval '2 hours'),

  -- REQ-1040 · in review (awaiting Alex)
  ('10000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000001040', null, null, 'created', 'created REQ-1040 "Replace the meeting room display in 2B"',
   '{"entity": "request", "title": "Replace the meeting room display in 2B"}', now() - interval '28 hours'),
  ('10000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000001040', null, null, 'status_changed', 'moved REQ-1040 from New to In review',
   '{"entity": "request", "title": "Replace the meeting room display in 2B", "from": "new", "to": "in_review"}', now() - interval '27 hours'),

  -- REQ-1041 · in review (awaiting Sarah)
  ('10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000001041', null, null, 'created', 'created REQ-1041 "Laptop replacement for design work"',
   '{"entity": "request", "title": "Laptop replacement for design work"}', now() - interval '26 hours'),
  ('10000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000001041', null, null, 'status_changed', 'moved REQ-1041 from New to In review',
   '{"entity": "request", "title": "Laptop replacement for design work", "from": "new", "to": "in_review"}', now() - interval '20 hours'),
  ('10000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000001041', null, null, 'commented', 'commented on REQ-1041',
   '{"entity": "request", "title": "Laptop replacement for design work", "comment": "Vendor quote is attached. Two business days lead time once this is approved."}', now() - interval '12 minutes'),

  -- REQ-1042 · new
  ('10000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000001042', null, null, 'created', 'created REQ-1042 "Standing desks for the second-floor studio"',
   '{"entity": "request", "title": "Standing desks for the second-floor studio"}', now() - interval '90 minutes'),

  -- Onboarding Revamp project
  ('10000000-0000-4000-8000-000000000006', null, '20000000-0000-4000-8000-000000000005', null, 'created', 'created project "Onboarding Revamp"',
   '{"entity": "project", "title": "Onboarding Revamp"}', now() - interval '7 days'),

  -- Project updates
  ('10000000-0000-4000-8000-000000000005', null, '20000000-0000-4000-8000-000000000006', null, 'status_changed', 'moved project "IT Asset Inventory" from In progress to Completed',
   '{"entity": "project", "title": "IT Asset Inventory", "from": "in_progress", "to": "completed"}', now() - interval '6 days'),
  ('10000000-0000-4000-8000-000000000004', null, '20000000-0000-4000-8000-000000000001', null, 'progress_updated', 'updated progress on "Website Redesign" from 74% to 82%',
   '{"entity": "project", "title": "Website Redesign", "from": "74", "to": "82"}', now() - interval '4 days'),
  ('10000000-0000-4000-8000-000000000003', null, '20000000-0000-4000-8000-000000000003', null, 'status_changed', 'moved project "Mobile Application" from In progress to On hold',
   '{"entity": "project", "title": "Mobile Application", "from": "in_progress", "to": "on_hold"}', now() - interval '65 minutes'),

  -- Tasks (linked to their project too, so project feeds include them)
  ('10000000-0000-4000-8000-000000000005', null, '20000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000015', 'completed', 'completed task "Tag and log the remaining laptops"',
   '{"entity": "task", "title": "Tag and log the remaining laptops", "from": "in_progress", "to": "completed"}', now() - interval '7 days'),
  ('10000000-0000-4000-8000-000000000001', null, '20000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', 'completed', 'completed task "Update facilities documentation for the office move"',
   '{"entity": "task", "title": "Update facilities documentation for the office move", "from": "in_progress", "to": "completed"}', now() - interval '25 hours'),
  ('10000000-0000-4000-8000-000000000001', null, '20000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000005', 'completed', 'completed task "Complete security awareness onboarding"',
   '{"entity": "task", "title": "Complete security awareness onboarding", "from": "todo", "to": "completed"}', now() - interval '7 hours'),
  ('10000000-0000-4000-8000-000000000003', null, '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000009', 'completed', 'completed task "Migrate the blog to the new CMS"',
   '{"entity": "task", "title": "Migrate the blog to the new CMS", "from": "in_progress", "to": "completed"}', now() - interval '3 hours'),
  ('10000000-0000-4000-8000-000000000004', null, '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000007', 'status_changed', 'moved task "Finalize homepage hero illustrations" from To do to In progress',
   '{"entity": "task", "title": "Finalize homepage hero illustrations", "from": "todo", "to": "in_progress"}', now() - interval '35 minutes');

commit;
