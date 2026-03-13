// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentStep = 1;
let vaultRoot = "";

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function toKebab(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Config — fetch vault root from server
// ---------------------------------------------------------------------------

(async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    const config = await res.json();
    vaultRoot = config.vaultRoot || "";
    updateOutputDir();
  } catch {
    // Server not reachable — vault root stays empty, user must provide absolute path
  }
})();

// ---------------------------------------------------------------------------
// Step navigation
// ---------------------------------------------------------------------------

function showStep(n) {
  currentStep = n;
  $$(".panel").forEach((p) => p.classList.toggle("active", +p.dataset.panel === n));
  $$(".step").forEach((s) => {
    const sn = +s.dataset.step;
    s.classList.toggle("active", sn === n);
    s.classList.toggle("completed", sn < n);
  });

  if (n === 4) buildReview();
}

// Step tab clicks
$$(".step").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = +btn.dataset.step;
    if (target <= currentStep || target === currentStep + 1) {
      if (target > currentStep && !validateCurrentStep()) return;
      showStep(target);
    }
  });
});

// Next / Back buttons
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-next]");
  if (btn) {
    if (!validateCurrentStep()) return;
    showStep(+btn.dataset.next);
    return;
  }
  const prev = e.target.closest("[data-prev]");
  if (prev) {
    showStep(+prev.dataset.prev);
  }
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateCurrentStep() {
  if (currentStep === 1) {
    const pn = $("#projectName").value.trim();
    const pt = $("#projectTitle").value.trim();
    const od = $("#outputDir").value.trim();
    const isClient = $('input[name="projectType"]:checked').value === "client";
    const cn = $("#clientName").value.trim();

    if (!pn) { $("#projectName").focus(); return false; }
    if (!pt) { $("#projectTitle").focus(); return false; }
    if (!od) { $("#outputDir").focus(); return false; }
    if (isClient && !cn) { $("#clientName").focus(); return false; }
    return true;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Project type toggle
// ---------------------------------------------------------------------------

$$('input[name="projectType"]').forEach((radio) => {
  radio.addEventListener("change", updateProjectType);
});

function updateProjectType() {
  const isClient = $('input[name="projectType"]:checked').value === "client";
  $("#client-name-field").classList.toggle("hidden", !isClient);
  updateOutputDir();
}

// Auto-generate output directory (relative to vault root)
function updateOutputDir() {
  const isClient = $('input[name="projectType"]:checked').value === "client";
  const clientName = toKebab($("#clientName").value);
  const projectName = toKebab($("#projectName").value);

  if (isClient) {
    $("#outputDir").value = clientName
      ? `01-workspaces/clients/${clientName}/`
      : "01-workspaces/clients/";
  } else {
    $("#outputDir").value = projectName
      ? `01-workspaces/projects/${projectName}/`
      : "01-workspaces/projects/";
  }

  updateOutputHint();
}

function updateOutputHint() {
  const hint = $("#output-dir-hint");
  const relPath = $("#outputDir").value.trim();
  if (vaultRoot && relPath && !relPath.startsWith("/")) {
    hint.textContent = `Full path: ${vaultRoot}/${relPath}`;
  } else {
    hint.textContent = "Relative paths resolve against the vault root";
  }
}

$("#outputDir").addEventListener("input", updateOutputHint);

$("#clientName").addEventListener("input", () => {
  const hint = $("#client-folder-hint");
  const val = toKebab($("#clientName").value);
  hint.textContent = val ? `Folder: ${val}/` : "";
  updateOutputDir();
});

$("#projectName").addEventListener("input", updateOutputDir);

// ---------------------------------------------------------------------------
// Research toggle
// ---------------------------------------------------------------------------

$$('input[name="hasResearch"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const show = $('input[name="hasResearch"]:checked').value === "yes";
    $("#research-fields").classList.toggle("hidden", !show);
  });
});

// ---------------------------------------------------------------------------
// Stakeholder rows
// ---------------------------------------------------------------------------

function createStakeholderRow() {
  const row = document.createElement("div");
  row.className = "stakeholder-row";
  row.innerHTML = `
    <input type="text" placeholder="Name" class="sh-name">
    <input type="text" placeholder="Role" class="sh-role">
    <input type="text" placeholder="Domain" class="sh-domain">
    <button type="button" class="btn-icon remove-stakeholder" title="Remove" aria-label="Remove stakeholder">&times;</button>
  `;
  return row;
}

$("#add-stakeholder").addEventListener("click", () => {
  $("#stakeholders").appendChild(createStakeholderRow());
});

document.addEventListener("click", (e) => {
  if (e.target.closest(".remove-stakeholder")) {
    const row = e.target.closest(".stakeholder-row");
    const container = $("#stakeholders");
    if (container.children.length > 1) {
      row.remove();
    } else {
      // Clear instead of removing the last row
      row.querySelectorAll("input").forEach((i) => (i.value = ""));
    }
  }
});

// ---------------------------------------------------------------------------
// Collect form data
// ---------------------------------------------------------------------------

function collectData() {
  const isClient = $('input[name="projectType"]:checked').value === "client";

  const stakeholders = [];
  $$(".stakeholder-row").forEach((row) => {
    const name = row.querySelector(".sh-name").value.trim();
    const role = row.querySelector(".sh-role").value.trim();
    const domain = row.querySelector(".sh-domain").value.trim();
    if (name || role) {
      stakeholders.push({ name: name || "TBD", role: role || "TBD", domain });
    }
  });

  const hasResearch = $('input[name="hasResearch"]:checked').value === "yes";
  const approach = $('input[name="researchApproach"]:checked');

  return {
    projectType: isClient ? "client" : "internal",
    clientName: isClient ? $("#clientName").value.trim() : undefined,
    projectName: $("#projectName").value.trim(),
    projectTitle: $("#projectTitle").value.trim(),
    outputDir: $("#outputDir").value.trim(),
    goal: $("#goal").value.trim(),
    scope: $("#scope").value.trim(),
    timeline: $("#timeline").value.trim(),
    strategicContext: $("#strategicContext").value.trim(),
    stakeholders,
    foundations: {
      brief: $('input[name="brief"]').checked,
      designSystem: $('input[name="designSystem"]').checked,
      constraints: $('input[name="constraints"]').checked,
      businessKpis: $('input[name="businessKpis"]').checked,
    },
    hasResearch,
    primaryQuestion: hasResearch ? $("#primaryQuestion").value.trim() : undefined,
    researchApproach: hasResearch && approach ? approach.value : undefined,
    interviewCount: hasResearch ? $("#interviewCount").value.trim() : undefined,
  };
}

// ---------------------------------------------------------------------------
// Review panel
// ---------------------------------------------------------------------------

function buildReview() {
  const data = collectData();
  const relPath = data.outputDir;
  const fullPath = relPath.startsWith("/") ? relPath : `${vaultRoot}/${relPath}`;

  // Summary
  const lines = [
    ["Project", `${data.projectTitle} (${data.projectName})`],
    ["Type", data.projectType],
  ];
  if (data.clientName) lines.push(["Client", data.clientName]);
  lines.push(["Output", fullPath]);
  if (data.goal) lines.push(["Goal", data.goal]);
  if (data.scope) lines.push(["Scope", data.scope]);
  if (data.timeline) lines.push(["Timeline", data.timeline]);
  if (data.stakeholders.length > 0) {
    lines.push(["Stakeholders", data.stakeholders.map((s) => `${s.name} (${s.role})`).join(", ")]);
  }

  const foundationLabels = [];
  if (data.foundations.brief) foundationLabels.push("Brief");
  if (data.foundations.designSystem) foundationLabels.push("Design System");
  if (data.foundations.constraints) foundationLabels.push("Constraints");
  if (data.foundations.businessKpis) foundationLabels.push("Business Context");
  if (foundationLabels.length) lines.push(["Foundations", foundationLabels.join(", ")]);

  if (data.hasResearch) {
    lines.push(["Research", `Yes — ${data.researchApproach || "TBD"}`]);
    if (data.primaryQuestion) lines.push(["Question", data.primaryQuestion]);
  }

  const summaryHtml = lines
    .map(([k, v]) => `<dt>${k}:</dt><dd>${escapeHtml(v)}</dd>`)
    .join("\n");
  $("#review-summary").innerHTML = `<dl>${summaryHtml}</dl>`;

  // File list
  const folders = [
    "meta/",
    "meta/notes/",
    "foundations/",
    "foundations/stakeholders/",
    "research/",
    "research/context/",
    "strategy/",
    "design/",
    "archive/",
  ];

  const files = [
    "meta/project-context.md",
    "meta/moc-project.md",
    "meta/decision-log.md",
  ];

  const hasRoles = data.stakeholders.some((s) => s.role && s.role !== "TBD");
  if (data.stakeholders.length > 0 && hasRoles) {
    files.push("foundations/stakeholders/stakeholder-map.md");
  }
  if (data.hasResearch) {
    files.push("research/context/research-plan.md");
  }
  if (data.foundations.brief) files.push("foundations/brief.md");
  if (data.foundations.designSystem) files.push("foundations/design-system.md");
  if (data.foundations.constraints) files.push("foundations/constraints.md");
  if (data.foundations.businessKpis) files.push("foundations/business-context.md");

  const fileHtml =
    folders.map((f) => `<div class="folder">${escapeHtml(f)}</div>`).join("") +
    files.map((f) => `<div class="file">${escapeHtml(f)}</div>`).join("");

  $("#review-files").innerHTML = fileHtml;

  // Reset result message
  $("#result-message").className = "result hidden";
  $("#create-btn").disabled = false;
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

$("#create-btn").addEventListener("click", async () => {
  const btn = $("#create-btn");
  const msg = $("#result-message");
  btn.disabled = true;
  btn.textContent = "Creating...";
  msg.className = "result hidden";

  try {
    const data = collectData();
    const res = await fetch("/api/scaffold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok || json.error) {
      msg.className = "result error";
      msg.textContent = `Error: ${json.error || "Unknown error"}`;
      btn.disabled = false;
      btn.textContent = "Create";
      return;
    }

    const count = json.result.files.length;
    msg.className = "result success";
    msg.innerHTML = `Created ${count} files in <code>${escapeHtml(json.result.rootDir)}</code>`;
    btn.textContent = "Done";
  } catch (err) {
    msg.className = "result error";
    msg.textContent = `Error: ${err.message}`;
    btn.disabled = false;
    btn.textContent = "Create";
  }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

updateProjectType();
