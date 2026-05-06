# Project Documentation

> Language-agnostic, framework-agnostic feature planning workspace.
> Every feature starts here before a single line of implementation code is written.

## Philosophy

1. **Plan before code** — No implementation without documentation
2. **Update as you go** — Docs evolve with the codebase
3. **One source of truth** — If it's not in `/docs`, it doesn't exist
4. **AI-friendly structure** — Predictable paths, consistent patterns

## Folder Structure

| Folder                | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `00-architecture/`    | System design, decisions, ADRs              |
| `01-database/`        | Schema designs, migrations, indexing        |
| `02-modules/`         | Module boundaries, interfaces, dependencies |
| `03-integrations/`    | External APIs, webhooks, third-party        |
| `04-background-jobs/` | Queues, workers, scheduling                 |
| `05-business-flows/`  | Domain logic, state machines, sequences     |
| `06-api-endpoints/`   | Endpoint specs, request/response, auth      |
| `07-testing-guide/`   | Test strategies, fixtures, coverage         |

## Workflow

### Phase 1: Discovery

- Write `feature-request-{slug}.md` in root `/docs`
- Define scope, constraints, success criteria

### Phase 2: Design

- Create/update files in numbered folders
- Write business flows first
- Design database schema
- Define API contracts

### Phase 3: Review

- Check for gaps, race conditions, edge cases
- Update TEST_PLAN.md

### Phase 4: Implementation

- Create implementation ticket referencing docs
- Update docs as reality diverges from plan

### Phase 5: Post-Release

- Mark flows as `status: stable`
- Archive outdated versions

## Naming Conventions

- **Folders**: `00-99-kebab-case` (numbered for sort order)
- **Files**: `kebab-case-descriptive-name.md`
- **Images**: `YYYYMMDD-context-description.png`
- **ADRs**: `ADR-NNNN-short-title.md`
- **Feature requests**: `feature-request-{slug}.md`

## Status Tags

Use these at the top of every document:

```yaml
---
status: draft | review | approved | implemented | deprecated | stable
created: YYYY-MM-DD
updated: YYYY-MM-DD
author: @username
scope: feature-name
---
```

```

## Quick Start

1. Copy `templates/` to create new docs
2. Start with `05-business-flows/` for domain logic
3. Work outward to API and database

```

---

## TEST_PLAN.md

```markdown
---
status: draft
created: 2026-05-06
updated: 2026-05-06
---

# Test Plan

## Overview

Consolidated testing strategy across all features.

## Test Levels

### Unit Tests

- **Scope**: Individual modules, pure functions
- **Location**: `{module}/tests/unit/`
- **Coverage Target**: 80%+ logic branches

### Integration Tests

- **Scope**: Module interactions, database layer
- **Location**: `{module}/tests/integration/`
- **Focus**: Repository patterns, service boundaries

### API Tests

- **Scope**: Endpoint contracts, auth, validation
- **Location**: `tests/api/`
- **Tools**: Contract testing, OpenAPI validation

### E2E Tests

- **Scope**: Critical user journeys
- **Location**: `tests/e2e/`
- **Flows**: Registration → Purchase → Completion

### Background Job Tests

- **Scope**: Idempotency, retry logic, dead letter
- **Location**: `tests/jobs/`

## Test Data Strategy

| Type        | Strategy            | Cleanup              |
| ----------- | ------------------- | -------------------- |
| Unit        | Factories, fakers   | Auto                 |
| Integration | Test DB per worker  | Transaction rollback |
| API         | Seeded fixtures     | After suite          |
| E2E         | Staging environment | Nightly reset        |

## Feature Test Checklist

Before marking a feature complete:

- [ ] Unit tests for all new pure functions
- [ ] Integration tests for DB operations
- [ ] API tests for new endpoints
- [ ] Business flow tested with edge cases
- [ ] Background jobs tested for failures
- [ ] Rate limiting tested
- [ ] Auth/authorization tested
- [ ] Idempotency keys tested (where applicable)

## Regression Prevention

- Snapshot tests for API responses
- Golden masters for report generation
- Contract tests for integrations
```

---

## 00-architecture/

### README.md

```markdown
# Architecture

System-level design documents and Architecture Decision Records (ADRs).

## Files

| File                  | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `system-overview.md`  | High-level architecture diagram and concepts |
| `ADR-NNNN-*.md`       | Architecture Decision Records                |
| `tech-stack.md`       | Languages, frameworks, infrastructure        |
| `security-model.md`   | Auth, encryption, threat model               |
| `scaling-strategy.md` | Performance, caching, sharding               |
```

### Template: ADR-NNNN-short-title.md

```markdown
---
status: proposed | accepted | deprecated | superseded
date: YYYY-MM-DD
deciders: @author
---

# ADR-NNNN: Title

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing or have agreed to implement?

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive

-

### Negative

-

### Risks

-

## Alternatives Considered

| Option | Pros | Cons | Verdict  |
| ------ | ---- | ---- | -------- |
| A      |      |      | Rejected |
| B      |      |      | Accepted |

## References

- Links to related ADRs
- External resources
```

---

## 01-database/

### README.md

```markdown
# Database Design

Schema documentation, migration strategy, and query patterns.

## Files

| File                   | Purpose                         |
| ---------------------- | ------------------------------- |
| `schema-overview.md`   | ER diagram, conventions, naming |
| `table-{name}.md`      | Individual table documentation  |
| `migration-policy.md`  | How to write and run migrations |
| `indexing-strategy.md` | Performance-critical indexes    |
| `data-retention.md`    | Archiving, GDPR, cleanup jobs   |
```

### Template: table-{entity}.md

````markdown
---
status: draft
table: entity_name
engine: postgresql|mysql|mongodb|etc
---

# Table: entity_name

## Purpose

One sentence description.

## Schema

| Column     | Type        | Nullable | Default           | Index | Notes |
| ---------- | ----------- | -------- | ----------------- | ----- | ----- |
| id         | UUID        | NO       | gen_random_uuid() | PK    |       |
| created_at | timestamptz | NO       | now()             |       |       |
| updated_at | timestamptz | NO       | now()             |       |       |

## Constraints

- `UNIQUE(email)`
- `CHECK(price >= 0)`
- `FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE`

## Indexes

```sql
CREATE INDEX idx_entity_status_created
ON entity_name(status, created_at)
WHERE deleted_at IS NULL;
```
````

## Query Patterns

- Lookup by user_id (hot path)
- Range scan by created_at for reporting

## Migration History

| Version | Change        | Date       |
| ------- | ------------- | ---------- |
| 001     | Initial table | YYYY-MM-DD |

````

---

## 02-modules/

### README.md

```markdown
# Modules

Domain module boundaries, interfaces, and dependency graph.

## Files

| File | Purpose |
|------|---------|
| `module-overview.md` | Dependency graph, communication rules |
| `module-{name}.md` | Per-module interface and responsibilities |
| `dependency-rules.md` | Import constraints, forbidden dependencies |
````

### Template: module-{name}.md

```markdown
---
status: draft
module: ModuleName
layer: domain|application|infrastructure
---

# Module: ModuleName

## Responsibility

Single paragraph describing what this module owns.

## Public Interface

### Commands

| Command | Input        | Output  | Side Effects   |
| ------- | ------------ | ------- | -------------- |
| CreateX | CreateXInput | XResult | Emits XCreated |

### Queries

| Query    | Input | Output | Cacheable |
| -------- | ----- | ------ | --------- |
| GetXById | UUID  | XDTO   | 5 min     |

## Dependencies

- **Uses**: `ModuleY`, `ModuleZ`
- **Used By**: `ModuleA`

## Invariants

Rules that must always hold true within this module.

## Error Model

| Error    | Code | Retryable | Description      |
| -------- | ---- | --------- | ---------------- |
| NotFound | 404  | No        | Resource missing |
| Conflict | 409  | No        | State conflict   |

## Testing Strategy

- Mock external deps at boundary
- Property tests for invariant validation
```

---

## 03-integrations/

### README.md

```markdown
# Integrations

External systems, APIs, webhooks, and third-party services.

## Files

| File                        | Purpose                     |
| --------------------------- | --------------------------- |
| `integration-index.md`      | Catalog of all integrations |
| `{service}-integration.md`  | Per-service documentation   |
| `webhook-registry.md`       | Incoming webhook endpoints  |
| `circuit-breaker-config.md` | Resilience patterns         |
```

### Template: {service}-integration.md

````markdown
---
status: draft
service: Stripe|SendGrid|S3|etc
criticality: required|optional|degraded
---

# Integration: ServiceName

## Purpose

Why we integrate with this service.

## Environment Setup

| Env        | Base URL | Auth Method            |
| ---------- | -------- | ---------------------- |
| Sandbox    |          | API Key                |
| Production |          | API Key + IP Whitelist |

## Operations

### Operation: Name

**Endpoint**: `POST /v1/resource`
**Rate Limit**: 100 req/s
**Timeout**: 5s
**Retry**: 3x exponential backoff

#### Request

```json
{
  "field": "type"
}
```
````

#### Response

```json
{
  "id": "string"
}
```

#### Error Handling

| Status | Meaning      | Action          |
| ------ | ------------ | --------------- |
| 429    | Rate limited | Backoff + retry |
| 503    | Service down | Circuit breaker |

## Webhooks (if applicable)

| Event           | Handler        | Idempotency            |
| --------------- | -------------- | ---------------------- |
| payment.success | ProcessPayment | Key: payment_intent_id |

## Failure Scenarios

1. **Network timeout** → Queue for retry
2. **Auth rotation** → Failover to secondary key
3. **Data mismatch** → Alert + manual review queue

````

---

## 04-background-jobs/

### README.md

```markdown
# Background Jobs

Asynchronous processing, queues, workers, and scheduling.

## Files

| File | Purpose |
|------|---------|
| `job-registry.md` | Catalog of all jobs |
| `queue-topology.md` | Queue names, priorities, workers |
| `job-{name}.md` | Individual job documentation |
| `scheduling.md` | Cron jobs, recurring tasks |
````

### Template: job-{name}.md

````markdown
---
status: draft
job: JobName
queue: default|high|low|critical
priority: 1-10
---

# Job: JobName

## Purpose

What this job does and why it must be async.

## Trigger

- [ ] API request
- [ ] Scheduled (cron: `0 */6 * * *`)
- [ ] Event-driven
- [ ] Manual

## Input Payload

```json
{
  "user_id": "uuid",
  "resource_id": "uuid",
  "retry_count": 0
}
```
````

## Processing Steps

1. Validate input
2. Fetch required data
3. Perform operation
4. Emit completion event
5. Cleanup

## Idempotency

**Key**: `{user_id}:{resource_id}:{date}`
**Window**: 24 hours

## Retry Policy

| Attempt | Delay       | Action |
| ------- | ----------- | ------ |
| 1       | 5s          | Retry  |
| 2       | 30s         | Retry  |
| 3       | 5m          | Retry  |
| 4+      | Dead letter | Alert  |

## Failure Handling

- **Partial failure**: Save progress, resume from step
- **Total failure**: Dead letter queue + notification
- **Timeout**: Kill after 5 min, mark failed

## Side Effects

- Database writes
- Emails sent
- Metrics emitted

## Monitoring

| Metric          | Alert Threshold |
| --------------- | --------------- |
| Queue depth     | > 1000          |
| Processing time | p99 > 30s       |
| Error rate      | > 1%            |

````

---

## 05-business-flows/

### README.md

```markdown
# Business Flows

Domain logic, state machines, and process documentation.
These are the most important documents — write these first.

## Files

| File | Domain | Status |
|------|--------|--------|
| `user-registration-flow.md` | Identity | draft |
| `purchase-subscription-flow.md` | Payments | draft |
| `bulk-subscription-flow.md` | Payments | draft |
| `course-completion-flow.md` | Learning | draft |
| `certificate-generation-flow.md` | Learning | draft |
| `points-leaderboard-flow.md` | Gamification | draft |
| `progress-aggregation-flow.md` | Learning | draft |
| `question-submission-flow.md` | Content | draft |
| `search-indexing-flow.md` | Search | draft |
| `event-architecture.md` | Infrastructure | draft |
| `course-resource-archive-plan.md` | Maintenance | draft |

## Flow Document Standard

Every flow must include:
1. Trigger and actors
2. State machine or sequence
3. Pre/post conditions
4. Error branches
5. Idempotency rules
6. Audit requirements
````

### Template: {domain}-flow.md

```markdown
---
status: draft
domain: DomainName
complexity: low|medium|high
risk: low|medium|high
---

# Flow: FlowName

## Overview

One paragraph describing what this flow accomplishes.

## Actors

| Actor  | Role                    |
| ------ | ----------------------- |
| User   | Initiates action        |
| System | Processes automatically |
| Admin  | Reviews exceptions      |

## Trigger

- Event: `UserRegistered`
- API: `POST /api/v1/resource`
- Schedule: Daily at 02:00 UTC

## Pre-Conditions

- [ ] User exists and is active
- [ ] Resource is in `pending` state
- [ ] Quota not exceeded

## State Machine
```

[PENDING] --validate--> [VALIDATED] --process--> [PROCESSING]
|
[FAILED] <--error----------+
|
[COMPLETED] <--success-----+

````

## Happy Path Sequence

```mermaid
sequenceDiagram
    actor U as User
    participant API
    participant Service
    participant DB
    participant Queue

    U->>API: Request action
    API->>Service: Validate
    Service->>DB: Check state
    DB-->>Service: State valid
    Service->>Queue: Enqueue job
    Queue-->>Service: Job ID
    Service-->>API: Accepted (202)
    API-->>U: Reference ID

    Queue->>Service: Process job
    Service->>DB: Update state
    Service->>DB: Write audit log
````

## Error Branches

### Error: Validation Failed

**Cause**: Input fails business rules
**Response**: 422 with field errors
**Side Effects**: None
**Retry**: No

### Error: Concurrent Modification

**Cause**: State changed during processing
**Response**: 409 Conflict
**Side Effects**: None
**Retry**: Yes, with fresh read

### Error: Downstream Timeout

**Cause**: External service unavailable
**Response**: Accepted, async retry
**Side Effects**: Job queued
**Retry**: Exponential backoff, max 5

## Race Conditions

| Scenario           | Mitigation                               |
| ------------------ | ---------------------------------------- |
| Double submit      | Idempotency key: `{user_id}:{action_id}` |
| Concurrent updates | Optimistic locking (version field)       |
| Partial state      | Saga pattern, compensating transactions  |

## Post-Conditions

- [ ] State is terminal (completed/failed)
- [ ] Audit log entry exists
- [ ] Metrics emitted
- [ ] Notifications sent (if applicable)

## Idempotency

**Key Format**: `{actor_id}:{entity_id}:{intent_id}`
**Storage**: Redis, TTL 24h
**Behavior**: Return cached result for duplicate keys

## Audit Requirements

| Field        | Source          |
| ------------ | --------------- |
| actor_id     | JWT sub         |
| action       | Flow name       |
| timestamp    | Server time     |
| before_state | DB snapshot     |
| after_state  | DB snapshot     |
| metadata     | Request context |

## Performance

- Expected volume: X req/min
- SLA: p99 < 200ms (sync), < 5 min (async)
- Bottleneck: External API call (500ms)

## Testing Scenarios

1. Happy path with fresh data
2. Duplicate request (idempotency)
3. Invalid state transition
4. External service timeout
5. Concurrent modification
6. Large payload (stress)
7. Malformed input (security)

````

---

### Specific Flow Files (as listed in your structure)

#### user-registration-flow.md

```markdown
---
status: draft
domain: Identity
complexity: medium
risk: high
---

# Flow: User Registration

## Overview
New user account creation with email verification and welcome onboarding.

## Actors
| Actor | Role |
|-------|------|
| Guest | Provides registration data |
| AuthService | Validates, hashes, stores |
| EmailService | Sends verification |
| OnboardingService | Initializes user profile |

## Trigger
`POST /api/v1/auth/register`

## Pre-Conditions
- [ ] Email not already registered
- [ ] Rate limit: 5 attempts / hour / IP
- [ ] Password meets complexity rules

## State Machine
````

[ANONYMOUS] --register--> [PENDING_VERIFICATION] --verify--> [ACTIVE]
|
[SUSPENDED] <--fraud--+

```

## Happy Path
1. Validate input (email format, password strength)
2. Check email uniqueness (case-insensitive)
3. Hash password (argon2id)
4. Create user record (status: pending_verification)
5. Generate verification token (UUID, 24h expiry)
6. Send verification email async
7. Return 201 with user_id

## Verification Branch
1. User clicks email link / enters code
2. Validate token and expiry
3. Update status: active
4. Create default profile
5. Emit `UserVerified` event
6. Trigger welcome sequence

## Error Branches

### Duplicate Email
- **Response**: 409 (do not reveal existence)
- **Action**: Log for security audit
- **User message**: "If this email exists, check your inbox"

### Rate Limited
- **Response**: 429
- **Headers**: Retry-After

### Weak Password
- **Response**: 422
- **Details**: Specific rule failures

## Security
- Passwords never logged
- Tokens single-use, cryptographically random
- Email enumeration prevented via timing-safe comparison

## GDPR
- Consent recorded with timestamp and IP
- Data processing agreement acknowledged
- Right to deletion documented
```

#### purchase-subscription-flow.md

```markdown
---
status: draft
domain: Payments
complexity: high
risk: high
---

# Flow: Purchase Subscription

## Overview

User purchases a subscription plan, handling payment, entitlement, and receipt.

## Actors

| Actor               | Role                           |
| ------------------- | ------------------------------ |
| User                | Selects plan, provides payment |
| PaymentGateway      | Processes charge               |
| SubscriptionService | Manages entitlements           |
| InvoiceService      | Generates receipt              |

## Trigger

`POST /api/v1/subscriptions`

## Pre-Conditions

- [ ] User authenticated
- [ ] Plan exists and is active
- [ ] No conflicting active subscription
- [ ] Payment method valid

## State Machine
```

[INITIATED] --payment--> [PAYMENT_PENDING] --success--> [ACTIVE]
|
[PAYMENT_FAILED] --retry--> [PAYMENT_PENDING]
|
[CANCELLED] --abandon--+

```

## Happy Path
1. Validate plan and user eligibility
2. Create subscription record (status: initiated)
3. Calculate proration, taxes, discounts
4. Initialize payment with gateway
5. Process payment (3DS if required)
6. On success: activate subscription
7. Grant entitlements immediately
8. Generate invoice
9. Send confirmation email
10. Emit `SubscriptionActivated`

## Error Branches

### Payment Failed
- Update status: payment_failed
- Notify user with retry link
- Preserve cart for 24h
- Auto-retry if configured

### 3DS Required
- Return `requires_action` to client
- Poll for completion
- Timeout after 10 minutes

### Duplicate Purchase
- Idempotency key: `{user_id}:{plan_id}:{date}`
- Return existing subscription if key matches

## Race Conditions
- **Double click**: Idempotency key prevents duplicate charges
- **Plan price change**: Lock plan price at initiation time
- **Concurrent subscriptions**: Unique constraint on user_id + status=active

## Post-Conditions
- [ ] Subscription active with correct dates
- [ ] Invoice generated and stored
- [ ] Entitlements cached
- [ ] Webhook delivered to integrations
```

#### bulk-subscription-flow.md

```markdown
---
status: draft
domain: Payments
complexity: high
risk: medium
---

# Flow: Bulk Subscription

## Overview

Admin or organization purchases multiple subscriptions in a single transaction.

## Actors

| Actor        | Role                            |
| ------------ | ------------------------------- |
| Admin        | Uploads/defines recipient list  |
| Organization | Billing entity                  |
| Recipient    | End user receiving subscription |
| System       | Processes bulk operation        |

## Trigger

`POST /api/v1/subscriptions/bulk`

## Pre-Conditions

- [ ] Admin has org.billing permission
- [ ] Valid payment method on file or invoice approved
- [ ] Recipient list validated (max 10,000)
- [ ] Sufficient inventory (if limited)

## State Machine
```

[DRAFT] --submit--> [VALIDATING] --valid--> [PAYMENT_PENDING]
|
[PROCESSING] <--paid------+
|
[DISTRIBUTING] --done--> [COMPLETED]
|
[PARTIAL_FAILURE] --retry--> [DISTRIBUTING]

```

## Happy Path
1. Validate CSV/list format
2. Check for duplicates within list
3. Validate each recipient (email format, existing users)
4. Calculate total cost
5. Hold inventory if applicable
6. Process payment
7. Create subscriptions for each recipient
8. Send invitation/notification emails
9. Update org billing record

## Error Branches

### Partial Validation Failure
- Return specific row errors
- Allow correction and resubmit
- Do not process partial lists

### Payment Failure
- Release held inventory
- Preserve draft for retry
- Notify admin

### Distribution Failure
- Track per-recipient status
- Allow retry for failed items only
- Report completion percentage

## Idempotency
**Key**: `{org_id}:{bulk_request_id}`
**Behavior**: Return existing result if duplicate

## Performance
- Process in batches of 100
- Queue distribution emails
- Progress endpoint for polling
```

#### course-completion-flow.md

```markdown
---
status: draft
domain: Learning
complexity: medium
risk: low
---

# Flow: Course Completion

## Overview

Tracks learner progress through course modules and marks completion when all requirements met.

## Trigger

- Module progress update
- Scheduled aggregation job
- Manual admin override

## State Machine
```

[NOT_STARTED] --first_module--> [IN_PROGRESS] --all_complete--> [COMPLETED]
|
[ABANDONED] --timeout--+

````

## Completion Rules
- All modules marked complete
- Minimum time spent (if required)
- Assessment passed (if required)
- Survey completed (if required)

## Aggregation Logic
```python
# Pseudocode
def check_completion(enrollment):
    requirements = enrollment.course.requirements
    progress = enrollment.module_progress

    if not all(m.completed for m in progress):
        return False

    if requirements.min_time and enrollment.time_spent < requirements.min_time:
        return False

    if requirements.assessment and not enrollment.assessment_passed:
        return False

    return True
````

## Side Effects on Completion

1. Update enrollment status
2. Award points/XP
3. Check certificate eligibility
4. Update leaderboard
5. Trigger completion email
6. Emit `CourseCompleted` event

## Race Conditions

- **Rapid module completion**: Debounce aggregation (5s)
- **Retroactive requirement add**: Grandfather existing completions

````

#### certificate-generation-flow.md

```markdown
---
status: draft
domain: Learning
complexity: medium
risk: medium
---

# Flow: Certificate Generation

## Overview
Generates verifiable completion certificates for eligible learners.

## Trigger
- Course completion event
- Manual admin request
- Bulk generation job

## Pre-Conditions
- [ ] Course has certificate template
- [ ] Learner meets all certificate requirements
- [ ] Not already generated (idempotent)

## State Machine
````

[ELIGIBLE] --request--> [GENERATING] --success--> [ISSUED]
|
[FAILED] --retry--> [GENERATING]

```

## Generation Steps
1. Verify eligibility (idempotent check)
2. Lock generation (prevent duplicates)
3. Render template with user data
4. Generate PDF (async if template complex)
5. Create blockchain/verification hash (optional)
6. Store in durable storage
7. Update enrollment with certificate_url
8. Notify user

## Template Variables
| Variable | Source |
|----------|--------|
| {{learner_name}} | User profile |
| {{course_name}} | Course record |
| {{completion_date}} | Enrollment.completed_at |
| {{certificate_id}} | UUID v4 |
| {{verification_url}} | Configured domain |

## Verification
- QR code linking to verification endpoint
- Hash of certificate data for tamper detection

## Error Handling
- **Template render fail**: Alert + queue for manual
- **Storage fail**: Retry 3x, then dead letter
- **Duplicate request**: Return existing certificate
```

#### points-leaderboard-flow.md

```markdown
---
status: draft
domain: Gamification
complexity: medium
risk: low
---

# Flow: Points & Leaderboard

## Overview

Award points for activities and maintain real-time-ish leaderboards.

## Points Events

| Event           | Points | Cooldown               |
| --------------- | ------ | ---------------------- |
| Course complete | 100    | Once per course        |
| Daily login     | 10     | 24h                    |
| Quiz perfect    | 50     | Once per quiz          |
| Referral        | 200    | Once per referred user |

## Aggregation Strategy

- **Write path**: Increment counter immediately
- **Read path**: Cached leaderboard, updated every 5 min
- **Leaderboard scopes**: Global, Organization, Course cohort

## Leaderboard Update

1. User action triggers point event
2. Validate cooldown/not duplicate
3. Update user total points
4. Publish score change event
5. Consumer updates sorted sets
6. Periodic snapshot to DB

## Race Conditions

- **Concurrent point awards**: Atomic increment operation
- **Double event**: Idempotency key per event
- **Leaderboard read during update**: Stale read acceptable (eventual consistency)

## Anti-Gaming

- Rate limits on point events
- Anomaly detection (impossible scores)
- Admin audit trail for manual adjustments
```

#### progress-aggregation-flow.md

```markdown
---
status: draft
domain: Learning
complexity: medium
risk: low
---

# Flow: Progress Aggregation

## Overview

Aggregates module-level progress into course and program-level metrics.

## Trigger

- Module progress update
- Nightly reconciliation job
- Admin recalculation request

## Aggregation Levels

### Course Level

- Modules completed / total modules
- Time spent (sum)
- Last activity timestamp
- Completion percentage

### Program Level

- Courses completed / total courses
- Average course score
- Estimated completion date
- Streak data

### Organization Level

- Active learners
- Completion rate
- Average time to complete

## Reconciliation Job

Runs daily at 03:00 UTC:

1. Scan for mismatched aggregates
2. Recalculate from source of truth
3. Update materialized views
4. Alert on discrepancies > threshold

## Performance

- Incremental updates for real-time
- Full recalculation for reconciliation
- Batch size: 1000 enrollments
```

#### question-submission-flow.md

```markdown
---
status: draft
domain: Content
complexity: medium
risk: medium
---

# Flow: Question Submission

## Overview

Users submit questions (Q&A, assessments, quizzes) for review or immediate use.

## Actors

| Actor     | Role                    |
| --------- | ----------------------- |
| User      | Submits question        |
| Moderator | Reviews flagged content |
| System    | Auto-moderates, formats |

## Trigger

`POST /api/v1/questions`

## Pre-Conditions

- [ ] User has submit permission
- [ ] Content within length limits
- [ ] Not duplicate of existing

## State Machine
```

[DRAFT] --submit--> [PENDING_REVIEW] --approve--> [PUBLISHED]
|
[AUTO_APPROVED] (if trusted user)
|
[REJECTED] --edit--> [DRAFT]

```

## Auto-Moderation
- Profanity filter
- Spam detection (rate + content patterns)
- Plagiarism check (if enabled)
- Image moderation (if attachments)

## Review Queue
- Priority: Reported > New user > Trusted user
- SLA: 24h for reported, 48h for standard
- Escalation: Auto-escalate after SLA

## Error Branches

### Duplicate Detected
- Similarity score > 90%
- Suggest existing question
- Allow override with justification

### Auto-Reject
- Severe profanity or spam
- Ban user if repeat offender
- Log for pattern analysis

## Post-Conditions
- [ ] Question in appropriate state
- [ ] Search index updated
- [ ] Notifications sent (if applicable)
```

#### search-indexing-flow.md

```markdown
---
status: draft
domain: Search
complexity: high
risk: medium
---

# Flow: Search Indexing

## Overview

Keeps search indexes synchronized with database changes.

## Index Types

| Index   | Engine        | Entities            | Update Strategy          |
| ------- | ------------- | ------------------- | ------------------------ |
| Courses | Elasticsearch | courses, modules    | Event-driven             |
| Users   | Elasticsearch | users               | Event-driven             |
| Content | Elasticsearch | questions, articles | Event-driven + scheduled |

## Event-Driven Updates

1. DB change triggers event
2. Event published to queue
3. Indexer consumes event
4. Fetch full document from DB
5. Transform to search document
6. Index with retry logic

## Full Reindex

- Trigger: Schema change, corruption recovery
- Process: Paginate through all records
- Duration: Hours for large datasets
- Strategy: Index to alias, swap when complete

## Conflict Resolution

- **Update vs Delete**: If delete event arrives after update, ignore update
- **Out of order events**: Use versioning (timestamp or sequence)
- **Partial update failure**: Retry individual document, not full batch

## Monitoring

- Lag time between DB and index
- Failed document count
- Index size growth rate
```

#### event-architecture.md

````markdown
---
status: draft
domain: Infrastructure
complexity: high
risk: high
---

# Event Architecture

## Overview

Asynchronous communication patterns between services/modules.

## Event Types

### Domain Events

- `UserRegistered`
- `CourseCompleted`
- `PaymentSucceeded`
- `SubscriptionCancelled`

### Integration Events

- `EmailRequested`
- `SearchIndexUpdate`
- `AnalyticsTrack`

## Event Schema

```json
{
  "event_id": "uuid",
  "event_type": "string",
  "timestamp": "iso8601",
  "correlation_id": "uuid",
  "payload": {},
  "metadata": {
    "source": "service-name",
    "version": "1.0"
  }
}
```
````

## Delivery Guarantees

| Event Type | Guarantee     | Max Delay |
| ---------- | ------------- | --------- |
| Domain     | At-least-once | 5s        |
| Email      | At-least-once | 60s       |
| Analytics  | At-most-once  | 5 min     |

## Consumer Patterns

- **Competing consumers**: Scale horizontally
- **Partitioned consumers**: By user_id for ordering
- **Saga pattern**: For multi-step transactions

## Dead Letter Policy

- After 3 retries → DLQ
- Alert on DLQ depth > 100
- Manual replay capability
- Auto-archive after 30 days

````

#### course-resource-archive-plan.md

```markdown
---
status: draft
domain: Maintenance
complexity: medium
risk: low
---

# Flow: Course Resource Archive

## Overview
Archives old course resources to cold storage and updates references.

## Trigger
- Scheduled: 1st of month
- Manual: Admin request
- Event: Course deprecated

## Criteria for Archival
- Course inactive for > 2 years
- Last enrollment > 1 year ago
- Resource not accessed in 6 months

## Archive Process
1. Identify candidate resources
2. Generate archive manifest
3. Copy to cold storage (S3 Glacier/etc)
4. Verify checksums
5. Update DB references (hot → cold)
6. Delete from hot storage
7. Update CDN cache invalidation

## Restore Process
1. Admin or user requests resource
2. Check cold storage location
3. Initiate restore (async, 3-5h for glacier)
4. Temporarily cache in hot storage
5. Serve with expiration header

## Cost Tracking
| Metric | Before | After |
|--------|--------|-------|
| Storage cost | $X/GB hot | $Y/GB cold |
| Access latency | <100ms | 3-5h (cold) |

## Rollback
- Keep manifest for 30 days post-archive
- Quick-restore for recently archived
- Audit log of all archive operations
````

---

## 06-api-endpoints/

### README.md

```markdown
# API Endpoints

Endpoint specifications, request/response schemas, and auth requirements.

## Files

| File                     | Purpose                        |
| ------------------------ | ------------------------------ |
| `api-conventions.md`     | URL design, versioning, errors |
| `endpoint-{resource}.md` | Per-resource endpoint group    |
| `auth-matrix.md`         | Who can call what              |
| `rate-limits.md`         | Throttling rules               |
```

### Template: endpoint-{resource}.md

````markdown
---
status: draft
resource: ResourceName
base_path: /api/v1/resources
---

# API: ResourceName

## List

`GET /api/v1/resources`

### Auth

Bearer token, scope: `resources:read`

### Query Params

| Param  | Type   | Required | Default | Description      |
| ------ | ------ | -------- | ------- | ---------------- |
| page   | int    | No       | 1       | Page number      |
| limit  | int    | No       | 20      | Items per page   |
| status | string | No       | -       | Filter by status |

### Response 200

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```
````

## Create

`POST /api/v1/resources`

### Auth

Bearer token, scope: `resources:write`

### Request Body

```json
{
  "name": "string (required, 3-100 chars)",
  "description": "string (optional, max 500)"
}
```

### Response 201

```json
{
  "id": "uuid",
  "name": "string",
  "status": "active",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### Errors

| Status | Code           | When             |
| ------ | -------------- | ---------------- |
| 400    | INVALID_INPUT  | Validation fails |
| 409    | DUPLICATE_NAME | Name exists      |

## Get by ID

`GET /api/v1/resources/{id}`

### Response 200

```json
{
  "id": "uuid",
  "name": "string"
}
```

### Errors

| Status | When               |
| ------ | ------------------ |
| 404    | Resource not found |

## Update

`PATCH /api/v1/resources/{id}`

### Request Body

```json
{
  "name": "string (optional)"
}
```

### Response 200

Updated resource object.

## Delete

`DELETE /api/v1/resources/{id}`

### Response 204

No body.

### Errors

| Status | When                           |
| ------ | ------------------------------ |
| 409    | Resource in use, cannot delete |

````

---

## 07-testing-guide/

### README.md

```markdown
# Testing Guide

How to test this system effectively.

## Files

| File | Purpose |
|------|---------|
| `testing-strategy.md` | Philosophy, pyramid, tools |
| `fixture-guide.md` | Test data management |
| `e2e-scenarios.md` | Critical path tests |
| `performance-testing.md` | Load, stress, soak tests |
| `contract-testing.md` | API consumer contracts |
````

### Template: e2e-scenarios.md

```markdown
---
status: draft
---

# E2E Test Scenarios

## Scenario: Complete Purchase Flow

**Given** a guest user
**When** they register, browse, and purchase
**Then** they receive confirmation and access

### Steps

1. Register new account
2. Verify email
3. Browse courses
4. Add subscription to cart
5. Complete payment
6. Access course content
7. Complete first module

### Assertions

- [ ] User can log in after registration
- [ ] Email received within 60s
- [ ] Payment processed successfully
- [ ] Course appears in dashboard
- [ ] Progress saves correctly

## Scenario: Bulk Subscription Distribution

**Given** an organization admin
**When** they upload 500 recipients
**Then** all receive subscriptions

### Steps

1. Login as admin
2. Navigate to bulk subscription
3. Upload CSV with 500 emails
4. Confirm payment
5. Wait for processing
6. Verify all recipients notified

### Assertions

- [ ] Processing completes < 10 min
- [ ] All 500 have active subscriptions
- [ ] Failure report shows 0 errors
```

---

## Naming Convention Summary

| Context   | Pattern                     | Example                          |
| --------- | --------------------------- | -------------------------------- |
| Folders   | `NN-kebab-case`             | `05-business-flows`              |
| Docs      | `kebab-case.md`             | `user-registration-flow.md`      |
| ADRs      | `ADR-NNNN-title.md`         | `ADR-0001-use-event-sourcing.md` |
| Tables    | `table-{name}.md`           | `table-users.md`                 |
| Modules   | `module-{name}.md`          | `module-payments.md`             |
| Jobs      | `job-{name}.md`             | `job-send-email.md`              |
| Endpoints | `endpoint-{resource}.md`    | `endpoint-courses.md`            |
| Features  | `feature-request-{slug}.md` | `feature-request-dark-mode.md`   |
| Images    | `YYYYMMDD-context.png`      | `20260506-auth-sequence.png`     |

---

## AI Prompting Guide

When asking an AI to work with this framework, use this structure:

```
Implement feature: [Feature Name]

Context:
- Read /docs/05-business-flows/[relevant-flow].md
- Check /docs/01-database/ for schema constraints
- Review /docs/06-api-endpoints/ for contracts

Requirements:
1. Update flow docs if implementation diverges
2. Add/update tests per TEST_PLAN.md
3. Follow naming conventions
4. Mark status as `implemented` when done

Specific tasks:
- [ ] Update [specific file]
- [ ] Implement [specific component]
- [ ] Write tests for [scenario]
```
