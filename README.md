# neuro-swarm

Browser-based **neuroevolution drone swarm**.

You pilot one drone. The rest are AI agents controlled by tiny neural networks that evolve every generation via a genetic algorithm. They start chaotic and become increasingly coordinated and aggressive.

Pure static site → GitHub Pages.

Live: https://thebabeldragon.github.io/neuro-swarm/

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080

## Controls

- **WASD / Arrow keys** — move
- **Space** — boost
- **R** — force new generation

## Stack

- Vanilla JS
- From-scratch neural nets + genetic algorithm
- Canvas + a light Reynolds flocking mix so gen-1 is already a murmuration

Part of the broader MetaField / swarm experiments.

## Layout

```
index.html
style.css
js/net.js      tiny feedforward net
js/ga.js       genetic algorithm
js/flock.js    separation / alignment / cohesion
js/world.js    drones, fitness, generations
js/main.js     input + render loop
```

Pages: Settings → Pages → Source → GitHub Actions. Until that click, deploys fail.

## License

MIT
