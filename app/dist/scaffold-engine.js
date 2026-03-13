import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Find the plugin root by walking up to the directory containing .claude-plugin/
function findPluginRoot(startDir) {
    let dir = startDir;
    while (dir !== dirname(dir)) {
        if (existsSync(join(dir, ".claude-plugin")))
            return dir;
        dir = dirname(dir);
    }
    throw new Error("Could not find plugin root (.claude-plugin/ directory)");
}
const PLUGIN_ROOT = findPluginRoot(__dirname);
// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------
const TEMPLATES_DIR = join(PLUGIN_ROOT, "skills", "scaffold", "assets", "templates");
function readTemplate(name) {
    return readFileSync(join(TEMPLATES_DIR, name), "utf-8");
}
function substitute(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}
function today() {
    return new Date().toISOString().slice(0, 10);
}
function toKebab(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}
// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------
function buildProjectContext(data) {
    const tpl = readTemplate("tpl-project-context.md");
    const clientLine = data.projectType === "client" ? data.clientName ?? "" : "";
    const stakeholderYaml = data.stakeholders.length > 0
        ? data.stakeholders.map((s) => `  - ${s.name} (${s.role})`).join("\n")
        : "  - TBD";
    const contactRows = data.stakeholders.length > 0
        ? data.stakeholders
            .map((s) => `| ${s.name} | ${s.role} | ${s.domain || ""} |`)
            .join("\n")
        : "| TBD | TBD | |";
    const tokens = {
        client_name: clientLine,
        project_title: data.projectTitle,
        project_name: data.projectName,
        created_date: today(),
        team_members: "TBD",
        duration: data.timeline || "TBD",
        current_phase: "Setup",
        project_purpose: data.goal || "TBD",
        strategic_context: data.strategicContext || "TBD",
        scope_items: data.scope || "TBD",
        deliverables: "TBD",
        contact_name: "",
        contact_role: "",
        contact_notes: "",
        date: today(),
        event: "Project workspace created",
        initial_observations: "Project scaffolded via novus-toolkit.",
    };
    let result = substitute(tpl, tokens);
    // Replace the stakeholder YAML placeholder (tokens already substituted to empty)
    result = result.replace(/stakeholders:\n\s+- .*/, `stakeholders:\n${stakeholderYaml}`);
    // Replace the empty contact row (tokens already substituted to empty) with actual contacts
    if (data.stakeholders.length > 0) {
        result = result.replace(/\| +\| +\| +\|/, contactRows);
    }
    // Strip client line for internal projects
    if (data.projectType === "internal") {
        result = result.replace(/\*\*Client:\*\*\s*\n/, "");
        result = result.replace(/^client:.*\n/m, "");
    }
    return result;
}
function buildMOC(data) {
    const tpl = readTemplate("tpl-moc-project.md");
    const tokens = {
        client_name: data.projectType === "client" ? (data.clientName ?? "") : "",
        project_title: data.projectTitle,
        project_name: data.projectName,
        project_summary: data.goal || "TBD",
        created_date: today(),
    };
    let result = substitute(tpl, tokens);
    // Populate foundations section
    const foundationLinks = [];
    if (data.stakeholders.length > 0 && data.stakeholders.some((s) => s.role)) {
        foundationLinks.push("- [stakeholder-map](../foundations/stakeholders/stakeholder-map.md) — influence/alignment matrix");
    }
    const stubMap = {
        brief: "brief",
        designSystem: "design-system",
        constraints: "constraints",
        businessKpis: "business-context",
    };
    for (const [key, slug] of Object.entries(stubMap)) {
        if (data.foundations[key]) {
            foundationLinks.push(`- [${slug}](../foundations/${slug}.md)`);
        }
    }
    if (foundationLinks.length > 0) {
        result = result.replace(/<!-- When foundation files are seeded[\s\S]*?-->/, foundationLinks.join("\n"));
    }
    // Populate research section
    if (data.hasResearch) {
        result = result.replace(/<!-- When the research plan is seeded[\s\S]*?-->/, "- [research-plan](../research/context/research-plan.md) — primary research question and approach");
    }
    // Strip client line for internal projects
    if (data.projectType === "internal") {
        result = result.replace(/^client:.*\n/m, "");
    }
    return result;
}
function buildDecisionLog(data) {
    const tpl = readTemplate("tpl-decision-log.md");
    const tokens = {
        client_name: data.projectType === "client" ? (data.clientName ?? "") : "",
        project_title: data.projectTitle,
        project_name: data.projectName,
        created_date: today(),
        project_purpose: data.goal || "TBD",
        next_steps: data.hasResearch
            ? "Research phase to begin next."
            : "Ready for foundation work.",
    };
    let result = substitute(tpl, tokens);
    if (data.projectType === "internal") {
        result = result.replace(/^client:.*\n/m, "");
    }
    return result;
}
function buildStakeholderMap(data) {
    const hasRoles = data.stakeholders.some((s) => s.role && s.role !== "TBD");
    if (data.stakeholders.length === 0 || !hasRoles)
        return null;
    // Build stakeholder rows for the table
    const rows = data.stakeholders
        .map((s) => `| ${s.name} | ${s.role} | TBD | TBD | ${s.domain || "TBD"} |`)
        .join("\n");
    // Build domain groupings
    const domains = new Map();
    for (const s of data.stakeholders) {
        const d = s.domain || "General";
        if (!domains.has(d))
            domains.set(d, []);
        domains.get(d).push(s);
    }
    const domainSections = Array.from(domains.entries())
        .map(([domain, people]) => `### ${domain}\n\n${people.map((p) => `- **${p.name}** — ${p.role}`).join("\n")}`)
        .join("\n\n");
    const clientName = data.projectType === "client" ? (data.clientName ?? "") : "";
    const clientLine = data.projectType === "client" ? `client: ${clientName}\n` : "";
    return `---
type: note
${clientLine}project: ${data.projectTitle}
status: active
description: >-
  Stakeholder map — influence/alignment matrix, domain groupings, and
  strategic implications for ${data.projectName}.
origin: collaborative
created: ${today()}
tags:
  - work/strategy
---

# Stakeholder Map

## Influence / Alignment Matrix

<!-- Populate from Q&A data. Influence = ability to affect project outcomes (High/Medium/Low). Alignment = support for the project direction (Champion/Aligned/Neutral/Resistant). -->

| Stakeholder | Role | Influence | Alignment | Primary Domain |
|---|---|---|---|---|
${rows}

## Domain Groupings

<!-- Group stakeholders by domain. For each group, note their perspective and relevance to the project. -->

${domainSections}

## Key Dynamics

<!-- Capture tensions, alliances, and power dynamics that affect delivery. What relationships matter? Where is friction likely? Leave empty if not enough information yet — this section grows as the engagement progresses. -->

## Strategic Implications

<!-- What do the stakeholder dynamics mean for how work should be sequenced, presented, and governed? Leave empty at scaffold time if dynamics aren't clear yet. -->
`;
}
function buildResearchPlan(data) {
    if (!data.hasResearch)
        return null;
    const tpl = readTemplate("tpl-research-plan.md");
    let approachText = "";
    switch (data.researchApproach) {
        case "interviews":
            approachText = `Qualitative research through stakeholder/user interviews.${data.interviewCount ? ` Target: ~${data.interviewCount} interviews.` : ""}`;
            break;
        case "desk":
            approachText = "Desk research — secondary sources, competitor analysis, market data.";
            break;
        case "both":
            approachText = `Mixed methods — interviews and desk research.${data.interviewCount ? ` Target: ~${data.interviewCount} interviews.` : ""}`;
            break;
        default:
            approachText = "TBD";
    }
    const tokens = {
        client_name: data.projectType === "client" ? (data.clientName ?? "") : "",
        project_title: data.projectTitle,
        project_name: data.projectName,
        created_date: today(),
        research_overview: `Research phase for ${data.projectTitle}.`,
        primary_question: data.primaryQuestion || "TBD",
        research_approach: approachText,
    };
    let result = substitute(tpl, tokens);
    if (data.projectType === "internal") {
        result = result.replace(/^client:.*\n/m, "");
    }
    return result;
}
const STUB_CONFIGS = {
    brief: {
        slug: "brief",
        title: "Brief",
        description: "Client brief, RFP, or original project ask.",
        guidance: "Paste or summarise the client brief / RFP here. Include objectives, constraints, and any stated success criteria.",
    },
    designSystem: {
        slug: "design-system",
        title: "Design System",
        description: "Design system, brand guidelines, and visual standards.",
        guidance: "Document the design system, brand guidelines, colour palette, typography, and component conventions. Link to external resources (Figma, Storybook) where applicable.",
    },
    constraints: {
        slug: "constraints",
        title: "Constraints",
        description: "Platform, technical, and organisational constraints.",
        guidance: "List known constraints: platforms, tooling, technical limitations, compliance requirements, team capacity. Use a table for structured constraints.",
    },
    businessKpis: {
        slug: "business-context",
        title: "Business Context",
        description: "Business KPIs, success metrics, and commercial context.",
        guidance: "Document target KPIs, success metrics, commercial model, and any business context that should inform design and strategy decisions.",
    },
};
function buildFoundationStub(type, data) {
    const config = STUB_CONFIGS[type];
    if (!config)
        throw new Error(`Unknown foundation stub type: ${type}`);
    const tpl = readTemplate("tpl-foundation-stub.md");
    const tokens = {
        client_name: data.projectType === "client" ? (data.clientName ?? "") : "",
        project_title: data.projectTitle,
        created_date: today(),
        stub_title: config.title,
        stub_description: config.description,
        stub_guidance: config.guidance,
    };
    let result = substitute(tpl, tokens);
    if (data.projectType === "internal") {
        result = result.replace(/^client:.*\n/m, "");
    }
    return result;
}
// ---------------------------------------------------------------------------
// Main scaffold function
// ---------------------------------------------------------------------------
export function scaffold(data) {
    const rootDir = data.outputDir;
    // Folder structure — always created
    const folders = [
        "",
        "meta",
        "meta/notes",
        "foundations",
        "foundations/stakeholders",
        "research",
        "research/context",
        "strategy",
        "design",
        "archive",
    ].map((f) => join(rootDir, f));
    for (const folder of folders) {
        mkdirSync(folder, { recursive: true });
    }
    const files = [];
    function writeFile(relativePath, content) {
        const fullPath = join(rootDir, relativePath);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, content, "utf-8");
        files.push({ path: fullPath, relativePath });
    }
    // Always created
    writeFile("meta/project-context.md", buildProjectContext(data));
    writeFile("meta/moc-project.md", buildMOC(data));
    writeFile("meta/decision-log.md", buildDecisionLog(data));
    // Conditional: stakeholder map
    const stakeholderMap = buildStakeholderMap(data);
    if (stakeholderMap) {
        writeFile("foundations/stakeholders/stakeholder-map.md", stakeholderMap);
    }
    // Conditional: research plan
    const researchPlan = buildResearchPlan(data);
    if (researchPlan) {
        writeFile("research/context/research-plan.md", researchPlan);
    }
    // Conditional: foundation stubs
    const foundationKeys = [
        "brief",
        "designSystem",
        "constraints",
        "businessKpis",
    ];
    for (const key of foundationKeys) {
        if (data.foundations[key]) {
            const config = STUB_CONFIGS[key];
            writeFile(`foundations/${config.slug}.md`, buildFoundationStub(key, data));
        }
    }
    return {
        rootDir,
        folders: folders.map((f) => f.replace(rootDir, "").replace(/^\//, "") || "."),
        files,
    };
}
