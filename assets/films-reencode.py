# Re-encode the demo background films smaller with no visible change.
# The films are scrubbed by scroll (film.js), so the keyframe spacing (one every 8 frames) is kept exactly.
# For each film, the strongest compression is used whose picture still matches the original (SSIM >= 0.985,
# where 1.0 means identical); a film is only replaced if it gets at least 10% smaller.
# usage: python3 assets/films-reencode.py            (writes next to the originals; the originals are replaced)
import json, pathlib, re, shutil, subprocess, tempfile

ROOT = pathlib.Path(__file__).resolve().parent
FILMS = sorted(ROOT.glob("synthra/*.mp4")) + sorted(ROOT.glob("ironpath/*.mp4")) + sorted(ROOT.glob("ember/*.mp4")) + sorted(ROOT.glob("facet/*.mp4"))
MIN_SSIM = 0.985


def ssim(a, b):
    out = subprocess.run(["ffmpeg", "-v", "info", "-i", str(b), "-i", str(a), "-lavfi", "ssim", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.search(r"All:([0-9.]+)", out).group(1))


def has_audio(f):
    s = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(f)], capture_output=True, text=True).stdout)
    return any(x["codec_type"] == "audio" for x in s["streams"])


total0 = total1 = 0
for f in FILMS:
    size0 = f.stat().st_size; total0 += size0
    best = None
    with tempfile.TemporaryDirectory() as t:
        for crf in (30, 28, 26, 24, 22):                       # strongest first; stop at the first one that still matches
            out = pathlib.Path(t) / f"c{crf}.mp4"
            cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(f), "-map", "0:v:0", "-c:v", "libx264", "-preset", "veryslow", "-crf", str(crf),
                   "-g", "8", "-keyint_min", "8", "-sc_threshold", "0", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart"]
            cmd += (["-map", "0:a:0", "-c:a", "copy"] if has_audio(f) else ["-an"]) + [str(out)]
            subprocess.run(cmd, check=True)
            s = ssim(out, f)
            if s >= MIN_SSIM:
                best = (crf, s, out.stat().st_size)
                if best[2] < size0 * .9:
                    shutil.copy(out, f)
                break
    size1 = f.stat().st_size; total1 += size1
    print(f"{f.relative_to(ROOT)}: {size0/1e6:.2f} -> {size1/1e6:.2f} MB" + (f"  (crf {best[0]}, ssim {best[1]:.4f})" if best and size1 < size0 else "  (kept)"))
print(f"total: {total0/1e6:.1f} -> {total1/1e6:.1f} MB")
