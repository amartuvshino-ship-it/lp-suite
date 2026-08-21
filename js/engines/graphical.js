// =============================================================================
// GRAPHICAL METHOD ENGINE — 2-variable LP solved by vertex enumeration
// =============================================================================
// Approach:
//   1. Build all half-plane constraints + non-negativity
//   2. Find pairwise intersections of constraint LINES
//   3. Filter intersections that satisfy ALL constraints (= vertices)
//   4. Evaluate Z at each vertex; pick max/min
//   5. Detect unbounded / infeasible
// =============================================================================

(function () {
  'use strict';
  const F = window.LP.F;
  const Frac = window.LP.Frac;

  class GraphicalEngine {
    constructor(lp) {
      if (lp.c.length !== 2) throw new Error('Графикийн арга нь зөвхөн 2 хувьсагчтай үед боломжтой');
      this.lp = lp;
      this.c = lp.c.map(Frac.from);
      this.A = lp.A.map(r => r.map(Frac.from));
      this.b = lp.b.map(Frac.from);
      this.ops = lp.ops.slice();
      this.isMax = (lp.objective || 'max') === 'max';
      this.nonneg = lp.nonneg ? lp.nonneg.slice() : [true, true];
      this.steps = [];
      this.status = 'pending';
    }

    buildLines() {
      const lines = [];
      for (let i = 0; i < this.A.length; i++) {
        lines.push({
          a: this.A[i][0], b: this.A[i][1], c: this.b[i],
          op: this.ops[i],
          label: 'C' + (i + 1),
          idx: i,
        });
      }
      if (this.nonneg[0]) lines.push({ a: F(1), b: F(0), c: F(0), op: '>=', label: 'x₁ ≥ 0', isAxis: true });
      if (this.nonneg[1]) lines.push({ a: F(0), b: F(1), c: F(0), op: '>=', label: 'x₂ ≥ 0', isAxis: true });
      return lines;
    }

    intersect(L1, L2) {
      const det = L1.a.mul(L2.b).sub(L1.b.mul(L2.a));
      if (det.isZero()) return null;
      const x = L1.c.mul(L2.b).sub(L1.b.mul(L2.c)).div(det);
      const y = L1.a.mul(L2.c).sub(L1.c.mul(L2.a)).div(det);
      return { x: x, y: y };
    }

    isFeasible(pt) {
      if (this.nonneg[0] && pt.x.isNeg()) return false;
      if (this.nonneg[1] && pt.y.isNeg()) return false;
      for (let i = 0; i < this.A.length; i++) {
        const v = this.A[i][0].mul(pt.x).add(this.A[i][1].mul(pt.y));
        const r = this.b[i];
        if (this.ops[i] === '<=' && v.gt(r)) return false;
        if (this.ops[i] === '>=' && v.lt(r)) return false;
        if (this.ops[i] === '='  && !v.eq(r)) return false;
      }
      return true;
    }

    objAt(pt) {
      return this.c[0].mul(pt.x).add(this.c[1].mul(pt.y));
    }

    solve() {
      const lines = this.buildLines();
      const candidates = [];
      for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
          const p = this.intersect(lines[i], lines[j]);
          if (p) candidates.push({ pt: p, lines: [lines[i].label, lines[j].label] });
        }
      }
      if (this.nonneg[0] && this.nonneg[1]) {
        candidates.push({ pt: { x: F(0), y: F(0) }, lines: ['x₁=0', 'x₂=0'] });
      }

      const seen = new Set();
      const vertices = [];
      for (const c of candidates) {
        if (!this.isFeasible(c.pt)) continue;
        const key = c.pt.x.toString() + '|' + c.pt.y.toString();
        if (seen.has(key)) continue;
        seen.add(key);
        vertices.push({
          x: c.pt.x, y: c.pt.y,
          z: this.objAt(c.pt),
          formedBy: c.lines,
        });
      }

      if (vertices.length === 0) {
        this.status = 'infeasible';
        return this;
      }

      vertices.sort((a, b) => this.isMax ? b.z.cmp(a.z) : a.z.cmp(b.z));

      // Unbounded check
      const grad = { x: this.c[0], y: this.c[1] };
      if (!grad.x.isZero() || !grad.y.isZero()) {
        const dirX = this.isMax ? grad.x : grad.x.neg();
        const dirY = this.isMax ? grad.y : grad.y.neg();
        let unbounded = true;
        for (let i = 0; i < this.A.length; i++) {
          const proj = this.A[i][0].mul(dirX).add(this.A[i][1].mul(dirY));
          if (this.ops[i] === '<=' && proj.isPos()) { unbounded = false; break; }
          if (this.ops[i] === '>=' && proj.isNeg()) { unbounded = false; break; }
          if (this.ops[i] === '='  && !proj.isZero()) { unbounded = false; break; }
        }
        if (this.nonneg[0] && dirX.isNeg()) unbounded = false;
        if (this.nonneg[1] && dirY.isNeg()) unbounded = false;
        if (unbounded) {
          this.status = 'unbounded';
          this.vertices = vertices;
          this.lines = lines;
          return this;
        }
      }

      this.status = 'optimal';
      this.optimal = vertices[0];
      this.vertices = vertices;
      this.lines = lines;
      return this;
    }

    computeBounds() {
      let xMax = 1, yMax = 1;
      for (const v of (this.vertices || [])) {
        const xn = v.x.toNumber(), yn = v.y.toNumber();
        if (xn > xMax) xMax = xn;
        if (yn > yMax) yMax = yn;
      }
      for (let i = 0; i < this.A.length; i++) {
        const a = this.A[i][0].toNumber(), b = this.A[i][1].toNumber(), c = this.b[i].toNumber();
        if (a !== 0) { const xi = c / a; if (xi > xMax) xMax = xi; }
        if (b !== 0) { const yi = c / b; if (yi > yMax) yMax = yi; }
      }
      xMax = Math.max(1, Math.ceil(xMax * 1.15));
      yMax = Math.max(1, Math.ceil(yMax * 1.15));
      return { xMin: 0, yMin: 0, xMax: xMax, yMax: yMax };
    }
  }

  window.LP = window.LP || {};
  window.LP.GraphicalEngine = GraphicalEngine;
})();
