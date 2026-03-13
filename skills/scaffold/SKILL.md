---
name: scaffold
description: Scaffold a new project workspace through guided conversation — creates folders, project context, MOC, decision log, and optional stakeholder/research files so every project starts with rich, navigable structure. Use when starting a new project, setting up a workspace, creating a new client engagement, initialising any new piece of work that needs its own workspace.
modified: 2026-03-13T10:46:51+00:00
---

# Scaffold

Scaffold a new project workspace through guided conversation so every project starts with consistent structure, rich context, and navigable connections.

## Usage

- `/scaffold` — start the guided flow
- `/scaffold [name]` — start with a name already provided

`$ARGUMENTS` is optional. If provided, treat it as the primary identifier — it could be a client name or a project name depending on what the user intends. Clarify during Step 1 (client vs internal) to determine whether the argument becomes the client folder name or the project folder name.

## Choose your path

Before anything else, ask the user how they'd like to scaffold:

> Two ways to set up this project:
> 1. **Chat** (recommended) — I'll walk you through it right here
> 2. **Web form** — a local UI where you fill everything out visually
>
> Which do you prefer?

- **If the user chooses chat:** skip all server setup. Proceed directly to Step 1 (Identity) below.
- **If the user chooses web form:** run **Web UI Setup** below, then direct them to http://localhost:3847.

## Web UI Setup

Only run this if the user chose the web form. Run these checks silently — don't narrate them unless something fails.

1. **Find the plugin root.** Search for `.claude-plugin/plugin.json` containing `novus-toolkit` within 3 levels of the working directory. Store the resolved path as `PLUGIN_DIR`.
2. **Check Node.js.** Run `node --version`. If Node is not installed, tell the user the web form requires Node.js and fall back to the chat workflow — proceed to Step 1 (Identity).
3. **Install dependencies.** Check if `$PLUGIN_DIR/app/node_modules` exists. If not, run `npm install --prefix $PLUGIN_DIR/app`.
4. **Start the server.** Check if port 3847 is in use (`lsof -ti:3847`). If not, start the server in the background: `nohup node $PLUGIN_DIR/app/dist/server.js "$(pwd)" >/dev/null 2>&1 &` — then wait briefly and verify it started.
5. **Direct the user.** Tell them the form is ready at http://localhost:3847 and to let you know when they've submitted it.

## Pick up after web form

When the user returns from the web form (they say they're done, or you need to check):

1. **Find what was created.** Ask the user which project they scaffolded, or look for recently created directories under `01-workspaces/clients/` and `01-workspaces/projects/` (check modification times within the last few minutes).
2. **Verify the output.** Read the created `meta/project-context.md` and `meta/moc-project.md` to confirm the scaffold landed correctly.
3. **Run the Orient step** (Step 6 below) — report what was created and suggest next actions.
4. **Offer to enhance.** The web form produces deterministic output from templates. Offer to review and enrich the generated files — for example, improving the project context narrative, adding detail to the stakeholder map, or fleshing out the research plan. This is where conversational AI adds value on top of the form output.

## Principles

- **Full structure up front.** Every scaffold creates the complete folder tree. Six top-level folders provide orientation even before content lands.
- **Conditional content, not conditional structure.** Folders always exist. Whether files land in them depends on Q&A answers.
- **Templates over generation.** Read templates from `assets/templates/`, populate with Q&A data. Don't regenerate structure from scratch.
- **Minimise round-trips.** Batch questions aggressively. If the user gives rich input, collapse to 2 exchanges before the checkpoint. Never ask what the user already told you.
- **Only write what the user said.** Populate templates from Q&A data. If a field has no answer, leave it as TBD or omit the section. Never invent secondary questions, segments, or detail the user didn't provide.
- **Relative markdown links** All inter-file links use standard markdown relative paths (e.g. `[Project Context](project-context.md)`, `[stakeholder-map](../foundations/stakeholders/stakeholder-map.md)`). This keeps the scaffold portable across any markdown-based system.

## Folder Structure

Every scaffold creates:

```
[project]/
├── meta/
│   └── notes/
├── foundations/
│   └── stakeholders/
├── research/
│   └── context/
├── strategy/
├── design/
└── archive/
```

Downstream subfolders (`research/01-transcripts/`, `research/02-analysis/`, `design/patterns/`) appear only when work justifies them — other skills create those.

## Workflow

### Step 1 — Identity

Establish the basics. Ask these together:

- **Client or internal?** This determines the folder name:
  - **Client project:** folder name = client name in kebab-case (e.g. `connect-grow/`). The project lives under the client folder.
  - **Internal project:** folder name = project name in kebab-case (e.g. `vault-intelligence/`).
- **Project name** — kebab-case slug used for internal reference and file naming. For client projects this is distinct from the folder (folder = client, project name = engagement name). If the user gives a natural-language name, propose a slug and confirm.
- **Project title** — human-readable. Populates `project:` frontmatter field and H1 headings.
- **Client name** (client projects only) — proper case. Populates `client:` field and determines the folder name.
- **Where to create?** Defaults:
  - Client: `01-workspaces/clients/[client-name]/` (creates the client folder if it doesn't exist)
  - Internal: `01-workspaces/projects/[project-name]/`
  - User can override either default.

Extract what you can from the initial message — only ask for what's missing.

### Step 2 — Context, People & Foundations

One combined step. Ask everything needed to populate project-context.md, the stakeholder map, and foundation stubs.

**Context (seeds project-context.md):**
- Goal / purpose (1–2 sentences)
- Scope (what's in, what's out)
- Timeline (duration, key dates if known)
- Strategic context (why this matters, business drivers)
- Client projects: engagement duration, client history, sponsor
- Internal projects: initiative scope (one-off vs ongoing), who needs visibility

**People (seeds stakeholder map):**
- Key people: names, roles, what they own or care about
- If a stakeholder's role is unknown, note it as TBD in the map — but still ask: "What does [name] do?" before accepting a blank.
- Only create the stakeholder map if at least one person has a known role.

**Foundations (seeds stub files):**
- Brief / RFP? → `foundations/brief.md`
- Design system / brand guidelines? → `foundations/design-system.md`
- Technical constraints? → `foundations/constraints.md`
- Business KPIs? → `foundations/business-context.md`

Foundation stubs use the `tpl-foundation-stub.md` template. Use this guidance for each stub type:

| Stub | `{{stub_title}}` | `{{stub_description}}` | `{{stub_guidance}}` |
|------|-------------------|------------------------|---------------------|
| `brief.md` | Brief | Client brief, RFP, or original project ask. | Paste or summarise the client brief / RFP here. Include objectives, constraints, and any stated success criteria. |
| `design-system.md` | Design System | Design system, brand guidelines, and visual standards. | Document the design system, brand guidelines, colour palette, typography, and component conventions. Link to external resources (Figma, Storybook) where applicable. |
| `constraints.md` | Constraints | Platform, technical, and organisational constraints. | List known constraints: platforms, tooling, technical limitations, compliance requirements, team capacity. Use a table for structured constraints. |
| `business-context.md` | Business Context | Business KPIs, success metrics, and commercial context. | Document target KPIs, success metrics, commercial model, and any business context that should inform design and strategy decisions. |

**Batching:** Present all these questions together. The user can answer in one message or across a couple — either way, don't create a separate exchange for each category. If the user's initial message already covers context, go straight to people + foundations.

### Step 3 — Research (if applicable)

Ask: **Is there a research phase?**

If yes, ask only:
- What's the primary research question?
- Roughly how many interviews? (or "desk research only")

That's it. Don't ask for secondary questions, customer segments, or evidence thresholds at scaffold time — those belong in the research plan when research actually begins. The scaffold creates a lightweight stub with the primary question and approach.

If no research phase, skip. The folder still exists.

### Step 4 — Checkpoint (mandatory)

Present the full scaffold plan. Do not create any files until the user confirms.

```
── Checkpoint: Project scaffold ──────────────────
Project:    {{project_title}} ({{project_name}})
Type:       [client / internal]
Client:     [client name — or omit for internal]
Root:       [full path to workspace folder]

Folders (always created):
  meta/, meta/notes/, foundations/, foundations/stakeholders/,
  research/, research/context/, strategy/, design/, archive/

Files with content:
  - meta/project-context.md
  - meta/moc-project.md
  - meta/decision-log.md
  - [foundations/stakeholders/stakeholder-map.md — if stakeholders with known roles]
  - [research/context/research-plan.md — if research confirmed]
  - [any foundation stubs]

Confirm, adjust, or cancel.
──────────────────────────────────────────────────
```

Wait for confirmation before proceeding.

### Step 5 — Create

After confirmation:

1. **Check target path.** If it exists with files, warn and confirm.
2. **Create all folders** — `mkdir -p` the full structure in one command.
3. **Read templates** from `assets/templates/` and populate with Q&A data:

| Template | Output file | Condition |
|----------|------------|-----------|
| `tpl-project-context.md` | `meta/project-context.md` | Always |
| `tpl-moc-project.md` | `meta/moc-project.md` | Always |
| `tpl-decision-log.md` | `meta/decision-log.md` | Always |
| `tpl-stakeholder-map.md` | `foundations/stakeholders/stakeholder-map.md` | Stakeholders with known roles |
| `tpl-research-plan.md` | `research/context/research-plan.md` | Research confirmed |
| `tpl-foundation-stub.md` | `foundations/[name].md` | Per foundation input confirmed |

Read `references/project-context-guidance.md` for writing quality guidance when populating templates.
Read `references/moc-construction.md` for MOC section logic.

### Step 6 — Orient

Report what was created:

- List all created files with paths.
- Suggest next actions based on what was seeded:
  - Stakeholder map exists → "review it for gaps and missing dynamics"
  - Research plan exists → "flesh out the research plan before starting interviews"
  - Neither → "foundations and research folders are ready when content arrives"
- Note that project-context and MOC are living documents — they grow as the project progresses.

## Frontmatter Conventions

All files use YAML frontmatter. Standard fields:

```yaml
---
type: ""           # Document type (project_context, note, etc.)
status: ""         # Lifecycle: scratch, draft, active, complete, archived
description: ""    # One-line summary
origin: ""         # Who created it: human, ai, collaborative
created: YYYY-MM-DD
tags: []
---
```

For client projects, add `client:` and `project:` to every file.

The `project-context.md` file uses `type: project_context` — it carries structured metadata (like `stakeholders:` list) that a generic note does not.

Templates carry their own frontmatter patterns — no external schema references needed.

## Guardrails

- **Checkpoint before any writes.** Even a simple scaffold touches 3+ files.
- **Don't overwrite existing content.** If the target exists with files, warn and confirm.
- **Templates are skeletons.** Populate from Q&A data — don't invent detail the user hasn't provided.
- **Honest gaps.** If something is unknown, leave the field present but note "TBD".
- **No speculative content.** Don't generate secondary research questions, customer segments, evidence thresholds, or strategic implications that weren't discussed. A sparse but honest scaffold is better than a rich but fabricated one.

## Test Cases

### Test 1: Client project (rich input)

**Prompt:** "Let's set up the workspace for a new client — ConnectGrow. It's a digital strategy engagement called Service Design Sprint, about 6 weeks. We're starting with stakeholder interviews next week. Main contact is Rachel Torres, Head of Product."
**Expected:** Folder = `01-workspaces/clients/connect-grow/`, project name = `service-design-sprint`, title = "Service Design Sprint". Extracts most context from the message. 2 exchanges max before checkpoint. Stakeholder map with Rachel Torres.

### Test 2: Internal project (minimal)

**Prompt:** "/scaffold vault-intelligence"
**Expected:** Folder = `01-workspaces/projects/vault-intelligence/`. Asks for title, goal, scope, people, timeline in one batch. Only `meta/` files unless stakeholders or research confirmed.

### Test 3: Client project, name used as client

**Prompt:** "/scaffold acme" then user says "it's a client project, the engagement is called Brand Refresh"
**Expected:** Folder = `01-workspaces/clients/acme/`, client = "Acme", project name = `brand-refresh`, title = "Brand Refresh".