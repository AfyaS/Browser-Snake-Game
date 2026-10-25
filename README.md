# Snake Game

A browser-based Snake game built with vanilla HTML5, CSS3, and JavaScript.

## Play Online

Play the live game directly in your browser:
https://afyas.github.io/Browser-Snake-Game/

## Controls

### Desktop
- Arrow Keys or W / A / S / D: Change direction
- Spacebar: Pause, resume, or start game
- Enter: Restart game after game over

### Mobile
- On-screen D-Pad: Tap directional buttons to steer
- Swipe: Swipe anywhere on the game canvas
- Tap: Start or resume game

## Features

- Apples: Regular apples grant 10 points and increase length.
- Bonus Golden Apple: Spawns every 5 apples. Catch it before the top timer expires for 30 bonus points.
- Difficulty Modes: Easy, Normal, and Hard speeds with progressive acceleration.
- Audio: Sound synthesis via Web Audio API with mute toggle.
- Persistence: High scores are saved in local storage.
- Zero Dependencies: Pure static files requiring no build step.

## Local Development

Run locally using Python:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 in any web browser.
