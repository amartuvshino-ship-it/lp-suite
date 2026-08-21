// =============================================================================
// SIMPLEX ENGINE — Handles ≤, ≥, = constraints with slack/surplus/artificial vars.
// =============================================================================
//
// LP problem representation:
//   {
//     objective: 'max' | 'min',
//     c: [Frac,...]                  (n coefficients of x_1..x_n)
//     A: [[Frac,...]]                (m × n)
//     ops: ['<=' | '>=' | '=']       (m of them)
//     b: [Frac,...]                  (m of them)
//     varNames: ['x_1', ..., 'x_n']
//     nonneg: [bool,...]             (length n; true = x_j >= 0; false = free)
//   }
//
// Internal extended tableau:
//   columns: [original n] [slack/surplus] [artificial] [RHS]
//   rows:    one per constraint
// Z-row tracked separately as { num: Frac[], mc: Frac[] } where 'mc' is M-coefficient.
// =============================================================================

(function () {
  'use strict';
  const F = window.LP.F;
  const Frac = window.LP.Frac;

  class SimplexEngine {
    constructor(lp, opts) {
      opts = opts || {};
      this.lp = lp;
      this.useBigM = !!opts.useBigM;
      this.steps = [];
      this.status = 'pending';
      this.iterations = 0;
      this.maxIters = 100;
    }

    // -----------------------------
    // Preprocess: build extended tableau
    // -----------------------------
    preprocess() {
      const lp = this.lp;
      const n = lp.c.length;
      const m = lp.b.length;

      // Ensure all RHS >= 0 by flipping negative-RHS rows
      const A = lp.A.map(row => row.map(Frac.from));
      const b = lp.b.map(Frac.from);
      const ops = lp.ops.slice();
      for (let i = 0; i < m; i++) {
        if (b[i].isNeg()) {
          for (let j = 0; j < n; j++) A[i][j] = A[i][j].neg();
          b[i] = b[i].neg();
          if (ops[i] === '<=') ops[i] = '>=';
          else if (ops[i] === '>=') ops[i] = '<=';
        }
      }

      // Determine slack / surplus / artificial counts
      const aux = [];
      for (let i = 0; i < m; i++) {
        if (ops[i] === '<=') {
          aux.push({
            type: 'slack', row: i,
            name: 's_' + (aux.filter(a => a.type === 'slack' || a.type === 'surplus').length + 1)
          });
        } else if (ops[i] === '>=') {
          aux.push({
            type: 'surplus', row: i,
            name: 's_' + (aux.filter(a => a.type === 'slack' || a.type === 'surplus').length + 1)
          });
          aux.push({
            type: 'artificial', row: i,
            name: 'A_' + (aux.filter(a => a.type === 'artificial').length + 1)
          });
        } else { // =
          aux.push({
            type: 'artificial', row: i,
            name: 'A_' + (aux.filter(a => a.type === 'artificial').length + 1)
          });
        }
      }

      const totalAux = aux.length;
      const totalCols = n + totalAux;
      const tableau = [];

      for (let i = 0; i < m; i++) {
        const row = new Array(totalCols + 1).fill(null).map(() => F(0));
        for (let j = 0; j < n; j++) row[j] = A[i][j];
        row[totalCols] = b[i];
        tableau.push(row);
      }
      for (let k = 0; k < totalAux; k++) {
        const a = aux[k];
        const col = n + k;
        if (a.type === 'slack') tableau[a.row][col] = F(1);
        else if (a.type === 'surplus') tableau[a.row][col] = F(-1);
        else tableau[a.row][col] = F(1);
      }

      const varNames = [];
      for (let j = 0; j < n; j++) varNames.push(lp.varNames ? lp.varNames[j] : ('x_' + (j + 1)));
      for (const a of aux) varNames.push(a.name);

      const isMax = lp.objective === 'max';
      const cExtended = [];
      const cM = [];
      for (let j = 0; j < n; j++) { cExtended.push(Frac.from(lp.c[j])); cM.push(F(0)); }
      for (const a of aux) {
        if (a.type === 'artificial') {
          cExtended.push(F(0));
          cM.push(isMax ? F(-1) : F(1));
        } else {
          cExtended.push(F(0));
          cM.push(F(0));
        }
      }

      // Initial basis: artificial if present, else slack
      const basis = new Array(m).fill(-1);
      for (const a of aux) {
        const col = n + aux.indexOf(a);
        if (a.type === 'artificial') basis[a.row] = col;
      }
      for (const a of aux) {
        const col = n + aux.indexOf(a);
        if (a.type === 'slack' && basis[a.row] === -1) basis[a.row] = col;
      }

      this.state = {
        n: n, m: m, totalCols: totalCols, totalAux: totalAux, aux: aux,
        tableau: tableau, varNames: varNames, basis: basis,
        cExtended: cExtended, cM: cM,
        isMax: isMax,
        hasArtificial: aux.some(a => a.type === 'artificial'),
      };
      return this.state;
    }

    // -----------------------------
    // Compute Z-row (zj - cj) for each column, split into numeric and M parts
    // -----------------------------
    computeZRow(state) {
      state = state || this.state;
      const { tableau, basis, cExtended, cM, totalCols, m } = state;
      const num = new Array(totalCols + 1).fill(null).map(() => F(0));
      const mc  = new Array(totalCols + 1).fill(null).map(() => F(0));
      for (let j = 0; j <= totalCols; j++) {
        let snum = F(0), smc = F(0);
        for (let i = 0; i < m; i++) {
          const cb_num = cExtended[basis[i]];
          const cb_m   = cM[basis[i]];
          snum = snum.add(cb_num.mul(tableau[i][j]));
          smc  = smc.add(cb_m.mul(tableau[i][j]));
        }
        if (j < totalCols) {
          num[j] = snum.sub(cExtended[j]);
          mc[j]  = smc.sub(cM[j]);
        } else {
          num[j] = snum;
          mc[j]  = smc;
        }
      }
      return { num: num, mc: mc };
    }

    // -----------------------------
    // Choose entering column
    // For max: most negative (M dominates). For min: most positive.
    // -----------------------------
    chooseEntering(zRow, isMax) {
      const { totalCols } = this.state;
      let best = -1;
      let bestNum = F(0), bestMc = F(0);
      for (let j = 0; j < totalCols; j++) {
        const num = zRow.num[j], mc = zRow.mc[j];
        let isImproving = false;
        if (isMax) {
          isImproving = mc.isNeg() || (mc.isZero() && num.isNeg());
        } else {
          isImproving = mc.isPos() || (mc.isZero() && num.isPos());
        }
        if (!isImproving) continue;

        if (best === -1) {
          best = j; bestNum = num; bestMc = mc;
        } else {
          if (isMax) {
            const cmpM = mc.cmp(bestMc);
            if (cmpM < 0 || (cmpM === 0 && num.cmp(bestNum) < 0)) {
              best = j; bestNum = num; bestMc = mc;
            }
          } else {
            const cmpM = mc.cmp(bestMc);
            if (cmpM > 0 || (cmpM === 0 && num.cmp(bestNum) > 0)) {
              best = j; bestNum = num; bestMc = mc;
            }
          }
        }
      }
      return best;
    }

    // -----------------------------
    // Min ratio test for leaving row
    // -----------------------------
    chooseLeaving(pivotCol) {
      const { tableau, m, totalCols } = this.state;
      let best = -1;
      let bestRatio = null;
      const ratios = [];
      for (let i = 0; i < m; i++) {
        const a = tableau[i][pivotCol];
        const b = tableau[i][totalCols];
        if (a.isPos()) {
          const r = b.div(a);
          ratios.push(r);
          if (bestRatio === null || r.lt(bestRatio)) { bestRatio = r; best = i; }
        } else {
          ratios.push(null);
        }
      }
      return { row: best, ratios: ratios };
    }

    // -----------------------------
    // Pivot operation
    // -----------------------------
    pivot(row, col) {
      const { tableau, m, totalCols } = this.state;
      const piv = tableau[row][col];
      for (let j = 0; j <= totalCols; j++) tableau[row][j] = tableau[row][j].div(piv);
      for (let i = 0; i < m; i++) {
        if (i === row) continue;
        const factor = tableau[i][col];
        if (factor.isZero()) continue;
        for (let j = 0; j <= totalCols; j++) {
          tableau[i][j] = tableau[i][j].sub(factor.mul(tableau[row][j]));
        }
      }
      this.state.basis[row] = col;
    }

    // -----------------------------
    // Snapshot for step rendering
    // -----------------------------
    snapshot(label, extra) {
      extra = extra || {};
      const s = this.state;
      const snap = {
        label: label,
        iter: this.iterations,
        tableau: s.tableau.map(r => r.map(v => v)),
        basis: s.basis.slice(),
        varNames: s.varNames.slice(),
        n: s.n,
        totalCols: s.totalCols,
        aux: s.aux.slice(),
        isMax: s.isMax,
        zRow: this.computeZRow(),
      };
      Object.assign(snap, extra);
      return snap;
    }

    // -----------------------------
    // Run full simplex
    // -----------------------------
    solve() {
      this.preprocess();
      this.steps.push(this.snapshot('Анхны хүснэгт'));

      while (this.iterations < this.maxIters) {
        const z = this.computeZRow();
        const enter = this.chooseEntering(z, this.state.isMax);
        if (enter === -1) {
          // Optimal — but check artificial vars
          if (this.state.hasArtificial) {
            for (let i = 0; i < this.state.m; i++) {
              const bi = this.state.basis[i];
              const auxIdx = bi - this.state.n;
              const isArt = auxIdx >= 0 && this.state.aux[auxIdx] && this.state.aux[auxIdx].type === 'artificial';
              if (isArt && this.state.tableau[i][this.state.totalCols].isPos()) {
                this.status = 'infeasible';
                this.steps.push(this.snapshot('Бодлого шийдгүй (Infeasible)', { final: true, infeasible: true }));
                return this;
              }
            }
          }
          this.status = 'optimal';
          this.steps.push(this.snapshot('Оновчтой шийд', { final: true, optimal: true }));
          return this;
        }
        const result = this.chooseLeaving(enter);
        const leave = result.row;
        const ratios = result.ratios;
        if (leave === -1) {
          this.status = 'unbounded';
          this.steps.push(this.snapshot('Хязгааргүй шийд (Unbounded)', { final: true, unbounded: true, enterCol: enter }));
          return this;
        }
        this.steps.push(this.snapshot('Iteration ' + (this.iterations + 1) + ': гол элемент сонгох', {
          enterCol: enter, leaveRow: leave, ratios: ratios
        }));
        this.pivot(leave, enter);
        this.iterations++;
      }
      this.status = 'maxiter';
      this.steps.push(this.snapshot('Давталтын дээд хязгаарт хүрлээ', { final: true }));
      return this;
    }

    // -----------------------------
    // Extract final solution
    // -----------------------------
    getSolution() {
      if (this.status !== 'optimal') return null;
      const s = this.state;
      const x = new Array(s.n).fill(F(0));
      for (let i = 0; i < s.m; i++) {
        const b = s.basis[i];
        if (b < s.n) x[b] = s.tableau[i][s.totalCols];
      }
      const z = this.computeZRow();
      const zVal = z.num[s.totalCols];

      const shadowPrices = [];
      for (let k = 0; k < s.aux.length; k++) {
        const a = s.aux[k];
        if (a.type === 'slack' || a.type === 'surplus') {
          const col = s.n + k;
          shadowPrices.push({ row: a.row, type: a.type, value: z.num[col] });
        }
      }
      return { x: x, z: zVal, shadowPrices: shadowPrices, basis: s.basis.slice(), aux: s.aux };
    }
  }

  window.LP = window.LP || {};
  window.LP.SimplexEngine = SimplexEngine;
})();
