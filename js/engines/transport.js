// =============================================================================
// TRANSPORT ENGINE — NW, LCM, VAM (initial) + MODI (optimization)
// =============================================================================
// Problem representation:
//   {
//     supply: [Frac, ...]      // m supply nodes
//     demand: [Frac, ...]      // n demand nodes
//     cost:   [[Frac, ...]]    // m × n cost matrix
//     supplyNames: [str, ...]  // optional labels
//     demandNames: [str, ...]
//   }
//
// All algorithms produce:
//   - allocation matrix [m × n] of Frac
//   - steps: array of step records for visualization
//   - totalCost: Frac
//
// Balance handling:
//   If sum(supply) != sum(demand), we add a dummy row or column with cost 0
//   (transparently — UI shows a note about it).
// =============================================================================

(function () {
  'use strict';
  const F = window.LP.F;
  const Frac = window.LP.Frac;

  // -----------------------------
  // Balance the problem (add dummy supply or demand if needed)
  // -----------------------------
  function balance(input) {
    const m = input.supply.length;
    const n = input.demand.length;
    let supply = input.supply.map(Frac.from);
    let demand = input.demand.map(Frac.from);
    let cost = input.cost.map(r => r.map(Frac.from));
    let supplyNames = input.supplyNames ? input.supplyNames.slice() : Array.from({length: m}, (_,i)=>'A'+(i+1));
    let demandNames = input.demandNames ? input.demandNames.slice() : Array.from({length: n}, (_,i)=>'B'+(i+1));

    let sumS = supply.reduce((a, x) => a.add(x), F(0));
    let sumD = demand.reduce((a, x) => a.add(x), F(0));

    let dummyAdded = null;
    if (sumS.lt(sumD)) {
      // Add dummy supply row
      const diff = sumD.sub(sumS);
      supply.push(diff);
      supplyNames.push('A_dummy');
      cost.push(new Array(n).fill(F(0)));
      dummyAdded = { side: 'supply', amount: diff };
    } else if (sumD.lt(sumS)) {
      // Add dummy demand column
      const diff = sumS.sub(sumD);
      demand.push(diff);
      demandNames.push('B_dummy');
      for (let i = 0; i < cost.length; i++) cost[i].push(F(0));
      dummyAdded = { side: 'demand', amount: diff };
    }

    return {
      supply: supply,
      demand: demand,
      cost: cost,
      supplyNames: supplyNames,
      demandNames: demandNames,
      dummyAdded: dummyAdded,
    };
  }

  // -----------------------------
  // NW (Northwest Corner) Method
  // -----------------------------
  function nwMethod(rawInput) {
    const input = balance(rawInput);
    const m = input.supply.length;
    const n = input.demand.length;
    const alloc = Array.from({length: m}, () => new Array(n).fill(F(0)));
    const supplyLeft = input.supply.map(v => v);
    const demandLeft = input.demand.map(v => v);
    const steps = [];

    let i = 0, j = 0;
    while (i < m && j < n) {
      const amt = supplyLeft[i].lt(demandLeft[j]) ? supplyLeft[i] : demandLeft[j];
      alloc[i][j] = amt;
      const usedRow = supplyLeft[i].eq(amt) || supplyLeft[i].lte(demandLeft[j]);

      steps.push({
        row: i, col: j,
        amount: amt,
        supplyAfter: supplyLeft[i].sub(amt),
        demandAfter: demandLeft[j].sub(amt),
        note: usedRow
          ? supplyLeft[i].eq(demandLeft[j])
            ? 'Мөр (' + input.supplyNames[i] + ') ба багана (' + input.demandNames[j] + ') хоёул дуусав'
            : 'Мөр (' + input.supplyNames[i] + ') нийлүүлэлт дуусав'
          : 'Багана (' + input.demandNames[j] + ') шаардлага дуусав',
      });

      supplyLeft[i] = supplyLeft[i].sub(amt);
      demandLeft[j] = demandLeft[j].sub(amt);

      if (supplyLeft[i].isZero() && demandLeft[j].isZero()) {
        i++; j++;
      } else if (supplyLeft[i].isZero()) {
        i++;
      } else {
        j++;
      }
    }

    const totalCost = computeCost(alloc, input.cost);
    return {
      method: 'NW',
      methodName: 'Баруун дээд өнцгийн арга (Northwest Corner)',
      input: input,
      alloc: alloc,
      steps: steps,
      totalCost: totalCost,
    };
  }

  // -----------------------------
  // LCM (Least Cost Method)
  // -----------------------------
  function lcmMethod(rawInput) {
    const input = balance(rawInput);
    const m = input.supply.length;
    const n = input.demand.length;
    const alloc = Array.from({length: m}, () => new Array(n).fill(F(0)));
    const supplyLeft = input.supply.map(v => v);
    const demandLeft = input.demand.map(v => v);
    const used = Array.from({length: m}, () => new Array(n).fill(false));
    const steps = [];

    while (true) {
      // Find cell with minimum cost where supply and demand both > 0
      let minCost = null, minI = -1, minJ = -1;
      for (let i = 0; i < m; i++) {
        if (supplyLeft[i].isZero()) continue;
        for (let j = 0; j < n; j++) {
          if (demandLeft[j].isZero() || used[i][j]) continue;
          if (minCost === null || input.cost[i][j].lt(minCost)) {
            minCost = input.cost[i][j];
            minI = i; minJ = j;
          }
        }
      }
      if (minI === -1) break;

      const amt = supplyLeft[minI].lt(demandLeft[minJ]) ? supplyLeft[minI] : demandLeft[minJ];
      alloc[minI][minJ] = amt;
      used[minI][minJ] = true;

      steps.push({
        row: minI, col: minJ,
        amount: amt,
        cost: minCost,
        supplyAfter: supplyLeft[minI].sub(amt),
        demandAfter: demandLeft[minJ].sub(amt),
        note: 'Хамгийн бага зардалтай нүд: cᵢⱼ=' + minCost.toString() +
              ' (' + input.supplyNames[minI] + '→' + input.demandNames[minJ] + ')',
      });

      supplyLeft[minI] = supplyLeft[minI].sub(amt);
      demandLeft[minJ] = demandLeft[minJ].sub(amt);
    }

    const totalCost = computeCost(alloc, input.cost);
    return {
      method: 'LCM',
      methodName: 'Хамгийн бага зардал (Least Cost)',
      input: input,
      alloc: alloc,
      steps: steps,
      totalCost: totalCost,
    };
  }

  // -----------------------------
  // VAM (Vogel's Approximation Method)
  // -----------------------------
  function vamMethod(rawInput) {
    const input = balance(rawInput);
    const m = input.supply.length;
    const n = input.demand.length;
    const alloc = Array.from({length: m}, () => new Array(n).fill(F(0)));
    const supplyLeft = input.supply.map(v => v);
    const demandLeft = input.demand.map(v => v);
    const rowDone = new Array(m).fill(false);
    const colDone = new Array(n).fill(false);
    const steps = [];

    while (true) {
      // Compute penalties for each remaining row and column
      // (difference between two smallest costs in that row/column)
      const rowPenalty = new Array(m).fill(null);
      const colPenalty = new Array(n).fill(null);

      for (let i = 0; i < m; i++) {
        if (rowDone[i]) continue;
        const costs = [];
        for (let j = 0; j < n; j++) {
          if (!colDone[j]) costs.push(input.cost[i][j]);
        }
        if (costs.length >= 2) {
          costs.sort((a, b) => a.cmp(b));
          rowPenalty[i] = costs[1].sub(costs[0]);
        } else if (costs.length === 1) {
          rowPenalty[i] = costs[0];
        }
      }
      for (let j = 0; j < n; j++) {
        if (colDone[j]) continue;
        const costs = [];
        for (let i = 0; i < m; i++) {
          if (!rowDone[i]) costs.push(input.cost[i][j]);
        }
        if (costs.length >= 2) {
          costs.sort((a, b) => a.cmp(b));
          colPenalty[j] = costs[1].sub(costs[0]);
        } else if (costs.length === 1) {
          colPenalty[j] = costs[0];
        }
      }

      // Find max penalty (any row or column)
      let maxPen = null, isRow = true, idx = -1;
      for (let i = 0; i < m; i++) {
        if (rowPenalty[i] && (maxPen === null || rowPenalty[i].gt(maxPen))) {
          maxPen = rowPenalty[i]; isRow = true; idx = i;
        }
      }
      for (let j = 0; j < n; j++) {
        if (colPenalty[j] && (maxPen === null || colPenalty[j].gt(maxPen))) {
          maxPen = colPenalty[j]; isRow = false; idx = j;
        }
      }
      if (idx === -1) break;

      // Within that row/column, find min-cost cell among non-eliminated
      let minI = -1, minJ = -1, minCost = null;
      if (isRow) {
        const i = idx;
        for (let j = 0; j < n; j++) {
          if (colDone[j]) continue;
          if (minCost === null || input.cost[i][j].lt(minCost)) {
            minCost = input.cost[i][j]; minI = i; minJ = j;
          }
        }
      } else {
        const j = idx;
        for (let i = 0; i < m; i++) {
          if (rowDone[i]) continue;
          if (minCost === null || input.cost[i][j].lt(minCost)) {
            minCost = input.cost[i][j]; minI = i; minJ = j;
          }
        }
      }

      // Allocate
      const amt = supplyLeft[minI].lt(demandLeft[minJ]) ? supplyLeft[minI] : demandLeft[minJ];
      alloc[minI][minJ] = (alloc[minI][minJ] || F(0)).add(amt);

      const penaltiesSnapshot = {
        row: rowPenalty.slice(),
        col: colPenalty.slice(),
        maxPen: maxPen,
        chose: isRow ? ('Мөр ' + input.supplyNames[idx]) : ('Багана ' + input.demandNames[idx]),
      };

      steps.push({
        row: minI, col: minJ,
        amount: amt,
        cost: minCost,
        supplyAfter: supplyLeft[minI].sub(amt),
        demandAfter: demandLeft[minJ].sub(amt),
        penalties: penaltiesSnapshot,
        note: 'Хамгийн их зөрүү: ' + maxPen.toString() + ' (' + penaltiesSnapshot.chose + '), ' +
              'тэндээс хамгийн бага cᵢⱼ=' + minCost.toString() +
              ' (' + input.supplyNames[minI] + '→' + input.demandNames[minJ] + ')',
      });

      supplyLeft[minI] = supplyLeft[minI].sub(amt);
      demandLeft[minJ] = demandLeft[minJ].sub(amt);

      if (supplyLeft[minI].isZero()) rowDone[minI] = true;
      if (demandLeft[minJ].isZero()) colDone[minJ] = true;
    }

    const totalCost = computeCost(alloc, input.cost);
    return {
      method: 'VAM',
      methodName: 'Vogel-ийн зөрүүний арга',
      input: input,
      alloc: alloc,
      steps: steps,
      totalCost: totalCost,
    };
  }

  // -----------------------------
  // MODI (Modified Distribution / U-V method)
  // -----------------------------
  // Given an initial basic feasible solution (from NW/LCM/VAM):
  // 1. Compute u_i, v_j such that u_i + v_j = c_ij for all basic cells.
  //    Set u_0 = 0, then propagate.
  // 2. Compute reduced cost d_ij = c_ij - (u_i + v_j) for non-basic cells.
  // 3. If all d_ij >= 0, optimal. Otherwise, pick most negative d_ij to enter.
  // 4. Find closed loop (cycle) of basic cells starting from entering cell.
  // 5. Compute theta = min allocation on minus cells; transfer along loop.
  // 6. Update basis; repeat.
  // -----------------------------
  function modiOptimize(initialResult) {
    const input = initialResult.input;
    const m = input.supply.length;
    const n = input.demand.length;
    let alloc = initialResult.alloc.map(r => r.slice());
    const cost = input.cost;
    const iterations = [];
    const maxIter = 50;

    // Track basis: cells with allocation > 0 (or marked epsilon for degenerate cases)
    // For non-degenerate problems, basis size = m + n - 1
    // We mark "basic" with a small set; treat zero allocations as non-basic
    // unless we explicitly mark them as epsilon (for degenerate cases).
    let basic = Array.from({length: m}, () => new Array(n).fill(false));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (!alloc[i][j].isZero()) basic[i][j] = true;
      }
    }
    // Handle degeneracy: we need exactly m+n-1 basic cells.
    // If fewer, add epsilon-basic cells at zero allocations strategically.
    ensureNonDegenerate(alloc, basic, m, n);

    for (let iter = 0; iter < maxIter; iter++) {
      // Compute u, v
      const uv = computeUV(basic, cost, m, n);
      if (!uv) {
        // Degenerate detection failure — try harder
        ensureNonDegenerate(alloc, basic, m, n);
        const uv2 = computeUV(basic, cost, m, n);
        if (!uv2) {
          iterations.push({ kind: 'fail', note: 'U,V олох боломжгүй' });
          break;
        }
      }
      const u = uv ? uv.u : null;
      const v = uv ? uv.v : null;

      // Compute reduced costs for non-basic cells
      const reduced = Array.from({length: m}, () => new Array(n).fill(null));
      let mostNegative = null;
      let enterI = -1, enterJ = -1;
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          if (basic[i][j]) continue;
          const d = cost[i][j].sub(u[i].add(v[j]));
          reduced[i][j] = d;
          if (d.isNeg() && (mostNegative === null || d.lt(mostNegative))) {
            mostNegative = d; enterI = i; enterJ = j;
          }
        }
      }

      // Snapshot before any change
      const iterSnap = {
        kind: 'iter',
        iter: iter + 1,
        alloc: alloc.map(r => r.slice()),
        basic: basic.map(r => r.slice()),
        u: u.slice(),
        v: v.slice(),
        reduced: reduced.map(r => r.slice()),
      };

      if (enterI === -1) {
        iterSnap.optimal = true;
        iterations.push(iterSnap);
        break;
      }

      // Find closed loop starting at (enterI, enterJ)
      const loop = findLoop(basic, enterI, enterJ, m, n);
      if (!loop) {
        iterSnap.fail = 'Хаалттай гогцоо олох боломжгүй';
        iterations.push(iterSnap);
        break;
      }

      // Loop alternates: + - + - ... starting from entering cell with +
      // Find theta = min allocation on minus cells
      let theta = null;
      let leaveIdx = -1;
      for (let k = 1; k < loop.length; k += 2) {
        const [li, lj] = loop[k];
        if (theta === null || alloc[li][lj].lt(theta)) {
          theta = alloc[li][lj];
          leaveIdx = k;
        }
      }

      iterSnap.enterCell = [enterI, enterJ];
      iterSnap.enterReduced = mostNegative;
      iterSnap.loop = loop.slice();
      iterSnap.theta = theta;
      iterSnap.leaveCell = loop[leaveIdx];
      iterations.push(iterSnap);

      // Apply theta transfer
      for (let k = 0; k < loop.length; k++) {
        const [li, lj] = loop[k];
        if (k % 2 === 0) alloc[li][lj] = alloc[li][lj].add(theta);
        else alloc[li][lj] = alloc[li][lj].sub(theta);
      }
      // Update basis: enter, leave
      basic[enterI][enterJ] = true;
      const [leaveI, leaveJ] = loop[leaveIdx];
      basic[leaveI][leaveJ] = false;
    }

    return {
      method: 'MODI',
      methodName: 'MODI (U-V) арга',
      initial: initialResult,
      input: input,
      alloc: alloc,
      iterations: iterations,
      totalCost: computeCost(alloc, cost),
    };
  }

  // -----------------------------
  // Helper: compute total cost
  // -----------------------------
  function computeCost(alloc, cost) {
    let total = F(0);
    for (let i = 0; i < alloc.length; i++) {
      for (let j = 0; j < alloc[0].length; j++) {
        if (!alloc[i][j].isZero()) total = total.add(alloc[i][j].mul(cost[i][j]));
      }
    }
    return total;
  }

  // -----------------------------
  // Compute u, v from basic cells
  // -----------------------------
  function computeUV(basic, cost, m, n) {
    const u = new Array(m).fill(null);
    const v = new Array(n).fill(null);
    u[0] = F(0); // anchor
    let changed = true;
    let iter = 0;
    while (changed && iter < m * n + 5) {
      changed = false;
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          if (!basic[i][j]) continue;
          if (u[i] !== null && v[j] === null) {
            v[j] = cost[i][j].sub(u[i]);
            changed = true;
          } else if (v[j] !== null && u[i] === null) {
            u[i] = cost[i][j].sub(v[j]);
            changed = true;
          }
        }
      }
      iter++;
    }
    // Ensure all u_i and v_j are determined
    for (let i = 0; i < m; i++) if (u[i] === null) return null;
    for (let j = 0; j < n; j++) if (v[j] === null) return null;
    return { u: u, v: v };
  }

  // -----------------------------
  // Ensure exactly m+n-1 basic cells (handle degeneracy)
  // If fewer, add zero-allocation basic cells in positions that don't form
  // cycles with existing basis.
  // -----------------------------
  function ensureNonDegenerate(alloc, basic, m, n) {
    let count = 0;
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        if (basic[i][j]) count++;
    while (count < m + n - 1) {
      // Pick any cell where basic=false and adding it doesn't create a cycle
      let added = false;
      for (let i = 0; i < m && !added; i++) {
        for (let j = 0; j < n && !added; j++) {
          if (basic[i][j]) continue;
          // Try adding
          basic[i][j] = true;
          // Check if u,v can be computed (i.e., basis is connected)
          const uv = computeUV(basic, Array.from({length:m}, ()=>new Array(n).fill(F(0))), m, n);
          if (uv) {
            // Adding this cell keeps basis acyclic — accept (alloc remains 0 = epsilon)
            count++;
            added = true;
          } else {
            basic[i][j] = false;
          }
        }
      }
      if (!added) break; // cannot add more
    }
  }

  // -----------------------------
  // Find closed loop (rectangle) starting at (sr, sc) using basic cells
  // Returns an ordered list of [i,j] pairs forming the loop, or null
  // -----------------------------
  function findLoop(basic, sr, sc, m, n) {
    // We do depth-first search alternating between rows and columns
    // Start at (sr, sc), try to return to it via basic cells with alternating direction
    const target = sr + ',' + sc;
    function dfs(path, mode) {
      // mode: 'row' = next move along same row; 'col' = same column
      const [ci, cj] = path[path.length - 1];
      if (mode === 'row') {
        // Try every column k != cj where basic[ci][k] is true (or k==sc to close)
        for (let k = 0; k < n; k++) {
          if (k === cj) continue;
          if (ci === sr && k === sc && path.length >= 4) {
            // Closed!
            return path.concat([[ci, k]]).slice(0, -1); // exclude duplicate
          }
          if (basic[ci][k]) {
            // Avoid revisiting
            if (path.some(([pi, pj]) => pi === ci && pj === k)) continue;
            const r = dfs(path.concat([[ci, k]]), 'col');
            if (r) return r;
          }
        }
      } else {
        // Try every row k != ci where basic[k][cj] is true (or back to start)
        for (let k = 0; k < m; k++) {
          if (k === ci) continue;
          if (k === sr && cj === sc && path.length >= 4) {
            return path.concat([[k, cj]]).slice(0, -1);
          }
          if (basic[k][cj]) {
            if (path.some(([pi, pj]) => pi === k && pj === cj)) continue;
            const r = dfs(path.concat([[k, cj]]), 'row');
            if (r) return r;
          }
        }
      }
      return null;
    }
    // Try starting in row direction first
    let r = dfs([[sr, sc]], 'row');
    if (r) return r;
    r = dfs([[sr, sc]], 'col');
    return r;
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.LP = window.LP || {};
  window.LP.transport = {
    nw: nwMethod,
    lcm: lcmMethod,
    vam: vamMethod,
    modi: modiOptimize,
    balance: balance,
  };
})();
