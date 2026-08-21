// =============================================================================
// PROBLEM GENERATOR — generate random LP problems with sensible bounded solutions
// =============================================================================
// Strategy:
//   1. Pick random small integer coefficients for objective (max: positive,
//      min: positive too — costs)
//   2. Pick random small integer constraint coefficients
//   3. For ≤ constraints: RHS chosen so origin is feasible AND
//      a non-trivial interior solution exists
//   4. For ≥ constraints: RHS chosen so feasible region exists
//   5. For = constraints: RHS chosen to match a known feasible point
//
// To guarantee bounded solutions for max problems, we keep all constraints ≤
// when objective is max (default), and the user can change ops afterwards.
// =============================================================================

(function () {
  'use strict';

  // Random integer in [min, max] inclusive
  function ri(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Pick a random allowed operator
  function pickOp(allowed, defaultOp) {
    if (!allowed || allowed.length === 0) return defaultOp || '<=';
    return allowed[Math.floor(Math.random() * allowed.length)];
  }

  /**
   * Generate a random LP problem.
   *
   * @param {object} opts
   * @param {number} opts.nVars        Number of decision variables (2-10)
   * @param {number} opts.nCons        Number of constraints (1-15)
   * @param {string} opts.objective    'max' | 'min' (default: 'max')
   * @param {Array<string>} opts.allowedOps  Subset of ['<=', '>=', '=']
   * @param {string} opts.defaultOp    Used if allowedOps empty
   * @param {string} opts.methodKey    'simplex' | 'bigm' | 'graphical' | 'matrix' | 'duality'
   * @returns {object} LP problem with c, A, ops, b as plain numbers (strings)
   */
  function generateLP(opts) {
    opts = opts || {};
    const n = Math.max(1, Math.min(10, opts.nVars || 2));
    const m = Math.max(1, Math.min(15, opts.nCons || 2));
    const obj = opts.objective || 'max';
    const allowedOps = opts.allowedOps || ['<=', '>=', '='];
    const defaultOp = opts.defaultOp || '<=';
    const methodKey = opts.methodKey || 'simplex';

    // Pick a "target" solution point — small positive integers
    // We'll engineer the RHS so this point is feasible (and likely on a vertex).
    const targetX = [];
    for (let j = 0; j < n; j++) targetX.push(ri(2, 12));

    // Objective coefficients
    const c = [];
    for (let j = 0; j < n; j++) {
      // For max: positive profits; for min: positive costs
      c.push(ri(2, 50));
    }

    // For graphical method, force exactly 2 vars (caller should set nVars=2)
    // For matrix method, n must == m (caller handles)

    // Build constraints
    const A = [];
    const ops = [];
    const b = [];

    // Track which variables have been "covered" by an upper-bounding constraint
    // (for max problems with ≤). At least one ≤ constraint should bound each var.
    const covered = new Array(n).fill(false);

    for (let i = 0; i < m; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        // Coefficients between 1 and 8 (positive for sensibility)
        // 25% chance of 0 to make sparse constraints — but only if we have many vars
        if (Math.random() < 0.25 && n > 3) row.push(0);
        else row.push(ri(1, 8));
      }

      // Ensure at least one nonzero coefficient
      if (row.every(v => v === 0)) row[ri(0, n - 1)] = ri(1, 8);

      // Compute LHS at targetX
      let lhs = 0;
      for (let j = 0; j < n; j++) lhs += row[j] * targetX[j];

      // Choose op
      let op;
      if (methodKey === 'matrix') {
        op = '=';
      } else if (methodKey === 'graphical' || methodKey === 'simplex' || methodKey === 'duality') {
        if (allowedOps.length === 1) op = allowedOps[0];
        else if (Math.random() < 0.7) op = (obj === 'max') ? '<=' : '>=';
        else op = pickOp(allowedOps, defaultOp);
        if (op === '=' && Math.random() < 0.7) op = (obj === 'max') ? '<=' : '>=';
      } else {
        op = pickOp(allowedOps, defaultOp);
      }

      // Pick RHS
      let rhs;
      if (op === '<=') {
        rhs = lhs + ri(0, Math.max(5, Math.floor(lhs * 0.2)));
      } else if (op === '>=') {
        rhs = Math.max(1, lhs - ri(0, Math.max(3, Math.floor(lhs * 0.2))));
      } else {
        rhs = lhs;
      }

      // If ≤, mark all variables with positive coefficients as covered
      if (op === '<=') {
        for (let j = 0; j < n; j++) if (row[j] > 0) covered[j] = true;
      }

      A.push(row);
      ops.push(op);
      b.push(rhs);
    }

    // For max problems: ensure every variable is bounded above by some ≤ constraint.
    // If a variable isn't covered, add a "personal" upper bound for it via the
    // first ≤ constraint we can find (or by augmenting the last constraint).
    if (obj === 'max') {
      for (let j = 0; j < n; j++) {
        if (!covered[j]) {
          // Find the first ≤ constraint and add coefficient there
          let added = false;
          for (let i = 0; i < m; i++) {
            if (ops[i] === '<=' && A[i][j] === 0) {
              A[i][j] = ri(1, 4);
              // Recompute RHS
              let lhs = 0;
              for (let k = 0; k < n; k++) lhs += A[i][k] * targetX[k];
              b[i] = lhs + ri(0, 5);
              added = true;
              break;
            }
          }
          // If no ≤ constraint exists, replace the last one to be ≤
          if (!added && m > 0) {
            ops[m - 1] = '<=';
            // Set its coefficient for var j and recompute RHS
            if (A[m - 1][j] === 0) A[m - 1][j] = ri(1, 4);
            let lhs = 0;
            for (let k = 0; k < n; k++) lhs += A[m - 1][k] * targetX[k];
            b[m - 1] = lhs + ri(0, 5);
          }
        }
      }
    }

    // varNames
    const varNames = [];
    for (let j = 0; j < n; j++) varNames.push('x_' + (j + 1));

    // Verify the problem isn't trivial: at least one constraint should be "binding-able"
    // (this is just heuristic; the simplex itself will tell us)

    return {
      objective: obj,
      c: c.map(String),
      A: A.map(row => row.map(String)),
      ops: ops,
      b: b.map(String),
      varNames: varNames,
      nonneg: new Array(n).fill(true),
    };
  }

  window.LP = window.LP || {};
  window.LP.generateLP = generateLP;
})();
