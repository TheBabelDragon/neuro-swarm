# neuro-swarm

Browser-based **neuroevolution drone swarm**.

You pilot one quad. The rest are AI agents controlled by tiny neural networks that evolve every generation. They start chaotic and become a coordinated hunt.

Pure static site → GitHub Pages.

Live: https://thebabeldragon.github.io/neuro-swarm/

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080

## Controls

Desktop
- **WASD / arrows** — move
- **Space / Shift** — boost
- **F / J / Ctrl** — fire
- **R** — force new generation

Touch
- **Left side drag** — virtual stick (appears under your thumb)
- **FIRE** — lasers
- **Right side hold** or **BOOST** — boost
- **GEN** — next generation

First tap also unlocks the rotor bed / threat tone.

## Stack

- Vanilla JS
- From-scratch neural nets + genetic algorithm
- 2.5D quads, follow cam, sparks, Web Audio
- Light Reynolds flocking under the nets

Part of the broader MetaField / swarm experiments.

## Layout

```
index.html
style.css
js/net.js      tiny feedforward net
js/ga.js       genetic algorithm
js/flock.js    separation / alignment / cohesion
js/audio.js    field tone + hits
js/input.js    keyboard + touch
js/world.js    drones, fitness, generations
js/main.js     camera + render loop
```

Pages: Settings → Pages → Source → GitHub Actions. Until that click, deploys fail.

## License

MIT
