import { execSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXT_PATH = path.resolve(
  __dirname,
  "../packages/langium-liquid-extension"
);

function run(command, cwd = EXT_PATH) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit", cwd });
}

async function main() {
  if (!fs.existsSync(EXT_PATH)) {
    console.error(`❌ Extension directory not found: ${EXT_PATH}`);
    process.exit(1);
  }

  console.log("🏗️  Building VS Code extension...");

  // Install dependencies
  if (!fs.existsSync(path.join(EXT_PATH, "node_modules"))) {
    console.log("📦 Installing dependencies...");
    run("npm install");
  }

  // Build the extension (if it has a build step)
  if (fs.existsSync(path.join(EXT_PATH, "package.json"))) {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(EXT_PATH, "package.json"), "utf8")
    );
    if (pkg.scripts?.build) {
      console.log("🔧 Running build script...");
      run("npm run build");
    } else {
      console.log(
        "⚠️ No build script found in package.json, skipping build step."
      );
    }
  }

  try {
    run("npx vsce --version", EXT_PATH);
  } catch {
    console.log("⬇️  Installing vsce...");
    run("npm install -g @vscode/vsce");
  }

  console.log("📦 Packaging extension with vsce...");
  run("npx vsce package", EXT_PATH);

  const files = fs.readdirSync(EXT_PATH).filter((f) => f.endsWith(".vsix"));
  if (files.length === 0) {
    console.error("❌ No .vsix file found after packaging.");
    process.exit(1);
  }

  const vsixFile = files[0];

  const vsixPath = path.join(EXT_PATH, vsixFile);
  const rootVsixPath = path.resolve(__dirname, "..", vsixFile);
  fs.renameSync(vsixPath, rootVsixPath);

  console.log(`✅ Extension packaged successfully: ${rootVsixPath}`);
}

main().catch((err) => {
  console.error("❌ Error building extension:", err);
  process.exit(1);
});
