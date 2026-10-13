import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

esbuild
    .build({
        entryPoints: [join(__dirname, "editor/scenario_editor.mjs")],
        bundle: true,
        format: "iife",
        globalName: "ScenarioEditorModule",
        outfile: join(__dirname, "editor/scenario_editor.bundle.js"),
        target: ["es2020"],
        define: {
            __EDITOR_BUILD__: JSON.stringify(
                new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" })
            ),
        },
        logLevel: "info",
    })
    .catch(() => process.exit(1));
