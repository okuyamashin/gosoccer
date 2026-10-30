# Go Soccer (囲碁サッカー)

Go played on a soccer ball.

The board is the 60 vertices of a truncated icosahedron: the corners where the
soccer ball's pentagons and hexagons meet. A sphere has no corners or edges, and
every point has exactly 3 liberties, so games are short and fights start fast.

**Play it here:** https://okuyamashin.github.io/gosoccer/

## How to play

- You play Black and move first. The CPU plays White.
- Click or tap a point to place a stone. Drag to turn the ball. Scroll or pinch to zoom.
- Capture stones by taking away all their liberties, as in regular Go.
- When both players pass in a row, the game goes to the result check (see below).
- Press **Resign** (「参りました」) twice to give up.

## Rules

| Rule | Details |
|---|---|
| Board | 60 points on a soccer ball. Each point has 3 neighbors. |
| Ko | Positional superko: a move may not repeat any earlier position. Suicide is not allowed. |
| Scoring | Area scoring: your stones plus the empty points surrounded only by your stones. |
| Komi | White gets 3.5 by default. You can choose 1.5, 3.5, 5.5 or 7.5, even mid-game. On this board the score difference is always even, so steps of 2 are enough. |
| End of game | After two passes, dead stones are estimated (Monte Carlo playouts) and shown faded. Territory is marked with small dots. Tap a stone to toggle its group between alive and dead, then press **Confirm**. |
| Resignation | The CPU resigns ("I resign.") when it has no useful move left and is behind. |

## Features

- **CPU levels:** Easy (one-move heuristic), Normal and Hard (Monte Carlo search
  with UCB1, running in a Web Worker so the page stays responsive). The level can
  be changed mid-game.
- **Hints:** points where Black cannot play are marked red, and stones in atari get
  a red outline.
- **Last move:** marked with a blue dot. When the CPU plays somewhere hard to see,
  the ball turns to show the move. Turn this off with "Follow CPU moves".
- **"It might be about time to wrap up":** shown when Black can no longer win.
  This uses Benson's algorithm to find White's unconditionally alive area, so it
  appears only when the loss is certain.
- **Japanese and English:** the language follows the browser's language setting.
- **Design:** wooden board (dark wood pentagons, light wood hexagons, each piece
  with its own grain direction), and a 360° background of a Japanese garden seen
  from an engawa (veranda) that turns with the ball.

## Project layout

```
index.html      The whole game: UI, rules, CPU (Web Worker) and 3D rendering
textures/       Wood textures and the 360° background panorama
TODO.md         Requests, bugs, open questions and decisions (in Japanese)
```

There is no build step. The page uses [three.js](https://threejs.org/) r128 and
[Tailwind CSS](https://tailwindcss.com/) 3.4.17 from CDNs, and is published with
GitHub Pages from the `main` branch.

To run it locally, serve the folder with any static web server (textures do not
load from `file://`), for example:

```bash
python3 -m http.server
```

Then open http://localhost:8000/.

## Credits

- Wood textures: [ambientCG](https://ambientcg.com/) Wood027 and Wood095,
  licensed under [CC0 1.0](https://docs.ambientcg.com/license/).
- Background panorama: generated with Google Gemini.

## Copyright

© 2026 Shin Okuyama
