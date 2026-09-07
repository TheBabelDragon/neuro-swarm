/* Genetic algorithm over Net genomes. */
const GA = (() => {
  const ELITE = 0.18;
  const MUTATION = 0.14;
  const SIGMA = 0.28;

  function rank(agents) {
    return agents.slice().sort((a, b) => b.fitness - a.fitness);
  }

  function tournament(pool) {
    const a = pool[(Math.random() * pool.length) | 0];
    const b = pool[(Math.random() * pool.length) | 0];
    return a.fitness >= b.fitness ? a : b;
  }

  function crossover(a, b) {
    const child = new Float32Array(a.length);
    const cut = (Math.random() * a.length) | 0;
    for (let i = 0; i < a.length; i++) child[i] = i < cut ? a[i] : b[i];
    return child;
  }

  function mutate(g) {
    for (let i = 0; i < g.length; i++) {
      if (Math.random() < MUTATION) g[i] += (Math.random() * 2 - 1) * SIGMA;
    }
    return g;
  }

  function nextGeneration(agents) {
    const sorted = rank(agents);
    const n = agents.length;
    const keep = Math.max(2, Math.round(n * ELITE));
    const next = [];
    for (let i = 0; i < keep; i++) next.push(Net.copyGenome(sorted[i].genome));
    while (next.length < n) {
      const p1 = tournament(sorted);
      const p2 = tournament(sorted);
      next.push(mutate(crossover(p1.genome, p2.genome)));
    }
    return { genomes: next, best: sorted[0].fitness, median: sorted[(n / 2) | 0].fitness };
  }

  return { nextGeneration, rank };
})();
