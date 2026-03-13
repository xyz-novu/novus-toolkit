# MOC Construction

How to build and populate `moc-project.md`. Read this during scaffold creation for section logic and growth patterns.

## Section Rules

All sections are always present in the MOC. This provides a complete navigation skeleton even when some areas are empty.

### Fixed sections (always populated)

- **Engagement Context** — always first. Links to `project-context.md` with a one-line summary.
- **Decision Trail** — always last. Links to `decision-log.md`.

### Content sections (always present, content varies)

Each section appears regardless of whether content exists yet. Use HTML comment placeholders for empty areas. When content is seeded, replace the comment with relative markdown links.

**Foundations:**
- If stakeholder map was created → replace comment with link
- If other foundation stubs exist → add links
- If nothing was seeded → leave comment as-is

Example with seeded content:
```markdown
## Foundations

- [stakeholder-map](../foundations/stakeholders/stakeholder-map.md) — influence/alignment matrix and domain groupings
- [constraints](../foundations/constraints.md) — platform constraints
```

Example with nothing seeded:
```markdown
## Foundations

<!-- Link foundation documents as they're added: brief, stakeholder profiles, design system, constraints. -->
```

**Research:**
- Sub-sections: Methodology, Individual Analyses, Synthesis
- If research plan was created → replace comment with link
- Other sub-sections keep comments

Example with research plan:
```markdown
## Research

### Methodology

- [research-plan](../research/context/research-plan.md) — primary research question and approach

### Individual Analyses

<!-- Link to analyses as they're completed. -->

### Synthesis

<!-- Link to synthesis documents as they're produced. -->
```

**Strategy:**
- Comment placeholder until strategy work begins

**Design:**
- Comment placeholder until design work begins

## Section Ordering

Sections follow the natural flow of work:

1. Engagement Context
2. Foundations
3. Research
4. Strategy
5. Design
6. Decision Trail

## Growth Patterns

The MOC is the most dynamic file in the project. As work progresses:

- Replace comment placeholders with relative markdown links
- Add sub-sections as content accumulates (e.g. "Patterns" under Design)
- Add a "Notes & Meetings" section between Design and Decision Trail when meeting notes start accumulating

## Placeholder Syntax

Use HTML comments for empty sections:

```markdown
<!-- Link foundation documents as they're added -->
```

This keeps the MOC clean in reading view while signalling where content goes in edit mode. Only one placeholder style — HTML comments. No `{{}}` tokens in the output.

## Link Style

Use relative markdown links with descriptive text:

```markdown
[project-context](project-context.md) — one-line summary of scope and current phase.
```

Paths are relative to the MOC's location (`meta/`). Files in other top-level folders use `../`:

```markdown
[stakeholder-map](../foundations/stakeholders/stakeholder-map.md)
[research-plan](../research/context/research-plan.md)
```
