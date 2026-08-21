// =============================================================================
// MATRIX ENGINE — AX = B for square systems
// =============================================================================
// Computes:
//   - determinant (via cofactor expansion)
//   - cofactor matrix
//   - adjugate (transposed cofactor)
//   - inverse = adjugate / det
//   - X = A⁻¹ · B
// =============================================================================

(function () {
  'use strict';
  const F = window.LP.F;
  const Frac = window.LP.Frac;

  class MatrixEngine {
    constructor(A, B) {
      this.n = A.length;
      if (this.n === 0 || A[0].length !== this.n) throw new Error('Матриц A нь дөрвөлжин байх ёстой');
      this.A = A.map(r => r.map(Frac.from));
      this.B = B.map(Frac.from);
      this.steps = [];
    }

    det(M) {
      M = M || this.A;
      const n = M.length;
      if (n === 1) return M[0][0];
      if (n === 2) return M[0][0].mul(M[1][1]).sub(M[0][1].mul(M[1][0]));
      let sum = F(0);
      for (let j = 0; j < n; j++) {
        const minor = this.minor(M, 0, j);
        const sign = (j % 2 === 0) ? F(1) : F(-1);
        sum = sum.add(sign.mul(M[0][j]).mul(this.det(minor)));
      }
      return sum;
    }

    minor(M, row, col) {
      return M.filter((_, i) => i !== row).map(r => r.filter((_, j) => j !== col));
    }

    cofactor() {
      const n = this.n;
      const C = [];
      for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
          const m = this.minor(this.A, i, j);
          const sign = ((i + j) % 2 === 0) ? F(1) : F(-1);
          row.push(sign.mul(this.det(m)));
        }
        C.push(row);
      }
      return C;
    }

    adjugate() {
      const C = this.cofactor();
      const n = this.n;
      const adj = [];
      for (let i = 0; i < n; i++) {
        adj.push([]);
        for (let j = 0; j < n; j++) adj[i].push(C[j][i]);
      }
      return adj;
    }

    inverse() {
      const d = this.det();
      if (d.isZero()) return null;
      const adj = this.adjugate();
      return adj.map(r => r.map(v => v.div(d)));
    }

    solve() {
      const detA = this.det();
      this.steps.push({ kind: 'det', value: detA });
      if (detA.isZero()) {
        this.status = 'singular';
        return this;
      }
      const inv = this.inverse();
      this.steps.push({ kind: 'inverse', matrix: inv });
      const n = this.n;
      const X = [];
      for (let i = 0; i < n; i++) {
        let s = F(0);
        for (let j = 0; j < n; j++) s = s.add(inv[i][j].mul(this.B[j]));
        X.push(s);
      }
      this.X = X;
      this.detA = detA;
      this.inverse_ = inv;
      this.status = 'solved';
      return this;
    }
  }

  window.LP = window.LP || {};
  window.LP.MatrixEngine = MatrixEngine;
})();
