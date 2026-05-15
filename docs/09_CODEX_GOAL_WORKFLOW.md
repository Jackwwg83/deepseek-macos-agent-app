# 09 — Codex Goal Workflow

## Why this pack is written for `/goal`

Codex `/goal` is designed for work with a durable objective, clear success condition, validation loop, and enough room for Codex to keep making progress without you restating “continue” after each turn. Official Codex guidance says a good Goal should define the outcome, verification surface, constraints, boundaries, iteration policy, and blocked stop condition.

## Enable goals

In Codex CLI:

```text
/experimental
```

Enable Goals, or add to config:

```toml
[features]
goals = true
```

## Start the run

Open Codex in the repository root and run:

```text
/goal Implement CODEX_GOAL.md. Keep iterating until the MVP can be launched locally and all documented checks pass, or stop with a precise blocker and evidence.
```

## Recommended permissions

Start conservative:

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"
```

After the repo is bootstrapped and tests exist, you may allow more automation for trusted worktrees.

## What Codex should do on each loop

1. Read the goal and required docs.
2. Pick the next checkpoint.
3. Make the smallest useful change.
4. Run the narrowest relevant check.
5. Update `docs/PROGRESS.md`.
6. Decide from evidence whether the goal is done.
7. Continue if not done and not blocked.

## What Codex should not do

- Do not ask the user to choose obvious implementation details already specified in docs.
- Do not mark complete without passing checks or documenting a true blocker.
- Do not switch runtime away from DeepSeek-TUI.
- Do not replace DeepSeek-only scope with general providers.
- Do not implement VM sandbox before the MVP.

## Helpful follow-up prompts

If Codex stalls, use one of these:

```text
Continue the active goal. Read CODEX_GOAL.md and docs/PROGRESS.md, identify the next unverified acceptance criterion, implement it, run the narrowest check, and update progress.
```

```text
Review the current diff against docs/12_ACCEPTANCE_CHECKLIST.md. Fix only P0/P1 gaps that prevent a testable MVP.
```

```text
Do not add new features. Make scripts/dev/check.sh pass or document the exact external prerequisite that prevents it.
```

## Completion audit

Before `/goal` completes, Codex should produce a final audit:

```text
- Built artifacts:
- Tests run:
- Passing checks:
- Failing checks:
- Manual smoke steps:
- Real sidecar status:
- Known limitations:
- Next recommended milestone:
```

## AGENTS.md usage

Codex reads `AGENTS.md` files as durable project guidance. Keep repository instructions concise and focused on build commands, ownership boundaries, review expectations, and safety rules.
