import { spawn } from "node:child_process";

export function run(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err = (err + d).slice(-4000)));
    p.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    p.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, out, err });
    });
  });
}

export async function ffmpegAvailable(): Promise<boolean> {
  try {
    const r = await run("ffmpeg", ["-version"], 5000);
    return r.code === 0;
  } catch {
    return false;
  }
}

export type Probe = { duration: number; hdr: boolean; width: number; height: number };

export async function probe(file: string): Promise<Probe | null> {
  try {
    const r = await run(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,color_transfer:format=duration", "-of", "json", file],
      20000,
    );
    if (r.code !== 0) return null;
    const j = JSON.parse(r.out) as { streams?: { width?: number; height?: number; color_transfer?: string }[]; format?: { duration?: string } };
    const s = j.streams?.[0];
    const duration = Number(j.format?.duration);
    if (!s || !Number.isFinite(duration)) return null;
    return {
      duration,
      width: s.width ?? 0,
      height: s.height ?? 0,
      hdr: s.color_transfer === "arib-std-b67" || s.color_transfer === "smpte2084",
    };
  } catch {
    return null;
  }
}

const SCALE = "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'";
const TONEMAP =
  "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p";

/** Compresse en H.264/AAC (720p max, qualité « visuellement sans perte » CRF 23), lisible partout. */
export async function toH264(input: string, output: string, hdr: boolean): Promise<void> {
  const base = (vf: string) => [
    "-y", "-i", input, "-map", "0:v:0", "-map", "0:a:0?",
    "-vf", vf,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-threads", "2", output,
  ];
  if (hdr) {
    const r = await run("ffmpeg", base(`${TONEMAP},${SCALE}`), 110000);
    if (r.code === 0) return;
    // filtres HDR indisponibles : conversion simple (couleurs un peu ternes mais lisible)
  }
  const r = await run("ffmpeg", base(`${SCALE},format=yuv420p`), 110000);
  if (r.code !== 0) throw new Error(`ffmpeg a échoué : ${r.err.split("\n").slice(-3).join(" ").slice(0, 300)}`);
}

export async function thumbnail(input: string, output: string, at: number): Promise<boolean> {
  const r = await run("ffmpeg", ["-y", "-ss", String(at), "-i", input, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "4", output], 30000);
  return r.code === 0;
}
