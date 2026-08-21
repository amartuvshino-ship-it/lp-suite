// =============================================================================
// BRANCH & BOUND ENGINE — Integer Linear Programming via LP relaxation
// =============================================================================
// Algorithm:
//   1. Solve LP relaxation (drop integer constraints, solve normally)
//   2. If solution all-integer → optimal
//   3. Else pick fractional variable, branch into two subproblems:
//        - x_j ≤ floor(value)
//        - x_j ≥ ceil(value)
//   4. For each subproblem:
//        - Infeasible → prune
//        - Z worse than incumbent integer → prune (bounding)
//        - All integer → update incumbent
//        - Otherwise → branch further
//   5. Repeat until no open nodes
//
// Returns:
//   {
//     status: 'optimal' | 'infeasible' | 'unbounded',
//     bestX: [Frac, ...],   // integer solution
//     bestZ: Frac,
//     tree: [ {nodeId, parentId, ...} ],   // for visualization
//     incumbentHistory: [...],
//   }
// =============================================================================

(function () {
  'use strict';
  const F = window.LP.F;
  const Frac = window.LP.Frac;
  const SimplexEngine = window.LP.SimplexEngine;

  function isInteger(frac) {
    return frac.d === 1;
  }

  function floorFrac(frac) {
    if (isInteger(frac)) return frac;
    let q = Math.floor(frac.n / frac.d);
    return F(q);
  }

  function ceilFrac(frac) {
    if (isInteger(frac)) return frac;
    let q = Math.floor(frac.n / frac.d);
    if (frac.n % frac.d !== 0) q++;
    return F(q);
  }

  // -----------------------------
  // Find first fractional variable; returns {idx, value} or null
  // We pick the variable with the most fractional value (closest to 0.5)
  // -----------------------------
  function pickBranchVar(x) {
    let best = -1;
    let bestFrac = F(0);
    for (let j = 0; j < x.length; j++) {
      if (isInteger(x[j])) continue;
      // fractional part
      const f = x[j].sub(floorFrac(x[j])); // in [0, 1)
      // distance from 0.5: smaller is more fractional
      const halfDist = f.sub(F(1, 2));
      const d = halfDist.isNeg() ? halfDist.neg() : halfDist;
      const score = F(1, 2).sub(d); // higher = more fractional
      if (best === -1 || score.gt(bestFrac)) {
        best = j;
        bestFrac = score;
      }
    }
    if (best === -1) return null;
    return { idx: best, value: x[best] };
  }

  // -----------------------------
  // Add a new constraint to a copy of the LP
  // newOp: '<=' or '>='
  // newRhs: Frac
  // -----------------------------
  function addBoundConstraint(lp, varIdx, newOp, newRhs) {
    const n = lp.c.length;
    const newRow = new Array(n).fill(F(0));
    newRow[varIdx] = F(1);
    return {
      objective: lp.objective,
      c: lp.c.slice(),
      A: lp.A.concat([newRow]),
      ops: lp.ops.concat([newOp]),
      b: lp.b.concat([newRhs]),
      varNames: lp.varNames ? lp.varNames.slice() : null,
      nonneg: lp.nonneg ? lp.nonneg.slice() : null,
    };
  }

  // -----------------------------
  // Main solve
  // -----------------------------
  function solve(lp, opts) {
    opts = opts || {};
    const integerVars = opts.integerVars || lp.c.map((_, j) => j);  // default: all vars integer
    const maxNodes = opts.maxNodes || 200;
    const isMax = lp.objective === 'max';

    const tree = [];
    let nextId = 0;

    // Solve root LP
    const rootEng = new SimplexEngine(lp, { useBigM: true }).solve();
    const rootNode = {
      id: nextId++,
      parentId: null,
      lp: lp,
      branchInfo: null,   // root has no branch info
      depth: 0,
      status: rootEng.status,
      x: null, z: null,
      action: '',
      isInteger: false,
    };

    if (rootEng.status === 'infeasible') {
      rootNode.action = 'Шийдгүй';
      tree.push(rootNode);
      return { status: 'infeasible', tree: tree };
    }
    if (rootEng.status === 'unbounded') {
      rootNode.action = 'Хязгааргүй';
      tree.push(rootNode);
      return { status: 'unbounded', tree: tree };
    }

    const rootSol = rootEng.getSolution();
    rootNode.x = rootSol.x;
    rootNode.z = rootSol.z;
    rootNode.isInteger = integerVars.every(j => isInteger(rootSol.x[j]));
    tree.push(rootNode);

    // If root is already integer, done
    if (rootNode.isInteger) {
      rootNode.action = 'Анхны LP-ийн шийд бүхэл тоо — оптимум';
      return {
        status: 'optimal',
        bestX: rootSol.x,
        bestZ: rootSol.z,
        tree: tree,
        incumbentHistory: [{ nodeId: rootNode.id, x: rootSol.x, z: rootSol.z }],
      };
    }

    // Begin Branch & Bound
    let incumbentX = null;
    let incumbentZ = null;  // best integer Z found so far
    const incumbentHistory = [];

    // Stack of open nodes: [{ lp, parentId, depth, branchInfo }]
    // We'll do depth-first to find an incumbent quickly
    const openNodes = [];

    // Branch on root
    const branch = pickBranchVar(rootSol.x);
    if (branch) {
      const v = branch.value;
      const fl = floorFrac(v);
      const ce = ceilFrac(v);
      const varName = (lp.varNames ? lp.varNames[branch.idx] : ('x_' + (branch.idx + 1)));

      // Push right branch first so left is processed first (DFS)
      openNodes.push({
        lp: addBoundConstraint(lp, branch.idx, '>=', ce),
        parentId: rootNode.id,
        depth: 1,
        branchInfo: { varIdx: branch.idx, varName: varName, op: '>=', rhs: ce, parentValue: v },
      });
      openNodes.push({
        lp: addBoundConstraint(lp, branch.idx, '<=', fl),
        parentId: rootNode.id,
        depth: 1,
        branchInfo: { varIdx: branch.idx, varName: varName, op: '<=', rhs: fl, parentValue: v },
      });
      rootNode.action = 'Салаалах: ' + varName + ' = ' + v.toString() +
                        ' (бутархай) → ' + varName + ' ≤ ' + fl.toString() +
                        ' эсвэл ' + varName + ' ≥ ' + ce.toString();
    }

    while (openNodes.length > 0 && tree.length < maxNodes) {
      const item = openNodes.pop();
      const eng = new SimplexEngine(item.lp, { useBigM: true }).solve();
      const node = {
        id: nextId++,
        parentId: item.parentId,
        lp: item.lp,
        branchInfo: item.branchInfo,
        depth: item.depth,
        status: eng.status,
        x: null, z: null,
        action: '',
        isInteger: false,
      };

      if (eng.status === 'infeasible') {
        node.action = '✕ Шийдгүй — салаа хаасан';
        tree.push(node);
        continue;
      }

      if (eng.status === 'unbounded') {
        node.action = '∞ Хязгааргүй — салаа хаасан';
        tree.push(node);
        continue;
      }

      const sol = eng.getSolution();
      node.x = sol.x;
      node.z = sol.z;
      node.isInteger = integerVars.every(j => isInteger(sol.x[j]));

      // Bounding: if this LP's Z is worse than current incumbent, prune
      if (incumbentZ !== null) {
        const isWorse = isMax ? sol.z.lte(incumbentZ) : sol.z.gte(incumbentZ);
        if (isWorse) {
          node.action = '✗ Хязгаарласан (' + (isMax ? 'Z ≤ Z*' : 'Z ≥ Z*') +
                        ' = ' + incumbentZ.toString() + ') — салаа хаасан';
          tree.push(node);
          continue;
        }
      }

      if (node.isInteger) {
        // New incumbent if better
        const isBetter = (incumbentZ === null) ||
          (isMax ? sol.z.gt(incumbentZ) : sol.z.lt(incumbentZ));
        if (isBetter) {
          incumbentX = sol.x;
          incumbentZ = sol.z;
          incumbentHistory.push({ nodeId: node.id, x: sol.x, z: sol.z });
          node.action = '★ Шинэ хамгийн сайн бүхэл тоон шийд: Z* = ' + sol.z.toString();
          node.isIncumbent = true;
        } else {
          node.action = '✓ Бүхэл тоон шийд (Z = ' + sol.z.toString() +
                        '), гэхдээ Z* = ' + incumbentZ.toString() + '-аас муу';
        }
        tree.push(node);
        continue;
      }

      // Branch further
      const br = pickBranchVar(sol.x);
      if (!br) {
        node.action = 'Бутархай хувьсагч олдсонгүй';
        tree.push(node);
        continue;
      }
      const v = br.value;
      const fl = floorFrac(v);
      const ce = ceilFrac(v);
      const varName = lp.varNames ? lp.varNames[br.idx] : ('x_' + (br.idx + 1));
      node.action = 'Салаалах: ' + varName + ' = ' + v.toString() +
                    ' (бутархай) → ' + varName + ' ≤ ' + fl.toString() +
                    ' эсвэл ' + varName + ' ≥ ' + ce.toString();
      tree.push(node);

      // Push children (right first so left processed first)
      openNodes.push({
        lp: addBoundConstraint(item.lp, br.idx, '>=', ce),
        parentId: node.id,
        depth: item.depth + 1,
        branchInfo: { varIdx: br.idx, varName: varName, op: '>=', rhs: ce, parentValue: v },
      });
      openNodes.push({
        lp: addBoundConstraint(item.lp, br.idx, '<=', fl),
        parentId: node.id,
        depth: item.depth + 1,
        branchInfo: { varIdx: br.idx, varName: varName, op: '<=', rhs: fl, parentValue: v },
      });
    }

    if (incumbentZ === null) {
      return {
        status: 'infeasible',
        tree: tree,
        incumbentHistory: incumbentHistory,
        note: 'Бүхэл тоон шийд олдсонгүй',
      };
    }

    return {
      status: 'optimal',
      bestX: incumbentX,
      bestZ: incumbentZ,
      tree: tree,
      incumbentHistory: incumbentHistory,
    };
  }

  window.LP = window.LP || {};
  window.LP.branchBound = { solve: solve };
})();
