# Contributing

Local development, environment setup and API documentation are in the [README](./README.md).
This file covers how changes are recorded: commit messages and pull requests.

## Commit messages

### Subject

```
GSPS-123: Add configurable minimum length rule for linear actions
```

An uppercase project key, a hyphen, the ticket number, an optional colon, then plain English.
Use whichever key the work belongs to - `GSPS` for this team, `TGC` for Grants UI work,
`SFIR` for scheme-level tickets. Where there is genuinely no ticket, use `GSPS-000`.

Keep it short, imperative and without a trailing full stop - do not add the `(#NNN)` pull
request suffix as GitHub appends it on squash-merge.

### Body

The subject says what changed and the body says why.

This repository squashes on merge, so the body lands on `main` and is what `git log` shows
to whoever is working out why a line of code exists. Writing it well also
means the pull request needs no separate authoring, because GitHub populates the pull
request title and description from the commit.

Separate the subject from the body with a blank line and cover:

- **Why the change was needed**
  - The problem, constraint or defect behind it, not a
    restatement of the ticket title
- **What changed**
  - Where the diff alone would not make it obvious
- **What was tested**
  - Unit, db, contract, e2e, if needed

Include the detail a reviewer would otherwise have to open Jira to find - quoting a config
block, an error message or an upstream rule is welcome where it explains the constraint.

Omit the body for trivial changes (such as a dependency bump, a typo or a rename) where
the subject already says everything.

## Pull requests

Follow the [Defra pull request standards](https://defra.github.io/software-development-standards/processes/pull_requests): branch, push and open the pull request early, keep it focused, rebase rather than
merge to stay current, and squash on merge.

Because merges are squashed, the pull request title becomes the commit subject on `main`.

Note that a CI check validates that the title matches the subject format above and that Dependabot pull requests and
GitHub-generated `Revert "..."` titles are exempt.

Where a branch has several commits, replace GitHub's default squash message with a single coherent message before merging.
