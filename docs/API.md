# CinnabyteHQ REST API

Every read and write in CinnabyteHQ goes through this API: the browser, the server-rendered pages and the dashboard's server islands all use the same endpoints through one typed client (`src/lib/api/client.ts`).

```
UI (browser / SSR pages) ──► /api/* (src/pages/api) ──► services (src/services) ──► Supabase ──► PostgreSQL
```

- **Base URL:** `/api` on the app's own origin, for example `http://localhost:4321/api`.
- **Format:** JSON in, JSON out. Field names are `snake_case` and match the database columns.
- **IDs:** UUIDs. Requests also have a human-readable `number` (shown as `REQ-1041`).
- **Timestamps:** ISO 8601 in UTC (`2026-09-23T12:11:09.658675+00:00`). Calendar dates such as `due_date` use `YYYY-MM-DD`.

## Contents

- [Conventions](#conventions): envelope, errors, status codes, content type, the acting user
- [Health](#health)
- [Profiles](#profiles)
- [Requests](#requests)
- [Approvals](#approvals)
- [Projects](#projects)
- [Tasks](#tasks)
- [Activity and notifications](#activity-and-notifications)
- [Dashboard and search](#dashboard-and-search)

---

## Conventions

### Response envelope

Success:

```json
{ "data": { "id": "…" } }
```

List endpoints may add `meta`, for example totals and per-tab counts:

```json
{ "data": [ … ], "meta": { "total": 12, "counts": { "all": 12, "mine": 2 } } }
```

Error:

```json
{
  "error": {
    "message": "Some fields are missing or invalid.",
    "code": "BAD_REQUEST",
    "fields": { "title": "Title must be at least 4 characters." }
  }
}
```

- `message` is always written for people and is safe to show in the UI.
- `code` is stable and machine-readable (see the table below).
- `fields` appears on validation errors and maps each field to its message. Unknown fields are rejected under the key `body`.
- **Database errors are never exposed.** The service layer logs the real error on the server and maps it to a code and a plain-language message, such as "We couldn't create the request. Please try again."

### Status codes

| Status | `code` | When |
| --- | --- | --- |
| `200 OK` | – | Successful read or update |
| `201 Created` | – | Successful create (`POST`) |
| `204 No Content` | – | Successful delete (empty body) |
| `400 Bad Request` | `BAD_REQUEST` | Invalid JSON, a missing or invalid field, an unknown field, or an invalid query parameter |
| `403 Forbidden` | `FORBIDDEN` | The acting user isn't allowed to do this (see each endpoint) |
| `403 Forbidden` | – (plain text) | Astro's CSRF check: a non-`GET` request without a JSON `Content-Type` and without a same-origin `Origin` header |
| `404 Not Found` | `NOT_FOUND` | The id doesn't exist, or isn't a valid UUID |
| `409 Conflict` | `CONFLICT` | The change breaks a workflow rule (for example, starting a request that is still waiting for approval) or someone else changed the record first |
| `500 Internal Server Error` | `INTERNAL` | Unexpected failure. The details are logged on the server only. |
| `503 Service Unavailable` | `NOT_CONFIGURED` | Supabase environment variables are missing or wrong, the migration hasn't run, or the development user doesn't exist. The message says what to fix. |
| `503 Service Unavailable` | `UNAVAILABLE` | The database can't be reached right now |

### Content type and CSRF

Send `Content-Type: application/json` on every `POST`, `PATCH` and `DELETE`, including those without a body. Astro's built-in origin check (`security.checkOrigin`) rejects form-style cross-site submissions. A JSON content type can't be sent cross-site without a CORS preflight, which this API doesn't allow. The bundled client does this for you.

```bash
curl -X POST http://localhost:4321/api/requests \
  -H 'Content-Type: application/json' \
  -d '{"title":"New monitors","description":"Two 27-inch monitors for the support desk.","category":"it_equipment","priority":"high"}'
```

### The acting user (development only)

> **There is no authentication yet.** Every request acts as the profile whose email is `DEV_USER_EMAIL` (default: `alex.johnson@cinnabyte.io`, an admin). This is a development convenience, **not** security: anyone who can reach the server can call the API as that user. Don't deploy this build publicly.

The acting user decides the `mine` and `assigned` views, who is recorded as the actor in the activity log, and the permission checks listed below. When Supabase Auth is added, the middleware will read the session instead, and the API contract won't change. See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md#authentication).

### Shared shapes

`Profile`, which is embedded wherever a person appears (`requester`, `assignee`, `approver`, `owner`, `user`):

```json
{
  "id": "10000000-0000-4000-8000-000000000004",
  "full_name": "Emma Garcia",
  "email": "emma.garcia@cinnabyte.io",
  "avatar_url": null,
  "role": "member",
  "job_title": "Product Designer",
  "team": "Design",
  "created_at": "2025-11-27T12:23:09.658675+00:00"
}
```

Enumerations:

| Field | Values |
| --- | --- |
| `role` | `admin`, `manager`, `member` |
| `priority` | `low`, `medium`, `high` |
| request `category` | `it_equipment`, `software_access`, `facilities`, `design`, `finance`, `people` |
| request `status` | `new`, `in_review`, `in_progress`, `completed`, `rejected` |
| approval `status` | `pending`, `approved`, `rejected` |
| project `status` | `planning`, `in_progress`, `on_hold`, `completed` |
| task `status` | `todo`, `in_progress`, `completed` |
| activity `action` | `created`, `updated`, `status_changed`, `assigned`, `approved`, `rejected`, `commented`, `completed`, `progress_updated`, `deleted` |

---

## Health

### `GET /api/health`

Checks whether the app is ready: are the environment variables set, can the server reach the database with the service key, does the schema exist, and does the development user exist? The `/setup` page is built on this endpoint.

**Response:** `200` when everything is ready, otherwise `503`. The body is the same in both cases:

```json
{
  "data": {
    "ok": false,
    "checks": {
      "env": { "supabase_url": true, "service_role_key": true, "anon_key": false },
      "database": { "ok": false, "message": "The database schema is missing or out of date. Run supabase/migrations/001_initial_schema.sql in the Supabase SQL Editor." },
      "dev_user": { "ok": false, "email": "alex.johnson@cinnabyte.io", "message": "Waiting for the database." }
    }
  }
}
```

The report never includes key values, only whether each one is set.

---

## Profiles

### `GET /api/profiles`

Lists everyone in the workspace, sorted by name.

**Response `200`:** `{ "data": Profile[] }`

### `GET /api/profiles/me`

Returns the acting user, which for now is the development user.

**Response `200`:** `{ "data": Profile }`

### `GET /api/profiles/:id`

**Response `200`:** `{ "data": Profile }`
**Errors:** `404` if the person doesn't exist.

### `PATCH /api/profiles/:id`

Updates a profile. You can edit your own profile. Admins can edit anyone's.

**Body** (send at least one field):

| Field | Type | Rules |
| --- | --- | --- |
| `full_name` | string | 2–120 characters |
| `job_title` | string \| null | Up to 80 characters. An empty value becomes `null`. |
| `team` | string \| null | Up to 60 characters. An empty value becomes `null`. |
| `avatar_url` | string \| null | A valid URL |

`email` and `role` can't be changed here. Email is the person's identity: the development user is looked up by it today, and Supabase Auth will own it later. Roles will be managed by admins once auth exists.

**Response `200`:** `{ "data": Profile }`
**Errors:** `400` for validation errors (including sending `email`), `403` when editing someone else's profile without being an admin, `404` if the person doesn't exist.

---

## Requests

A request (`Request`) has `id`, `number`, `title`, `description`, `category`, `priority`, `status`, `requester_id`, `assignee_id`, `created_at` and `updated_at`. The API returns it with its relations embedded:

```json
{
  "id": "30000000-0000-4000-8000-000000001041",
  "number": 1041,
  "title": "Laptop replacement for design work",
  "description": "My 2019 MacBook Pro struggles with large Figma files…",
  "category": "it_equipment",
  "priority": "high",
  "status": "in_review",
  "requester_id": "10000000-0000-4000-8000-000000000004",
  "assignee_id": "10000000-0000-4000-8000-000000000005",
  "created_at": "2026-09-22T10:23:09.658675+00:00",
  "updated_at": "2026-09-23T12:11:09.658675+00:00",
  "requester": { "…": "Profile" },
  "assignee": { "…": "Profile or null" },
  "approval": {
    "id": "50000000-0000-4000-8000-000000000006",
    "request_id": "30000000-0000-4000-8000-000000001041",
    "approver_id": "10000000-0000-4000-8000-000000000002",
    "status": "pending",
    "comment": null,
    "approved_at": null,
    "created_at": "2026-09-22T16:23:09.658675+00:00",
    "approver": { "…": "Profile" }
  }
}
```

`approval` is the request's most recent approval, or `null` if there is none.

#### Workflow rules (enforced by the API, mirrored in the UI)

```
new ──► in_review ──► in_progress ──► completed
            └──────► rejected
```

- **IT & Equipment**, **Facilities** and **Finance** requests need an approval. When one moves to `in_review`, the API creates a pending approval. Facilities requests are routed to an Operations manager or admin, and spending requests to Finance. A request is never routed to its own requester: if nobody on the right team can approve it, it goes to an admin.
- While an approval is pending, or when a request needs an approval that hasn't been granted, moving it to `in_progress` or `completed` returns **`409`**. Approving moves the request to `in_progress`, and rejecting moves it to `rejected`.
- A request with a pending approval can't be set to `rejected` directly. Reject the approval instead (`409`).
- Every change is written to `activity_logs` by the server: `created`, `status_changed`, `assigned`, `updated`, `commented`, `deleted`.

### `GET /api/requests`

Lists requests, newest activity first.

**Query parameters** (all optional):

| Param | Values | Notes |
| --- | --- | --- |
| `view` | `all` (default), `mine`, `assigned`, `awaiting_approval` | `mine` means requested by the acting user, `assigned` means assigned to them, and `awaiting_approval` means the request has a pending approval |
| `status` | request status | |
| `priority` | `low`, `medium`, `high` | |
| `q` | text, up to 100 characters | Searches the title and description. `1041` or `REQ-1041` also matches by number. |
| `limit` | 1–500 | |

**Response `200`:**

```json
{
  "data": [ RequestWithRelations, … ],
  "meta": {
    "total": 1,
    "counts": { "all": 12, "mine": 2, "assigned": 4, "awaiting_approval": 3 }
  }
}
```

`meta.total` is the number of results for this query. `meta.counts` is the size of each view, ignoring the other filters, and drives the tab badges.

**Errors:** `400` for an invalid parameter.

### `POST /api/requests`

Creates a request. The acting user becomes the requester, and the status starts at `new`.

**Body:**

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | Required, 4–120 characters |
| `description` | string | Required, 10–2000 characters |
| `category` | request category | Required |
| `priority` | priority | Required |
| `assignee_id` | uuid \| null | Optional |

**Response `201`:** `{ "data": RequestWithRelations }`
**Errors:** `400` for validation errors, or when `assignee_id` doesn't match a person.

### `GET /api/requests/:id`

**Response `200`:** `{ "data": RequestWithRelations }`
**Errors:** `404`.

### `PATCH /api/requests/:id`

Updates any combination of fields. This is also how status changes and assignment happen.

**Body** (send at least one field): `title`, `description`, `category`, `priority`, `status`, `assignee_id` (uuid or `null` to unassign), with the same rules as create.

```json
{ "status": "in_review" }
```

**Response `200`:** `{ "data": RequestWithRelations }`. The response includes a newly created approval if the change triggered one.
**Errors:** `400` for validation errors, `404` if the request doesn't exist, `409` if a workflow rule blocks the change. The message explains why, for example "This request is waiting for approval."

### `DELETE /api/requests/:id`

Deletes a request and its approvals. The request's activity history is kept, with its reference set to `null` and its title still in `metadata`, and a `deleted` event is logged. Only the requester or an admin can delete.

**Response `204`** (empty body).
**Errors:** `403`, `404`.

### `POST /api/requests/:id/comments`

Adds a comment to the request's timeline. Comments are stored as `commented` activity events.

**Body:** `{ "comment": "Checked stock with the vendor." }` (1–1000 characters)

**Response `201`:**

```json
{ "data": { "request_id": "30000000-…-000000001041", "comment": "Checked stock with the vendor." } }
```

**Errors:** `400`, `404`.

---

## Approvals

An `Approval` has `id`, `request_id`, `approver_id`, `status`, `comment`, `approved_at` (set when it's decided, whether approved or rejected) and `created_at`. There is at most one pending approval per request.

### `GET /api/approvals`

**Query parameters:** `status` (`pending`, `approved` or `rejected`) and `request_id` (uuid). Both are optional.

**Response `200`:**

```json
{
  "data": [
    {
      "id": "50000000-0000-4000-8000-000000000006",
      "request_id": "30000000-0000-4000-8000-000000001041",
      "approver_id": "10000000-0000-4000-8000-000000000002",
      "status": "pending",
      "comment": null,
      "approved_at": null,
      "created_at": "2026-09-22T16:23:09.658675+00:00",
      "approver": { "…": "Profile" },
      "request": {
        "id": "30000000-0000-4000-8000-000000001041",
        "number": 1041,
        "title": "Laptop replacement for design work",
        "category": "it_equipment",
        "priority": "high",
        "status": "in_review",
        "created_at": "2026-09-22T10:23:09.658675+00:00",
        "requester": { "…": "Profile" }
      }
    }
  ],
  "meta": { "counts": { "pending": 3, "approved": 2, "rejected": 1 } }
}
```

Approvals are listed newest first. `meta.counts` holds the total for each status, whatever filter is applied, and drives the tab badges.

### `POST /api/approvals/:id/approve`

Approves a pending approval. This moves the request to `in_progress` and logs an `approved` event. Only the assigned approver or an admin can decide.

**Body** (optional): `{ "comment": "Approved — within budget." }` (up to 1000 characters)

**Response `200`:** `{ "data": ApprovalWithRelations }`
**Errors:** `403` (not the approver), `404`, and `409` if the approval was already decided, including by someone else a moment earlier.

### `POST /api/approvals/:id/reject`

Rejects a pending approval. This moves the request to `rejected` and logs a `rejected` event. The reason is shown to the requester.

**Body:** `{ "comment": "Please reuse a spare laptop from inventory first." }` (required, 3–1000 characters)

**Response `200`:** `{ "data": ApprovalWithRelations }`
**Errors:** `400` (the reason is missing or too short), `403`, `404`, `409`.

---

## Projects

A `Project` has `id`, `name`, `description`, `owner_id`, `status`, `progress` (0–100), `created_at` and `updated_at`. The API embeds the owner and computes task counts:

```json
{
  "id": "20000000-0000-4000-8000-000000000001",
  "name": "Website Redesign",
  "description": "…",
  "owner_id": "10000000-0000-4000-8000-000000000004",
  "status": "in_progress",
  "progress": 82,
  "created_at": "…",
  "updated_at": "…",
  "owner": { "…": "Profile" },
  "task_count": 4,
  "completed_task_count": 2
}
```

### `GET /api/projects`

**Query parameters:** `status` (a project status) and `active` (`true` excludes completed projects, `false` returns only completed ones). Active projects come first, then projects with the most recent activity.

**Response `200`:** `{ "data": ProjectWithRelations[] }`

### `POST /api/projects`

**Body:**

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | Required, 2–80 characters |
| `description` | string | Required, 1–1000 characters |
| `owner_id` | uuid | Required |
| `status` | project status | Optional, defaults to `planning` |
| `progress` | integer | Optional, 0–100, defaults to 0 |

**Response `201`:** `{ "data": ProjectWithRelations }` (logs `created`)
**Errors:** `400`.

### `GET /api/projects/:id`

**Response `200`:** `{ "data": ProjectWithRelations }`
**Errors:** `404`.

### `PATCH /api/projects/:id`

**Body:** any of the create fields (at least one).

**Response `200`:** `{ "data": ProjectWithRelations }`. The server logs `status_changed`, `progress_updated` or `updated`, as appropriate.
**Errors:** `400`, `404`.

### `DELETE /api/projects/:id`

Deletes the project **and its tasks**. Only the owner or an admin can delete.

**Response `204`**.
**Errors:** `403`, `404`.

---

## Tasks

A `Task` has `id`, `title`, `description`, `project_id`, `assignee_id`, `priority`, `status`, `due_date` (`YYYY-MM-DD` or `null`), `created_at` and `updated_at`:

```json
{
  "id": "40000000-0000-4000-8000-000000000001",
  "title": "Review the Room 2B display replacement quote",
  "description": "Check the $1,180 quote against the facilities budget before approving REQ-1040.",
  "project_id": "20000000-0000-4000-8000-000000000004",
  "assignee_id": "10000000-0000-4000-8000-000000000001",
  "priority": "high",
  "status": "todo",
  "due_date": "2026-09-23",
  "created_at": "…",
  "updated_at": "…",
  "project": { "id": "20000000-0000-4000-8000-000000000004", "name": "Second-floor Office Move", "status": "in_progress" },
  "assignee": { "…": "Profile or null" }
}
```

### `GET /api/tasks`

Open tasks come first, ordered by due date (earliest first, tasks without a due date last). Completed tasks come last, most recently updated first.

**Query parameters** (all optional):

| Param | Values |
| --- | --- |
| `view` | `all` (default), `mine` (assigned to the acting user), `completed` |
| `project_id` | uuid |
| `assignee_id` | uuid |
| `status` | task status |
| `priority` | priority |
| `q` | Text search over the title and description, up to 100 characters |
| `limit` | 1–500 |

**Response `200`:**

```json
{ "data": [ TaskWithRelations, … ], "meta": { "total": 15, "counts": { "all": 15, "mine": 6, "completed": 4 } } }
```

### `POST /api/tasks`

**Body:**

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | Required, 2–160 characters |
| `description` | string \| null | Optional, up to 2000 characters |
| `project_id` | uuid | Required |
| `assignee_id` | uuid \| null | Optional |
| `priority` | priority | Required |
| `status` | task status | Required |
| `due_date` | `YYYY-MM-DD` \| null | Optional |

**Response `201`:** `{ "data": TaskWithRelations }` (logs `created`)
**Errors:** `400`, including when the project or assignee doesn't exist.

### `GET /api/tasks/:id`

**Response `200`:** `{ "data": TaskWithRelations }`
**Errors:** `404`.

### `PATCH /api/tasks/:id`

Updates any of the create fields. Common calls:

```json
{ "status": "completed" }
{ "assignee_id": "10000000-0000-4000-8000-000000000004" }
{ "assignee_id": null }
```

**Response `200`:** `{ "data": TaskWithRelations }`. The server logs `completed`, `status_changed`, `assigned` or `updated`, as appropriate.
**Errors:** `400`, `404`.

### `DELETE /api/tasks/:id`

**Response `204`** (logs `deleted`).
**Errors:** `404`.

---

## Activity and notifications

Activity is **written only by the server**, as a side effect of the endpoints above. There is no endpoint that creates arbitrary activity.

An `ActivityLog` has `id`, `user_id`, `request_id`, `project_id`, `task_id`, `action`, `description`, `metadata` and `created_at`. The API adds display fields derived from the embedded relations:

```json
{
  "id": "99797553-63b5-4054-be5a-6d9c45c4abb2",
  "user_id": "10000000-0000-4000-8000-000000000005",
  "request_id": "30000000-0000-4000-8000-000000001041",
  "project_id": null,
  "task_id": null,
  "action": "commented",
  "description": "commented on REQ-1041",
  "metadata": { "entity": "request", "title": "Laptop replacement for design work", "comment": "Vendor quote is attached." },
  "created_at": "2026-09-23T12:11:09.658675+00:00",
  "user": { "…": "Profile or null" },
  "entity": "request",
  "entity_id": "30000000-0000-4000-8000-000000001041",
  "entity_title": "Laptop replacement for design work",
  "entity_ref": "REQ-1041",
  "href": "/requests/30000000-0000-4000-8000-000000001041"
}
```

`metadata` can hold `from` and `to` (status or progress changes), `comment`, and `assignee_id` with `assignee_name`. It always holds `entity` and `title`, so history stays readable after the record is deleted.

### `GET /api/activity`

Returns activity, newest first.

**Query parameters** (all optional): `entity` (`request`, `project` or `task`), `request_id`, `project_id`, `task_id`, and `limit` (1–200, default 100).

**Response `200`:** `{ "data": ActivityWithRelations[] }`

### `GET /api/notifications`

Returns recent activity **by other people** that involves the acting user: their requests, requests or tasks assigned to them, and projects they own.

**Response `200`:** `{ "data": ActivityWithRelations[] }` (up to 8)

---

## Dashboard and search

### `GET /api/dashboard`

Returns the Overview page's metrics, computed from the database.

**Response `200`:**

```json
{
  "data": {
    "active_requests": { "count": 9, "opened_this_week": 7 },
    "in_progress": { "count": 4, "high_priority": 2 },
    "awaiting_approval": { "count": 3, "waiting_on_you": 1 },
    "completed": { "count": 2, "last_seven_days": 2 },
    "status_breakdown": [
      { "status": "new", "count": 2 },
      { "status": "in_review", "count": 3 },
      { "status": "in_progress", "count": 4 },
      { "status": "completed", "count": 2 },
      { "status": "rejected", "count": 1 }
    ],
    "total": 12,
    "needs_attention": [
      { "request": { "…": "RequestWithRelations" }, "reason": "Awaiting Sarah" }
    ]
  }
}
```

`needs_attention` lists up to 4 open requests. Each one's `reason` is the first that applies: waiting on an approver (`Awaiting Sarah`), `Unassigned`, `High priority` or `Needs triage` (still new).

### `GET /api/search?q=`

Returns up to 5 matches each from requests (by title, description or number), projects and tasks. The command palette uses this endpoint.

**Response `200`:**

```json
{
  "data": [
    {
      "type": "request",
      "id": "30000000-0000-4000-8000-000000001037",
      "title": "VPN access for the remote QA team",
      "subtitle": "REQ-1037 · In progress",
      "href": "/requests/30000000-0000-4000-8000-000000001037"
    }
  ]
}
```

An empty `q` returns `[]`.
