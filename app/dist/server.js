import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, extname, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { scaffold } from "./scaffold-engine.js";
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
// CLI args
// ---------------------------------------------------------------------------
const vaultRoot = process.argv[2];
if (!vaultRoot) {
    console.error("Usage: node server.js <vault-root>");
    console.error("  e.g. node server.js ~/my-vault");
    process.exit(1);
}
const resolvedVaultRoot = resolve(vaultRoot);
if (!existsSync(resolvedVaultRoot)) {
    console.error(`Vault root does not exist: ${resolvedVaultRoot}`);
    process.exit(1);
}
// ---------------------------------------------------------------------------
// Server config
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3847;
const PUBLIC_DIR = join(PLUGIN_ROOT, "app", "public");
const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
};
function getMime(path) {
    const ext = extname(path);
    return MIME_TYPES[ext] ?? "application/octet-stream";
}
// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validateFormData(body) {
    if (!body || typeof body !== "object") {
        return { valid: false, error: "Request body must be a JSON object" };
    }
    const b = body;
    if (!b.projectType || !["client", "internal"].includes(b.projectType)) {
        return { valid: false, error: "projectType must be 'client' or 'internal'" };
    }
    if (!b.projectName || typeof b.projectName !== "string") {
        return { valid: false, error: "projectName is required" };
    }
    if (!b.projectTitle || typeof b.projectTitle !== "string") {
        return { valid: false, error: "projectTitle is required" };
    }
    if (!b.outputDir || typeof b.outputDir !== "string") {
        return { valid: false, error: "outputDir is required" };
    }
    if (b.projectType === "client" && (!b.clientName || typeof b.clientName !== "string")) {
        return { valid: false, error: "clientName is required for client projects" };
    }
    // Resolve output dir against vault root
    const rawOutputDir = b.outputDir;
    const resolvedOutputDir = isAbsolute(rawOutputDir)
        ? rawOutputDir
        : join(resolvedVaultRoot, rawOutputDir);
    return {
        valid: true,
        data: {
            projectType: b.projectType,
            clientName: b.clientName,
            projectName: b.projectName,
            projectTitle: b.projectTitle,
            outputDir: resolvedOutputDir,
            goal: b.goal ?? "",
            scope: b.scope ?? "",
            timeline: b.timeline ?? "",
            strategicContext: b.strategicContext ?? "",
            stakeholders: Array.isArray(b.stakeholders) ? b.stakeholders : [],
            foundations: {
                brief: !!b.foundations?.brief,
                designSystem: !!b.foundations?.designSystem,
                constraints: !!b.foundations?.constraints,
                businessKpis: !!b.foundations?.businessKpis,
            },
            hasResearch: !!(b.hasResearch),
            primaryQuestion: b.primaryQuestion,
            researchApproach: b.researchApproach,
            interviewCount: b.interviewCount,
        },
    };
}
// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        req.on("error", reject);
    });
}
// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    // Config endpoint — provides vault root to the frontend
    if (req.method === "GET" && url.pathname === "/api/config") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ vaultRoot: resolvedVaultRoot }));
        return;
    }
    // Scaffold API
    if (req.method === "POST" && url.pathname === "/api/scaffold") {
        try {
            const raw = await readBody(req);
            const body = JSON.parse(raw);
            const validation = validateFormData(body);
            if (!validation.valid) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: validation.error }));
                return;
            }
            const result = scaffold(validation.data);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, result }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
        }
        return;
    }
    // Static files
    if (req.method === "GET") {
        const filePath = url.pathname === "/"
            ? join(PUBLIC_DIR, "index.html")
            : join(PUBLIC_DIR, url.pathname.replace(/^\//, ""));
        // Prevent path traversal
        if (!filePath.startsWith(PUBLIC_DIR)) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
        }
        if (!existsSync(filePath)) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }
        const content = readFileSync(filePath);
        res.writeHead(200, { "Content-Type": getMime(filePath) });
        res.end(content);
        return;
    }
    res.writeHead(405);
    res.end("Method not allowed");
});
server.listen(PORT, () => {
    console.log(`Scaffold UI running at http://localhost:${PORT}`);
    console.log(`Vault root: ${resolvedVaultRoot}`);
});
