// Records the explainer video of the published game with headless Chrome.
// Captions are drawn as HTML on top of the game, so the video shows exactly what the
// page renders. Scene timing follows the song in music/ (see the timeline below).
// Output: out/gosoccer.mp4 (1920x1080, no audio). Then add the song with mix.mjs.
//
//   npm install          (once; uses the installed Google Chrome and a bundled ffmpeg)
//   node record.mjs
//   node mix.mjs music/no_place_to_corner_me.mp3   ->  out/gosoccer_music.mp4

import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import ffmpegPath from 'ffmpeg-static';

const GAME_URL = 'https://okuyamashin.github.io/gosoccer/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1920, H = 1080;
const OUT = new URL('./out/', import.meta.url).pathname;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }
});
const page = await browser.newPage();
// Japanese page and captions regardless of this machine's language
await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja' });
await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['ja-JP', 'ja'] });
    Object.defineProperty(navigator, 'language', { get: () => 'ja-JP' });
});
await page.goto(`${GAME_URL}?video=${Date.now()}`, { waitUntil: 'networkidle0' });
await sleep(1500);

// Video helpers inside the page: caption box, title card, highlight markers
await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
        #v-caption { position: fixed; left: 50%; bottom: 72px; transform: translateX(-50%);
            z-index: 40; text-align: center; color: #fff; padding: 18px 40px; border-radius: 18px;
            background: rgba(15, 23, 42, 0.72); transition: opacity 0.4s; opacity: 0;
            font-family: 'Hiragino Sans', sans-serif; white-space: nowrap; }
        #v-caption .ja { font-size: 46px; font-weight: 700; line-height: 1.35; }
        #v-caption .en { font-size: 30px; margin-top: 6px; opacity: 0.9; font-family: 'Inter', sans-serif; }
        #v-title { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column;
            justify-content: center; padding-left: 140px; color: #fff; transition: opacity 0.6s;
            text-shadow: 0 3px 16px rgba(0, 0, 0, 0.7); opacity: 0;
            background: linear-gradient(90deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.35) 45%, rgba(15,23,42,0) 65%); }
        #v-title .big { font-size: 150px; font-weight: 800; letter-spacing: 0.04em; font-family: 'Hiragino Sans', sans-serif; }
        #v-title .mid { font-size: 72px; font-weight: 700; margin-top: 8px; }
        #v-title .small { font-size: 40px; margin-top: 36px; font-family: 'Hiragino Sans', sans-serif; }
    `;
    document.head.appendChild(style);
    const cap = document.createElement('div');
    cap.id = 'v-caption';
    cap.innerHTML = '<div class="ja"></div><div class="en"></div>';
    document.body.appendChild(cap);
    const title = document.createElement('div');
    title.id = 'v-title';
    document.body.appendChild(title);

    window.BALL_DIST = 23;
    window.v = {
        caption(ja, en) {
            cap.querySelector('.ja').textContent = ja;
            cap.querySelector('.en').textContent = en;
            cap.style.opacity = ja ? 1 : 0;
        },
        title(html) {
            title.innerHTML = html;
            title.style.opacity = html ? 1 : 0;
        },
        // Show the game panel on the right side of the screen, enlarged for 1080p
        panel(show) {
            const panel = document.getElementById('panel');
            panel.style.visibility = show ? 'visible' : 'hidden';
            panel.style.transform = 'scale(1.5)';
            panel.style.transformOrigin = 'top right';
            panel.style.marginTop = '90px';
            panel.parentElement.style.alignItems = 'flex-end';
            panel.parentElement.style.paddingRight = '140px';
        },
        // Look at the ball from the front again (the demo may have turned it anywhere)
        view(dist = BALL_DIST) {
            controls.autoRotate = false;
            focusAnim = null; // Stop any turn toward a CPU move that is still running
            camera.position.set(0, 0.25, 1).setLength(dist);
            camera.lookAt(0, 0, 0);
            controls.update();
        },
        // Push the ball to one side of the screen: x in screen widths (0 = centered)
        shift(x) {
            camera.setViewOffset(innerWidth, innerHeight, -innerWidth * x, -innerHeight * 0.06, innerWidth, innerHeight);
            camera.updateProjectionMatrix();
        },
        spin(speed) {
            controls.autoRotate = speed !== 0;
            controls.autoRotateSpeed = speed;
        },
        // Points facing the viewer, nearest first
        front() {
            const dir = camera.position.clone().normalize();
            return [...Array(60).keys()].sort((a, b) =>
                points[b].clone().normalize().dot(dir) - points[a].clone().normalize().dot(dir));
        },
        // Make empty-point markers big and colored (or back to normal with null)
        mark(indices, color) {
            const mat = new THREE.MeshBasicMaterial({ color });
            indices.forEach(i => {
                nodeMeshes[i].material = mat;
                nodeMeshes[i].scale.set(0.45, 0.45, 0.45);
            });
        },
        clearBoard() {
            document.getElementById('btn-reset').click();
            document.getElementById('toast').classList.add('hidden');
        },
        set(stones) {
            Object.entries(stones).forEach(([i, c]) => board[i] = c);
            updateUI();
        }
    };

    // Clean screen: no panel, no footer, no toasts; keep the camera fit from fighting our offsets
    document.querySelector('footer').style.display = 'none';
    window.fitCamera = () => {};
    document.getElementById('follow-cpu').checked = false;
    v.panel(false);
    v.view();
    v.shift(0);
});

const recorder = await page.screencast({ path: `${OUT}raw.webm`, ffmpegPath });

// Scenes follow the song "Go Soccer — No Place to Corner Me" (music/, 1:36).
// Times are seconds from the start of the song, read off its loudness:
// spoken intro 0-9, beat drops 10.5, break 40.5-43, verse 2 + hook 43-73.5, ending from 76.
const t0 = Date.now();
const at = (sec) => sleep(Math.max(0, t0 + sec * 1000 - Date.now()));
const scene = (fn, arg) => page.evaluate(fn, arg);

// Intro (spoken, no drums): title, with the spoken lines
await scene(() => {
    v.shift(0.24);
    v.spin(1.2);
    v.title('<div class="big">囲碁サッカー</div><div class="mid">Go Soccer</div>' +
        '<div class="small">サッカーボールで打つ囲碁 / Go on a soccer ball</div>');
});
const intro = [
    [0.2, 'サッカーボールを用意して', 'Take a soccer ball.'],
    [2.0, '囲碁を打とう', 'Play Go.'],
    [3.3, 'お願いだから', 'Please—'],
    [5.3, '蹴らないで', "don't kick it."],
    [8.0, '', '']
];
for (const [sec, ja, en] of intro) {
    await at(sec);
    await scene(([ja, en]) => v.caption(ja, en), [ja, en]);
}

// Beat drops: the board
await at(10.5);
await scene(() => {
    v.title('');
    v.shift(0);
    v.spin(4);
    v.mark([...Array(60).keys()], 0x38bdf8);
    v.caption('盤はサッカーボールの 60 の交点', 'The board: the 60 corners of a soccer ball');
});

// Three liberties, atari, capture
await at(17.5);
await scene(() => {
    v.view();
    v.clearBoard();
    const p = v.front()[0];
    window.vp = p;
    v.set({ [p]: 'B' });
    v.mark(adj[p], 0x38bdf8);
    v.caption('呼吸点はどこでも 3 つ', 'Every point has 3 liberties');
});
await at(23.5);
await scene(() => {
    v.set({ [adj[vp][0]]: 'W', [adj[vp][1]]: 'W' });
    v.mark([adj[vp][2]], 0x38bdf8);
    v.caption('2 つ囲まれたらアタリ', 'Two stones around it: atari');
});
await at(27.5);
await scene(() => {
    currentPlayer = 'W';
    attemptMove(adj[vp][2]);
    v.caption('3 つ目で取れる。勝負は速い', 'The third one captures it. Games are fast');
});

// No corners, no edges: spin it
await at(32);
await scene(() => {
    v.spin(6);
    v.caption('隅も辺もない。逃げ場はどこにもない', 'No corners, no edges. No place to hide');
});

// Break: breathe
await at(40.5);
await scene(() => {
    v.spin(0.8);
    v.caption('');
});

// Verse 2 and hook: CPU vs CPU
await at(43);
await scene(() => {
    v.clearBoard();
    v.view();
    const level = document.getElementById('level-select');
    level.value = 'easy';
    level.dispatchEvent(new Event('change'));
    document.getElementById('toast').classList.add('hidden');
    document.getElementById('follow-cpu').checked = true;
    setDemo(true);
    v.caption('CPU 同士の対局（デモ）', 'CPU vs CPU demo');
});
await at(58);
await scene(() => v.caption('球を回して、裏側までチェック', 'Spin it, check the other side'));

// Drums thin out: wind down
await at(73.5);
await scene(() => {
    setDemo(false);
    v.clearBoard();
    v.caption('');
    v.view();
    v.spin(1.2);
});

// "...I resign."
await at(76);
await scene(() => {
    v.clearBoard();
    v.view(26);
    v.shift(-0.2);
    v.panel(true);
    // Black fills the ball except two separate eyes, so every White move is suicide
    const eye1 = v.front()[0];
    const eye2 = v.front().find(j => j !== eye1 && !adj[eye1].includes(j));
    const stones = {};
    for (let i = 0; i < 60; i++) if (i !== eye1 && i !== eye2) stones[i] = 'B';
    v.set(stones);
    currentPlayer = 'W';
    playCPU();
    document.getElementById('toast').classList.add('hidden');
    v.caption('負けそうになると、CPU は「参りました」', 'When it is losing, the CPU says "I resign."');
});

// End card
await at(86);
await scene(() => {
    v.panel(false);
    v.caption('');
    v.clearBoard();
    v.view();
    v.shift(0.24);
    v.spin(1.2);
    v.title('<div class="mid">ブラウザですぐ遊べます</div>' +
        '<div class="small">Play it in your browser</div>' +
        '<div class="mid" style="margin-top:40px;font-size:56px">okuyamashin.github.io/gosoccer</div>');
});
await at(96.5);

await recorder.stop();
await browser.close();

// H.264 MP4 for YouTube
execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', `${OUT}raw.webm`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-crf', '18', '-movflags', '+faststart',
    `${OUT}gosoccer.mp4`]);
console.log(`Wrote ${OUT}gosoccer.mp4`);
