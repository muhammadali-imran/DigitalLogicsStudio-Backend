# Backend Database Schema

The backend currently uses one primary MongoDB collection: `users`. Learning progress is embedded inside the user document for fast profile hydration and a simple MVP data model.

## User Collection

Mongoose model: `src/models/User.js`

```js
{
  name: String,
  email: String,
  password: String,
  solvedProblems: [Number],
  problemProgress: [ProblemProgress],
  topicProgress: [TopicProgress],
  activityLog: [ActivityDay],
  recentEvents: [RecentEvent],
  createdAt: Date,
  updatedAt: Date
}
```

## User Fields

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | Required, trimmed, 2 to 60 characters. |
| `email` | String | Required, unique, trimmed, lowercase. |
| `password` | String | Required, min 8, excluded by default with `select: false`. |
| `solvedProblems` | Number array | Legacy flat array kept for compatibility with frontend auth state. |
| `problemProgress` | Embedded array | Rich per-problem learning state. |
| `topicProgress` | Embedded array | Per-topic completion state. |
| `activityLog` | Embedded array | Daily counters keyed by date. |
| `recentEvents` | Embedded array | Most recent activity feed entries, capped at 30. |

## Password Storage

Passwords are never stored in plaintext. A `pre("save")` hook hashes modified passwords with bcrypt before persistence. Credential checks use the model method `matchPassword`.

## ProblemProgress

```js
{
  problemId: Number,
  title: String,
  tags: [String],
  topicId: String | null,
  status: "not_started" | "attempted" | "solved",
  attempts: Number,
  openedAt: Date | null,
  lastAttemptAt: Date | null,
  solvedAt: Date | null
}
```

Design notes:

- `problemId` is numeric because the frontend problem catalog uses numeric IDs.
- `status` is denormalized for fast filtering.
- `solvedAt` remains stable once solved unless explicitly uncompleted.
- `solvedProblems` mirrors solved IDs for legacy UI compatibility.

## TopicProgress

```js
{
  topicId: String,
  title: String,
  status: "not_started" | "in_progress" | "completed",
  openedAt: Date | null,
  completedAt: Date | null,
  completionPercentage: Number,
  completedSubtopics: [String],
  totalSubtopics: Number
}
```

Completion is recalculated when a topic is opened or a subtopic is toggled.

## ActivityDay

```js
{
  dateKey: "YYYY-MM-DD",
  attempts: Number,
  solved: Number,
  topicsCompleted: Number,
  topicsOpened: Number
}
```

This structure is optimized for calendar and streak displays. It is not a full audit log.

## RecentEvent

```js
{
  id: String,
  type: String,
  createdAt: Date,
  problemId: Number | null,
  topicId: String | null,
  subtopicId: String | null,
  title: String
}
```

Recent events provide a lightweight activity feed. The array is capped at 30 entries to control document growth.

## Indexes and Constraints

Current explicit schema constraints:

- Unique `email`.
- Mongoose timestamp indexes are not explicitly declared.

Recommended production indexes:

```js
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ updatedAt: -1 });
```

If progress volume grows, migrate embedded progress into separate collections:

- `user_problem_progress`: unique `{ userId: 1, problemId: 1 }`
- `user_topic_progress`: unique `{ userId: 1, topicId: 1 }`
- `activity_events`: `{ userId: 1, occurredAt: -1 }`
- `daily_activity_rollups`: unique `{ userId: 1, dateKey: 1 }`

## Data Integrity Practices

- Normalize emails before user creation and login.
- Use model helpers to initialize progress entries instead of building objects in many controllers.
- Keep response sanitization centralized so `password` never leaves the API.
- Keep progress writes idempotent where user actions may be retried.
- Use migration scripts for schema changes once real users exist.



---

## Circuit Collection

Mongoose model: `src/models/Circuit.js`

Each saved circuit is its own document, linked to the user via `userId`.

```js
{
  userId: ObjectId,       // ref → User
  name: String,           // unique per user, max 100 chars
  gates: [Gate],
  wires: [Wire],
  gateIdCounter: Number,
  wireIdCounter: Number,
  inputCounter: Number,
  outputCounter: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Gate sub-document

```js
{
  id: Number,
  type: String,           // "INPUT" | "OUTPUT" | "AND" | "OR" | "NOT" | etc.
  label: String,
  x: Number,
  y: Number,
  inputs: Number,
  hasOutput: Boolean,
  inputValues: [Boolean]
}
```

### Wire sub-document

```js
{
  id: Number,
  fromId: Number,
  toId: Number,
  toIndex: Number
}
```

### Indexes

```js
db.circuits.createIndex({ userId: 1 });                         // list all circuits for a user
db.circuits.createIndex({ userId: 1, name: 1 }, { unique: true }); // enforce unique name per user
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/circuits` | List all circuits for authenticated user |
| POST | `/api/circuits` | Save (upsert) a circuit by name |
| GET | `/api/circuits/:id` | Get a single circuit |
| DELETE | `/api/circuits/:id` | Delete a circuit |

All endpoints require authentication (`protect` middleware).
