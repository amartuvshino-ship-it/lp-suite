// =============================================================================
// DUALITY — Primal -> Dual converter
// =============================================================================
// Symmetric case rules:
//   Primal MAX: max c'x, A x ≤ b, x ≥ 0
//   ↓
//   Dual  MIN: min b'y, A' y ≥ c, y ≥ 0
//
// For mixed cases:
//   - Primal ≥ constraint  → dual variable ≤ 0
//   - Primal = constraint  → dual variable free (unrestricted)
//   - Primal x_j free      → dual constraint = (equality)
// =============================================================================

(function () {
  'use strict';
  const Frac = window.LP.Frac;

  function buildDual(primal) {
    const n = primal.c.length;
    const m = primal.b.length;
    const isMax = primal.objective === 'max';

    const dual = {
      objective: isMax ? 'min' : 'max',
      c: primal.b.map(Frac.from),
      A: [],
      ops: [],
      b: primal.c.map(Frac.from),
      varNames: primal.b.map((_, i) => 'y_' + (i + 1)),
      nonneg: primal.b.map(() => true),
      notes: [],
    };

    // Transpose A
    for (let j = 0; j < n; j++) {
      const row = [];
      for (let i = 0; i < m; i++) row.push(Frac.from(primal.A[i][j]));
      dual.A.push(row);
    }

    // Dual constraint operators (one per primal variable)
    for (let j = 0; j < n; j++) {
      if (isMax) dual.ops.push('>=');
      else dual.ops.push('<=');
    }

    // Dual variable sign per primal constraint
    for (let i = 0; i < m; i++) {
      const op = primal.ops[i];
      if (isMax) {
        if (op === '<=') dual.nonneg[i] = true;
        else if (op === '>=') {
          dual.nonneg[i] = false;
          dual.notes.push('y_' + (i + 1) + ' ≤ 0 (учир: анхдагч ≥ хязгаарлалт)');
        } else {
          dual.nonneg[i] = false;
          dual.notes.push('y_' + (i + 1) + ' free (анхдагч = хязгаарлалттай)');
        }
      } else {
        if (op === '>=') dual.nonneg[i] = true;
        else if (op === '<=') {
          dual.nonneg[i] = false;
          dual.notes.push('y_' + (i + 1) + ' ≤ 0 (учир: анхдагч ≤ хязгаарлалт)');
        } else {
          dual.nonneg[i] = false;
          dual.notes.push('y_' + (i + 1) + ' free (анхдагч = хязгаарлалттай)');
        }
      }
    }

    return dual;
  }

  window.LP = window.LP || {};
  window.LP.buildDual = buildDual;
})();
