# Backend integration guide

How to replace CinnabyteHQ's mock data layer with a **REST API** backed by **PostgreSQL** and add **authentication**, without rebuilding the frontend.

Search the codebase for these markers to find every connection point:

```bash
grep -rn "TODO(api)"  src    # service functions → REST endpoints
grep -rn "TODO(auth)" src    # session, current user, tokens
```

---

## 1. Today: how data flows

```
components / pages ──► services/*.ts ──► data/store.ts (in memory, seeded from data/mock*.ts)
client scripts ──► actions/index.ts ──┘
```

- **Components never import data.** They receive props from pages, and pages call services.
- **Client scripts never touch data.** They call Astro Actions, and actions call services.
- **Services are the seam.** Each exported function is `async` and returns the same shapes the API will return (`RequestWithRelations`, `TaskWithRelations`… see `src/types/index.ts`). Each one carries a `TODO(api)` comment with its future endpoint.

## 2. Phase 2: where the REST API connects

```
components / pages ──► services/*.ts ──► services/http.ts ──► REST API ──► PostgreSQL
client scripts ──► actions/index.ts ──┘      (fetch + auth)
```

`src/services/http.ts` is a small, ready-to-use fetch client (`api.get/post/patch/delete`). It reads `API_BASE_URL` from the environment (typed in `astro.config.mjs` → `env.schema`) and converts HTTP errors into the same `ServiceError` codes the mock layer throws. Error handling in actions and pages therefore keeps working unchanged.

Migrating a function is a one-body change:

```ts
// src/services/requests.ts — Phase 1
export async function getRequestById(id: string) {
  await simulateLatency();
  const request = db.requests.find((candidate) => candidate.id === id);
  return request ? withRelations(request) : null;
}

// Phase 2
export async function getRequestById(id: string) {
  return api.get<RequestWithRelations>(`/requests/${id}`).catch(nullIfNotFound);
}
```

### Endpoint map

| Service function | Method & path | Returns |
| --- | --- | --- |
| `users.getUsers()` | `GET /users` | `User[]` |
| `users.getUserById(id)` | `GET /users/:id` | `User` |
| `users.getCurrentUser()` | `GET /me` | `User` |
| `users.updateProfile(input)` | `PATCH /me` | `User` |
| `requests.getRequests({ view, search })` | `GET /requests?view=&q=` | `RequestWithRelations[]` |
| `requests.getRequestCounts()` | `GET /requests/counts` | `Record<RequestView, number>` |
| `requests.getRequestById(id)` | `GET /requests/:id` | `RequestWithRelations` |
| `requests.getRequestTimeline(id)` | `GET /requests/:id/timeline` | `ActivityWithActor[]` |
| `requests.createRequest(input)` | `POST /requests` | `RequestWithRelations` |
| `requests.updateRequest(id, changes)` | `PATCH /requests/:id` | `RequestWithRelations` |
| `requests.deleteRequest(id)` | `DELETE /requests/:id` | `204` |
| `requests.approveRequest(id)` | `POST /requests/:id/approve` | `RequestWithRelations` |
| `requests.addComment(id, comment)` | `POST /requests/:id/comments` | `ActivityWithActor` |
| `projects.getProjects({ activeOnly })` | `GET /projects?active=` | `ProjectWithRelations[]` |
| `projects.getProjectById(id)` | `GET /projects/:id` | `ProjectWithRelations` |
| `tasks.getTasks(filters)` | `GET /tasks?view=&projectId=&requestId=&q=` | `TaskWithRelations[]` |
| `tasks.getTaskCounts()` | `GET /tasks/counts` | `Record<TaskView, number>` |
| `tasks.updateTaskStatus(id, status)` | `PATCH /tasks/:id` | `TaskWithRelations` |
| `activity.getActivity({ entityType, limit })` | `GET /activity?entityType=&limit=` | `ActivityWithActor[]` |
| `activity.getProjectActivity(id)` | `GET /projects/:id/activity` | `ActivityWithActor[]` |
| `activity.getNotifications()` | `GET /me/notifications` | `ActivityWithActor[]` |
| `dashboard.getDashboardSummary()` | `GET /dashboard/summary` | `DashboardSummary` |
| `search.searchWorkspace(q)` | `GET /search?q=` | `SearchResult[]` |

Views such as `mine` and `assigned` depend on the signed-in user. The API derives that user from the auth token, so the frontend never sends a user id.

### Logic that moves to the API

These rules currently live in the mock services and must be implemented server-side, inside a transaction with the change they belong to:

| Rule | Mock location |
| --- | --- |
| Approval routing (Facilities → Operations, spend → Finance, never the requester) | `routeApproval()` in `services/requests.ts` |
| Approval gate (can't start or complete until approved) | `isBlockedByApproval()` in `services/requests.ts`. Keep this export for the UI, or have the API return allowed transitions. |
| Approving moves the request to *In progress* | `approveRequest()` |
| Every mutation writes an activity event | `recordActivity()` in `services/activity.ts` (delete it in Phase 2) |
| Deleting a request removes its approval and unlinks tasks | `deleteRequest()` |

## 3. Where PostgreSQL connects

PostgreSQL sits **behind the REST API**. The Astro app never connects to the database directly: it doesn't need `DATABASE_URL` or a database driver, and SQL never reaches the browser bundle.

The types in `src/types/index.ts` map one-to-one to tables. Here is a starting schema:

```sql
create type user_role        as enum ('admin', 'manager', 'member');
create type priority         as enum ('low', 'medium', 'high');
create type request_status   as enum ('new', 'in_review', 'in_progress', 'completed');
create type request_category as enum ('it_equipment', 'software_access', 'facilities', 'design', 'finance', 'people');
create type approval_status  as enum ('pending', 'approved', 'rejected');
create type project_status   as enum ('planning', 'on_track', 'at_risk', 'completed');
create type task_status      as enum ('todo', 'in_progress', 'done');
create type entity_type      as enum ('request', 'project', 'task');

create table users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  title         text not null default '',
  team          text not null,
  role          user_role not null default 'member',
  avatar_color  text not null default 'slate',
  created_at    timestamptz not null default now()
);

create sequence request_number_seq start 1001;

create table requests (
  id            text primary key default 'REQ-' || nextval('request_number_seq'),
  title         text not null check (char_length(title) between 4 and 120),
  description   text not null check (char_length(description) between 10 and 2000),
  category      request_category not null,
  priority      priority not null default 'medium',
  status        request_status not null default 'new',
  requester_id  uuid not null references users(id),
  assignee_id   uuid references users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on requests (status);
create index on requests (requester_id);
create index on requests (assignee_id);

create table approvals (
  id            uuid primary key default gen_random_uuid(),
  request_id    text not null unique references requests(id) on delete cascade,
  approver_id   uuid not null references users(id),
  status        approval_status not null default 'pending',
  requested_at  timestamptz not null default now(),
  decided_at    timestamptz
);

create table projects (
  id            text primary key,
  name          text not null,
  description   text not null default '',
  owner_id      uuid not null references users(id),
  progress      smallint not null default 0 check (progress between 0 and 100),
  status        project_status not null default 'planning',
  start_date    date not null,
  due_date      date not null
);

create table project_members (
  project_id    text references projects(id) on delete cascade,
  user_id       uuid references users(id) on delete cascade,
  primary key (project_id, user_id)
);

create table tasks (
  id            text primary key,
  title         text not null,
  description   text,
  project_id    text references projects(id) on delete set null,
  request_id    text references requests(id) on delete set null,
  assignee_id   uuid not null references users(id),
  priority      priority not null default 'medium',
  status        task_status not null default 'todo',
  due_date      date not null,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index on tasks (assignee_id, status);
create index on tasks (project_id);

create table activity_events (
  id            bigint generated always as identity primary key,
  type          text not null,          -- created | status_changed | assigned | approved | commented | completed | progress_updated | deleted
  actor_id      uuid not null references users(id),
  entity_type   entity_type not null,
  entity_id     text not null,          -- no FK: history survives deletes
  entity_title  text not null,          -- snapshot for readable history
  meta          jsonb not null default '{}',   -- { from, to, comment, assigneeId }
  created_at    timestamptz not null default now()
);
create index on activity_events (entity_type, entity_id, created_at);
create index on activity_events (created_at desc);
```

The seed files in `src/data/` can be turned into SQL `insert`s for a local development database.

## 4. Authentication

| Where | What to do |
| --- | --- |
| `src/middleware.ts` | Read the session cookie, verify it with the API or auth provider (`GET /me`), redirect to `/login` when it's missing, and store `user` and `token` on `context.locals`. |
| `src/env.d.ts` | Add `token: string` to `App.Locals`. |
| `src/services/users.ts` | `getCurrentUser()` calls `GET /me`. Delete `currentUserId()` and `MOCK_CURRENT_USER_ID`. |
| `src/services/http.ts` | Pass the token (`Authorization: Bearer …`). Services can receive it as a parameter from pages and actions (`Astro.locals.token`, `context.locals.token`), or read it from request-scoped storage. |
| `src/components/layout/UserMenu.astro` | Enable **Sign out**. |
| New `src/pages/login.astro` | Sign-in page using `BaseLayout` (no app shell). |

## 5. Migration checklist

1. Build the REST API and database from the schema above. Seed it from `src/data`.
2. Set `API_BASE_URL` in `.env`.
3. Migrate services one file at a time (read functions first, then mutations). Run `npm run check`, then click through the affected pages.
4. Implement auth (section 4).
5. Replace client-only settings: notification preferences and read state (`scripts/notifications.ts`, `scripts/settings.ts`), and the workspace name.
6. Delete the mock layer: `src/data/store.ts`, `src/data/time.ts`, `src/data/mock*.ts`, `simulateLatency`, `recordActivity` and the `MOCK_LATENCY` env var.

After step 6, `grep -rn "TODO(api)\|TODO(auth)\|@/data/" src` should return nothing.
