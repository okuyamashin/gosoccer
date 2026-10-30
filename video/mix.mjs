// Adds a music track to the recorded video, cut to the video's length with a fade-out.
//
//   node mix.mjs path/to/music.mp3      ->  out/gosoccer_music.mp4

import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const music = process.argv[2];
if (!music) {
    console.error('Usage: node mix.mjs path/to/music.(mp3|wav|m4a)');
    process.exit(1);
}
const OUT = new URL('./out/', import.meta.url).pathname;
const video = `${OUT}gosoccer.mp4`;

// Video length in seconds, read from ffmpeg's header output
let info = '';
try {
    execFileSync(ffmpegPath, ['-i', video], { stdio: 'pipe' });
} catch (e) {
    info = e.stderr.toString(); // ffmpeg exits with an error when given no output file
}
const [, h, m, sec] = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
const length = Number(h) * 3600 + Number(m) * 60 + Number(sec);
const FADE = 3;

execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', video, '-i', music,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-af', `afade=t=out:st=${(length - FADE).toFixed(2)}:d=${FADE}`,
    '-t', length.toFixed(2), '-movflags', '+faststart', `${OUT}gosoccer_music.mp4`]);
console.log(`Wrote ${OUT}gosoccer_music.mp4 (${length.toFixed(1)} s)`);
