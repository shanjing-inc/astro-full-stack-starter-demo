import { access } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const searchDirs = [repoRoot, process.cwd()];

const forbiddenArtifacts = [
    {
        filename: "package-lock.json",
        guidance: "请删除 package-lock.json，并改用 pnpm install。",
    },
    {
        filename: "npm-shrinkwrap.json",
        guidance: "请删除 npm-shrinkwrap.json，并改用 pnpm install。",
    },
    {
        filename: "yarn.lock",
        guidance: "请删除 yarn.lock，并改用 pnpm install。",
    },
];

async function findForbiddenArtifacts() {
    const foundArtifacts = [];

    for (const searchDir of searchDirs) {
        for (const artifact of forbiddenArtifacts) {
            try {
                await access(path.join(searchDir, artifact.filename));
                foundArtifacts.push({
                    ...artifact,
                    path: path.relative(repoRoot, path.join(searchDir, artifact.filename)),
                });
            } catch {
                continue;
            }
        }
    }

    return foundArtifacts;
}

const foundArtifacts = await findForbiddenArtifacts();

if (foundArtifacts.length === 0) {
    process.exit(0);
}

console.error("");
console.error("ERROR: 检测到不允许提交的依赖管理产物。");

for (const artifact of foundArtifacts) {
    console.error(`- ${artifact.path}: ${artifact.guidance}`);
}

console.error("");
process.exit(1);
