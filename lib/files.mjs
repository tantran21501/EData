import fs from "node:fs/promises";
import path from "node:path";

export const dataRoot = path.resolve("public/data");
export const stateRoot = path.resolve(".state");

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJsonAtomic(relativePath, value) {
  const destination = path.join(dataRoot, relativePath);
  const temporary = `${destination}.tmp`;
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  JSON.parse(await fs.readFile(temporary, "utf8"));
  await fs.rename(temporary, destination);
  return destination;
}

export async function loadRunState() {
  await fs.mkdir(stateRoot, { recursive: true });
  return readJson(path.join(stateRoot, "fetch-state.json"), { sources: {} });
}

export async function saveRunState(state) {
  await fs.writeFile(path.join(stateRoot, "fetch-state.json"), `${JSON.stringify(state, null, 2)}\n`);
}

export function isDue(sourceState, intervalHours, force = false) {
  if (force || !sourceState?.lastSuccessAt) return true;
  return Date.now() - new Date(sourceState.lastSuccessAt).getTime() >= intervalHours * 3_600_000;
}

export async function existingDataset(relativePath) {
  return readJson(path.join(dataRoot, relativePath));
}
