/* Tiny feedforward net. Genome is flattened weights + biases. */
const Net = (() => {
  const SIZES = [8, 10, 2];

  function layerParams(inN, outN) {
    return outN * inN + outN;
  }

  function genomeSize() {
    let n = 0;
    for (let i = 0; i < SIZES.length - 1; i++) n += layerParams(SIZES[i], SIZES[i + 1]);
    return n;
  }

  function randomGenome(scale = 0.6) {
    const g = new Float32Array(genomeSize());
    for (let i = 0; i < g.length; i++) g[i] = (Math.random() * 2 - 1) * scale;
    return g;
  }

  function copyGenome(g) {
    return Float32Array.from(g);
  }

  function tanh(x) {
    if (x > 8) return 1;
    if (x < -8) return -1;
    const e = Math.exp(2 * x);
    return (e - 1) / (e + 1);
  }

  function forward(genome, input) {
    let offset = 0;
    let cur = input;
    for (let li = 0; li < SIZES.length - 1; li++) {
      const inN = SIZES[li];
      const outN = SIZES[li + 1];
      const next = new Array(outN);
      for (let o = 0; o < outN; o++) {
        let sum = genome[offset + outN * inN + o];
        const w0 = offset + o * inN;
        for (let i = 0; i < inN; i++) sum += genome[w0 + i] * cur[i];
        next[o] = tanh(sum);
      }
      offset += layerParams(inN, outN);
      cur = next;
    }
    return cur;
  }

  return { SIZES, genomeSize, randomGenome, copyGenome, forward };
})();
