import { readFile } from "fs/promises";
import { join } from "path";

export const contentType = "image/x-icon";
export const dynamic = "force-dynamic";

export default async function Icon() {
  const name =
    process.env.NODE_ENV === "development" ? "favicon-dev.ico" : "favicon.ico";
  const buf = await readFile(join(process.cwd(), "src/app", name));
  return new Response(buf, { headers: { "Content-Type": "image/x-icon" } });
}
