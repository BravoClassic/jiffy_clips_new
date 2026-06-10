import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { nanoid } from "nanoid";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

// Groq vision models accept at most 5 images per request
const FRAME_COUNT = 5;

// ffmpeg exits non-zero when invoked with only an input, but still prints
// "Duration: HH:MM:SS.cs" to stderr — parse it from there.
async function getVideoDuration(videoPath: string): Promise<number> {
  let stderr = "";
  try {
    const result = await execFileAsync(ffmpegPath!, ["-i", videoPath]);
    stderr = result.stderr;
  } catch (error: any) {
    stderr = error?.stderr ?? "";
  }

  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;

  return (
    parseInt(match[1], 10) * 3600 +
    parseInt(match[2], 10) * 60 +
    parseFloat(match[3])
  );
}

export async function extractFrames(videoFile: File): Promise<string[]> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg binary not found (ffmpeg-static)");
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "jiffy-frames-"));
  const videoPath = path.join(
    workDir,
    `${nanoid()}${path.extname(videoFile.name) || ".mp4"}`
  );

  try {
    fs.writeFileSync(videoPath, Buffer.from(await videoFile.arrayBuffer()));

    const duration = await getVideoDuration(videoPath);

    // Spread FRAME_COUNT frames evenly across the video; fall back to 1 fps
    // when the duration can't be determined.
    const fps = duration > 0 ? FRAME_COUNT / duration : 1;
    const framePattern = path.join(workDir, "frame_%d.jpg");

    await execFileAsync(ffmpegPath, [
      "-i", videoPath,
      "-vf", `fps=${fps},scale=min(640\\,iw):-2`,
      "-frames:v", String(FRAME_COUNT),
      "-q:v", "5",
      framePattern,
    ]);

    const frames = fs
      .readdirSync(workDir)
      .filter((name) => name.startsWith("frame_") && name.endsWith(".jpg"))
      .sort(
        (a, b) =>
          parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10)
      )
      .map((name) =>
        fs.readFileSync(path.join(workDir, name)).toString("base64")
      );

    if (frames.length === 0) {
      throw new Error("Could not extract any frames from the video");
    }

    return frames;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
