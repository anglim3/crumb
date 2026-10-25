import { parseProject } from "./mutate.ts";
import type { Project } from "./types.ts";

/** Compressed share payload. Hash form is `#c=v2.<data>`. */
const V2_PREFIX = "v2.";

/**
 * Share token for a project.
 * New links use deflate-raw with a `v2.` prefix. Older links are base64 JSON
 * and still decode.
 */
export async function encodeShare(project: Project): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(project));
  const stream = blobFromBytes(json).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return `${V2_PREFIX}${bytesToBase64Url(bytes)}`;
}

export async function decodeShare(payload: string): Promise<Project> {
  if (payload.startsWith(V2_PREFIX)) {
    const bytes = base64UrlToBytes(payload.slice(V2_PREFIX.length));
    const stream = blobFromBytes(bytes).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const text = await new Response(stream).text();
    return parseProject(JSON.parse(text));
  }
  return parseProject(JSON.parse(decodeURIComponent(escape(atob(payload)))));
}

function blobFromBytes(bytes: Uint8Array): Blob {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Blob([copy]);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replaceAll("-", "+").replaceAll("_", "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
