// =============================================================================
// INTEGER PROGRAMMING UI — render Branch & Bound tree + steps
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const subscriptDigits = window.LP.mathSubscript;
  const Frac = window.LP.Frac;
  const F = window.LP.F;

  // -----------------------------
  // Render full solution
  // -----------------------------
  function renderIntegerSolution(result, lp, container) {
    container.innerHTML = '';
    const wrap = el('div');

    wrap.appendChild(el('h2', { class: 'section-title' },
      el('span', { class: 'step-num' }, 'Бодолт'),
      'Branch & Bound (Салаалуулан хязгаарлах)'
    ));

    if (result.status === 'infeasible') {
      wrap.appendChild(el('div', {
        class: 'panel danger',
        html: '<div class="panel-title">✕ Шийдгүй</div>' +
              '<p>Бүхэл тоон шийд олдсонгүй. ' +
              (result.note || 'Хязгаарлалтуудаа шалгана уу.') + '</p>'
      }));
      container.appendChild(wrap);
      return;
    }

    if (result.status === 'unbounded') {
      wrap.appendChild(el('div', {
        class: 'panel warn',
        html: '<div class="panel-title">∞ Хязгааргүй шийд</div>' +
              '<p>Анхдагч LP-ийн шийд хязгааргүй. Хязгаарлалт нэмэх шаардлагатай.</p>'
      }));
      container.appendChild(wrap);
      return;
    }

    // === Step 1: LP relaxation explained ===
    const relaxCard = el('div', { class: 'card' });
    relaxCard.appendChild(el('h3', { class: 'subsection' }, '◇ Алхам 1 — LP-ийн сулруулсан хувилбар'));
    relaxCard.appendChild(el('p', { html:
      'Эхний алхамд бид <b>бүхэл тоон хязгаарлалтыг түр зуур орхино</b> ' +
      '(зөвхөн x ≥ 0, бусад нөхцөлтэй) — энэ нь "LP relaxation" буюу сулруулсан хувилбар. ' +
      'Симплекс аргаар үүнийг бодохдоо ихэвчлэн <b>бутархай тоонуудтай шийд</b> гарна. ' +
      'Дараа нь бид тэрхүү бутархай хувьсагч тус бүрд "доош/дээш дугуйрсан" 2 салаа үүсгэж бодлого хуваана.'
    }));
    wrap.appendChild(relaxCard);

    // === Step 2: tree visualization ===
    const treeCard = el('div', { class: 'card' });
    treeCard.appendChild(el('h3', { class: 'subsection' }, '◈ Алхам 2 — Branch & Bound мод'));
    treeCard.appendChild(el('p', {
      html: 'Зангилаа бүр нь нэг ШП-ийн дэд бодлого. ' +
            '<span style="color:var(--accent)"><b>★</b></span> — хамгийн сайн бүхэл тоо, ' +
            '<span style="color:var(--ink-muted)">✗</span> — хязгаарласан/хаасан салаа.'
    }));
    treeCard.appendChild(renderTree(result, lp));
    wrap.appendChild(treeCard);

    // === Step 3: detailed nodes ===
    const detCard = el('div', { class: 'card' });
    detCard.appendChild(el('h3', { class: 'subsection' }, '◇ Алхам 3 — Зангилаа тус бүрийн дэлгэрэнгүй'));
    result.tree.forEach(node => {
      detCard.appendChild(renderNode(node, lp, result));
    });
    wrap.appendChild(detCard);

    // === Final summary ===
    const sumGrid = el('div', { class: 'solution-grid' });
    const zCard = el('div', { class: 'solution-card' });
    zCard.appendChild(el('div', { class: 'solution-label' },
      lp.objective === 'max' ? 'Хамгийн их бүхэл Z' : 'Хамгийн бага бүхэл Z'));
    zCard.appendChild(el('div', { class: 'solution-value gold' }, result.bestZ.toString()));
    sumGrid.appendChild(zCard);
    for (let j = 0; j < result.bestX.length; j++) {
      const c = el('div', { class: 'solution-card' });
      c.appendChild(el('div', { class: 'solution-label' }, subscriptDigits('x_' + (j + 1))));
      c.appendChild(el('div', { class: 'solution-value accent' }, result.bestX[j].toString()));
      sumGrid.appendChild(c);
    }
    // Compare to LP relaxation
    if (result.tree[0] && result.tree[0].z) {
      const lpZ = result.tree[0].z;
      if (!lpZ.eq(result.bestZ)) {
        const diffCard = el('div', { class: 'solution-card' });
        diffCard.appendChild(el('div', { class: 'solution-label' }, 'LP сулруулалт Z'));
        diffCard.appendChild(el('div', {
          class: 'solution-value',
          style: { color: 'var(--ink-muted)' }
        }, lpZ.toString()));
        sumGrid.appendChild(diffCard);
      }
    }
    wrap.appendChild(sumGrid);

    // Conclusion
    const conc = el('div', { class: 'panel success' });
    conc.appendChild(el('div', { class: 'panel-title' }, '✓ Эдийн засгийн дүгнэлт'));
    const xParts = result.bestX.map((v, j) =>
      subscriptDigits('x_' + (j + 1)) + ' = ' + v.toString()).join(', ');
    let lpZNote = '';
    if (result.tree[0] && result.tree[0].z && !result.tree[0].z.eq(result.bestZ)) {
      lpZNote = ' Анхдагч LP сулруулалтын шийдэл (Z = ' + result.tree[0].z.toString() +
                ') нь бутархай хувьсагчтай байсан учир Branch & Bound-аар <b>' +
                (result.tree.length - 1) + '</b> дэд бодлого бодон бүхэл тооны эцсийн ' +
                'оптимумд хүрсэн.';
    }
    conc.appendChild(el('p', {
      html: 'Бүхэл тоон оптимум шийдэл: <b>' + xParts + '</b>, Z = <b>' +
            result.bestZ.toString() + '</b>.' + lpZNote
    }));
    wrap.appendChild(conc);

    // Action bar
    const actions = el('div', { class: 'action-bar' });
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => {
        if (window.LP.openSaveDialog) {
          window.LP.openSaveDialog(lp, 'integer');
        }
      }
    }, '☆ Хадгалах'));
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.exportPDF(container, 'integer-solution.pdf')
    }, '⬇ PDF татах'));
    wrap.appendChild(actions);

    container.appendChild(wrap);
  }

  // -----------------------------
  // Render the B&B tree as an INTERACTIVE SVG
  //  - nodes are draggable (anywhere on the canvas)
  //  - edges follow their nodes (stretch/shrink automatically)
  //  - edge labels are draggable along their parent edge
  // -----------------------------
  function renderTree(result, lp) {
    // Build parent-child structure
    const children = {};
    result.tree.forEach(n => { children[n.id] = []; });
    result.tree.forEach(n => {
      if (n.parentId !== null) children[n.parentId].push(n);
    });

    function countLeaves(node) {
      const c = children[node.id];
      if (!c || c.length === 0) return 1;
      return c.reduce((sum, ch) => sum + countLeaves(ch), 0);
    }
    const positions = {};   // nodeId → {x, y}
    const root = result.tree[0];
    const totalLeaves = countLeaves(root);
    const NODE_W = 140, NODE_H = 60, V_GAP = 80, H_PAD = 40;
    const W = Math.max(700, totalLeaves * NODE_W + 2 * H_PAD);

    function layout(node, leftLeafIdx, depth) {
      const c = children[node.id];
      if (!c || c.length === 0) {
        const x = H_PAD + leftLeafIdx * NODE_W + NODE_W / 2;
        const y = H_PAD + depth * V_GAP;
        positions[node.id] = { x: x, y: y };
        return 1;
      }
      let leaves = 0;
      const childCenters = [];
      for (const ch of c) {
        const k = layout(ch, leftLeafIdx + leaves, depth + 1);
        childCenters.push(positions[ch.id].x);
        leaves += k;
      }
      const minX = childCenters[0];
      const maxX = childCenters[childCenters.length - 1];
      const x = (minX + maxX) / 2;
      const y = H_PAD + depth * V_GAP;
      positions[node.id] = { x: x, y: y };
      return leaves;
    }
    layout(root, 0, 0);

    const maxDepth = Math.max(...result.tree.map(n => n.depth));
    const H = H_PAD * 2 + (maxDepth + 1) * V_GAP + NODE_H;

    const svg = window.LP.svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      width: '100%',
    });
    svg.style.maxWidth = W + 'px';
    svg.style.background = '#FAFAF7';
    svg.style.userSelect = 'none';

    // -----------------------------
    // Each edge will hold its own label-t (default 0.5).
    // We store edges by child-node-id since each non-root node has exactly one parent.
    // -----------------------------
    const edgeLabelT = {};       // childId → t in [0.05, 0.95]
    result.tree.forEach(n => {
      if (n.parentId !== null) edgeLabelT[n.id] = 0.5;
    });

    // -----------------------------
    // Edge & label DOM references — for re-positioning when nodes move
    // -----------------------------
    const edgeRefs = {};         // childId → { line, labelGroup }
    const nodeRefs = {};         // nodeId → SVG <g>

    // Helper: convert a screen pointer event to SVG coords
    function svgPointFromEvent(evt) {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const inv = ctm.inverse();
      const r = pt.matrixTransform(inv);
      return { x: r.x, y: r.y };
    }

    // -----------------------------
    // Re-position one edge & its label.
    // Called whenever either parent or child node moves.
    // -----------------------------
    function updateEdge(childId) {
      const ref = edgeRefs[childId];
      if (!ref) return;
      const child = result.tree.find(n => n.id === childId);
      const p1 = positions[child.parentId];
      const p2 = positions[childId];
      const x1 = p1.x;
      const y1 = p1.y + NODE_H / 2;
      const x2 = p2.x;
      const y2 = p2.y - NODE_H / 2;
      ref.line.setAttribute('x1', x1);
      ref.line.setAttribute('y1', y1);
      ref.line.setAttribute('x2', x2);
      ref.line.setAttribute('y2', y2);
      // Label position
      const t = edgeLabelT[childId] != null ? edgeLabelT[childId] : 0.5;
      const lx = x1 + (x2 - x1) * t;
      const ly = y1 + (y2 - y1) * t;
      ref.labelGroup.setAttribute('transform', 'translate(' + lx + ',' + ly + ')');
      // Cache geometry for later projection during label drag
      ref.geom = { x1: x1, y1: y1, dx: x2 - x1, dy: y2 - y1, len2: (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) };
    }

    // -----------------------------
    // Re-position one node and update edges that touch it.
    // -----------------------------
    function updateNode(nodeId) {
      const p = positions[nodeId];
      const g = nodeRefs[nodeId];
      if (!g) return;
      g.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
      // Update parent-edge if any
      const node = result.tree.find(n => n.id === nodeId);
      if (node && node.parentId !== null) updateEdge(nodeId);
      // Update child-edges (where this node is parent)
      (children[nodeId] || []).forEach(ch => updateEdge(ch.id));
    }

    // -----------------------------
    // Build the popup content for an edge.
    // The "child" node IS the result of applying the new constraint.
    // -----------------------------
    const mathSubsHtml = window.LP.mathSubscriptHtml || window.LP.mathSubscript;
    function buildBranchPopupHtml(child) {
      const childLp = child.lp;
      const branch = child.branchInfo;
      if (!childLp || !branch) return '<p>Мэдээлэл алга</p>';

      const objSym = childLp.objective === 'max' ? 'max' : 'min';

      // Objective expression
      let objStr = '';
      for (let j = 0; j < childLp.c.length; j++) {
        const cv = childLp.c[j];
        if (cv.isZero()) continue;
        const absV = cv.isNeg() ? cv.neg() : cv;
        const coefStr = absV.eq(window.LP.F(1)) ? '' : absV.toString();
        if (objStr.length === 0) {
          if (cv.isNeg()) objStr += '−' + coefStr;
          else objStr += coefStr;
        } else {
          objStr += cv.isNeg() ? ' − ' + coefStr : ' + ' + coefStr;
        }
        objStr += mathSubsHtml('x_' + (j + 1));
      }

      // Build all constraints
      const constraintRows = [];
      const newConstraintIdx = childLp.b.length - 1; // last one is the just-added bound
      for (let i = 0; i < childLp.b.length; i++) {
        let s = '';
        for (let j = 0; j < childLp.c.length; j++) {
          const v = childLp.A[i][j];
          if (v.isZero()) continue;
          const absV = v.isNeg() ? v.neg() : v;
          // Skip "1" coefficient (write x_j instead of 1x_j)
          const coefStr = absV.eq(window.LP.F(1)) ? '' : absV.toString();
          if (s.length === 0) {
            if (v.isNeg()) s += '−' + coefStr;
            else s += coefStr;
          } else {
            s += v.isNeg() ? ' − ' + coefStr : ' + ' + coefStr;
          }
          s += mathSubsHtml('x_' + (j + 1));
        }
        if (s.length === 0) s = '0';
        const op = childLp.ops[i] === '<=' ? '≤' : childLp.ops[i] === '>=' ? '≥' : '=';
        s += ' ' + op + ' ' + childLp.b[i].toString();
        constraintRows.push({ text: s, isNew: i === newConstraintIdx });
      }

      // Determine method recommendation:
      //  - If all constraints are ≤ → standard Simplex
      //  - If any ≥ or = constraint → Big-M
      let hasNonLE = childLp.ops.some(op => op !== '<=');
      const methodTag = hasNonLE ? 'Big-M' : 'Симплекс';
      const methodNote = hasNonLE
        ? '≥ эсвэл = хязгаарлалттай тул artificial хувьсагч + Big-M шаардлагатай.'
        : 'Бүх хязгаарлалт ≤ тэмдэгтэй тул стандарт Симплекс хүснэгтээр шууд бодно.';

      // Result block
      let resultHtml = '';
      if (child.status === 'infeasible') {
        resultHtml = '<div class="branch-popup-result infeasible">✕ Шийдгүй (хязгаарлалтуудыг хангах боломжгүй)</div>';
      } else if (child.status === 'unbounded') {
        resultHtml = '<div class="branch-popup-result infeasible">∞ Хязгааргүй</div>';
      } else if (child.x && child.z) {
        const xParts = child.x.map((v, j) =>
          mathSubsHtml('x_' + (j + 1)) + ' = ' + v.toString()).join(', ');
        const isPruned = (child.action || '').indexOf('✗') === 0;
        resultHtml = '<div class="branch-popup-result' + (isPruned ? ' pruned' : '') + '">' +
                     'Z = ' + child.z.toString() + '</div>' +
                     '<div style="font-family: var(--font-mono); font-size: 11px; color: var(--ink-muted); margin-top: 2px">' +
                     xParts + '</div>';
        if (isPruned) {
          resultHtml += '<div style="font-size: 11px; color: var(--ink-muted); margin-top: 4px; font-style: italic">' +
                        '✗ хязгаарласан — хамгийн сайн бүхэл тооноос дор</div>';
        } else if (child.isInteger) {
          resultHtml += '<div style="font-size: 11px; color: var(--accent); margin-top: 4px; font-weight: 600">' +
                        (child.isIncumbent ? '★ Шинэ хамгийн сайн бүхэл шийд' : '✓ Бүхэл тоон шийд') + '</div>';
        }
      }

      // Compose HTML
      let html = '<div class="branch-popup-title">◇ Шинэ зааглалттай дэд бодлого</div>';
      html += '<div class="branch-popup-section">';
      html += '<div class="branch-popup-section-label">Зорилгын функц</div>';
      html += '<div class="branch-popup-formula">' + objSym + ' Z = ' + objStr + '</div>';
      html += '</div>';

      html += '<div class="branch-popup-section">';
      html += '<div class="branch-popup-section-label">Хязгаарлалтын систем</div>';
      constraintRows.forEach(c => {
        html += '<div class="branch-popup-formula' +
                (c.isNew ? ' new-constraint' : '') + '">' +
                (c.isNew ? '⊕ ' : '') + c.text + '</div>';
      });
      html += '</div>';

      html += '<div class="branch-popup-section">';
      html += '<div class="branch-popup-section-label">Бодолтын арга</div>';
      html += '<div><span class="branch-popup-method-tag">' + methodTag + '</span> ';
      html += '<span style="font-size: 12px; color: var(--ink-muted)">' + methodNote + '</span></div>';
      html += '</div>';

      if (resultHtml) {
        html += '<div class="branch-popup-section">';
        html += '<div class="branch-popup-section-label">Үр дүн</div>';
        html += resultHtml;
        html += '</div>';
      }

      return html;
    }

    // -----------------------------
    // Single popup element shared across all edges
    // -----------------------------
    let popupEl = null;
    function getPopup() {
      if (popupEl) return popupEl;
      popupEl = document.createElement('div');
      popupEl.className = 'branch-popup';
      document.body.appendChild(popupEl);
      // Auto-cleanup: when SVG is removed from DOM, hide popup
      // (we rely on caller to manage lifecycle through normal navigation)
      return popupEl;
    }
    function showPopup(child, evt) {
      const p = getPopup();
      p.innerHTML = buildBranchPopupHtml(child);
      const margin = 12;
      const x = evt.clientX + margin;
      const y = evt.clientY + margin;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.classList.add('show');
      setTimeout(() => {
        const r = p.getBoundingClientRect();
        let dx = 0, dy = 0;
        if (r.right > window.innerWidth - 10) dx = window.innerWidth - r.right - 10;
        if (r.bottom > window.innerHeight - 10) dy = -r.height - margin * 2;
        if (dx !== 0 || dy !== 0) {
          p.style.left = (x + dx) + 'px';
          p.style.top = (y + dy) + 'px';
        }
      }, 0);
    }
    function hidePopup() {
      if (popupEl) popupEl.classList.remove('show');
    }
    function movePopup(evt) {
      if (!popupEl || !popupEl.classList.contains('show')) return;
      const margin = 12;
      const r = popupEl.getBoundingClientRect();
      let x = evt.clientX + margin;
      let y = evt.clientY + margin;
      if (x + r.width > window.innerWidth - 10) x = evt.clientX - r.width - margin;
      if (y + r.height > window.innerHeight - 10) y = evt.clientY - r.height - margin;
      popupEl.style.left = x + 'px';
      popupEl.style.top = y + 'px';
    }

    // Hide popup if user scrolls — prevents stale popup at wrong position
    window.addEventListener('scroll', hidePopup, { passive: true, once: false });

    // -----------------------------
    // STAGE 1: Draw all edges (background)
    // -----------------------------
    result.tree.forEach(n => {
      if (n.parentId === null) return;
      const line = window.LP.svgEl('line', {
        stroke: '#C9C5B5', 'stroke-width': '1.5',
      });
      svg.appendChild(line);

      // Branch label group (drag-able along the edge)
      const labelGroup = window.LP.svgEl('g', {
        'data-edge-child': n.id,
        style: 'cursor: grab',
      });
      if (n.branchInfo) {
        const text = subscriptDigits(n.branchInfo.varName) + ' ' +
                     (n.branchInfo.op === '<=' ? '≤' : '≥') + ' ' +
                     n.branchInfo.rhs.toString();
        const w = Math.max(50, text.length * 7);
        labelGroup.appendChild(window.LP.svgEl('rect', {
          x: -w / 2, y: -9, width: w, height: 18, rx: '3',
          fill: '#FFFFFF', stroke: '#C9C5B5', 'stroke-width': '0.5',
        }));
        labelGroup.appendChild(window.LP.svgEl('text', {
          x: 0, y: 4,
          'text-anchor': 'middle',
          fill: '#4A4A4A',
          'font-family': 'JetBrains Mono, monospace', 'font-size': '11',
        }, text));
      }
      svg.appendChild(labelGroup);
      edgeRefs[n.id] = { line: line, labelGroup: labelGroup };

      // Drag-along-edge for the label
      let labelDragging = false;
      labelGroup.addEventListener('pointerdown', e => {
        labelDragging = true;
        labelGroup.style.cursor = 'grabbing';
        try { labelGroup.setPointerCapture(e.pointerId); } catch (err) {}
        e.stopPropagation();   // prevent triggering node drag
        e.preventDefault();
      });
      labelGroup.addEventListener('pointermove', e => {
        if (labelDragging) {
          const sp = svgPointFromEvent(e);
          const g = edgeRefs[n.id].geom;
          if (!g || g.len2 === 0) return;
          let t = ((sp.x - g.x1) * g.dx + (sp.y - g.y1) * g.dy) / g.len2;
          if (t < 0.05) t = 0.05;
          if (t > 0.95) t = 0.95;
          edgeLabelT[n.id] = t;
          updateEdge(n.id);
        } else {
          // Update popup position as cursor moves over label (without dragging)
          movePopup(e);
        }
      });
      labelGroup.addEventListener('pointerup', e => {
        labelDragging = false;
        labelGroup.style.cursor = 'grab';
        try { labelGroup.releasePointerCapture(e.pointerId); } catch (err) {}
      });
      labelGroup.addEventListener('pointercancel', () => {
        labelDragging = false;
        labelGroup.style.cursor = 'grab';
      });

      // Hover popup
      labelGroup.addEventListener('mouseenter', e => {
        if (!labelDragging) showPopup(n, e);
      });
      labelGroup.addEventListener('mouseleave', () => {
        hidePopup();
      });
    });

    // -----------------------------
    // STAGE 2: Draw all nodes (foreground, drag-able anywhere)
    // -----------------------------
    result.tree.forEach(n => {
      const isInc = n.isIncumbent;
      const isPruned = (n.status === 'infeasible' ||
        n.action.startsWith('✗') || n.action.startsWith('∞ Хязгааргүй'));

      let fill = '#FFFFFF', stroke = '#C9C5B5', accentColor = '#1A1A1A';
      if (isInc) { fill = '#FAF3DC'; stroke = '#C8A951'; accentColor = '#8a7320'; }
      else if (isPruned) { fill = '#F4F3EE'; stroke = '#C9C5B5'; accentColor = '#A8A8A8'; }
      else if (n.isInteger) { fill = '#E8F0E1'; stroke = '#2C5F2D'; accentColor = '#2C5F2D'; }

      const g = window.LP.svgEl('g', {
        'data-node': n.id,
        style: 'cursor: grab',
      });

      g.appendChild(window.LP.svgEl('rect', {
        x: -NODE_W / 2, y: -NODE_H / 2,
        width: NODE_W, height: NODE_H,
        rx: '6',
        fill: fill, stroke: stroke, 'stroke-width': isInc ? '2.5' : '1.5',
      }));
      const tag = n.parentId === null ? 'LP relax' : ('Зан #' + n.id);
      g.appendChild(window.LP.svgEl('text', {
        x: 0, y: -16,
        'text-anchor': 'middle',
        fill: accentColor,
        'font-family': 'Geist, sans-serif', 'font-size': '10', 'font-weight': '600',
      }, tag));
      let zText = '';
      if (n.status === 'infeasible') zText = '✕ Шийдгүй';
      else if (n.status === 'unbounded') zText = '∞';
      else if (n.z) zText = 'Z = ' + n.z.toString();
      g.appendChild(window.LP.svgEl('text', {
        x: 0, y: 1,
        'text-anchor': 'middle',
        fill: accentColor,
        'font-family': 'JetBrains Mono, monospace', 'font-size': '12', 'font-weight': '700',
      }, zText));
      let mark = '';
      if (isInc) mark = '★';
      else if (isPruned) mark = '✗';
      else if (n.isInteger) mark = '✓';
      if (mark) {
        g.appendChild(window.LP.svgEl('text', {
          x: 0, y: 18,
          'text-anchor': 'middle',
          fill: accentColor,
          'font-family': 'Geist, sans-serif', 'font-size': '14', 'font-weight': '700',
        }, mark));
      }

      svg.appendChild(g);
      nodeRefs[n.id] = g;

      // Drag behavior
      let nodeDragging = false;
      let dragOffset = { x: 0, y: 0 };
      g.addEventListener('pointerdown', e => {
        nodeDragging = true;
        g.style.cursor = 'grabbing';
        const sp = svgPointFromEvent(e);
        dragOffset.x = sp.x - positions[n.id].x;
        dragOffset.y = sp.y - positions[n.id].y;
        try { g.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      g.addEventListener('pointermove', e => {
        if (!nodeDragging) return;
        const sp = svgPointFromEvent(e);
        positions[n.id].x = sp.x - dragOffset.x;
        positions[n.id].y = sp.y - dragOffset.y;
        updateNode(n.id);
      });
      g.addEventListener('pointerup', e => {
        nodeDragging = false;
        g.style.cursor = 'grab';
        try { g.releasePointerCapture(e.pointerId); } catch (err) {}
      });
      g.addEventListener('pointercancel', () => {
        nodeDragging = false;
        g.style.cursor = 'grab';
      });
    });

    // Position everything once at the end
    result.tree.forEach(n => updateNode(n.id));

    const wrap = el('div', { style: { overflowX: 'auto', padding: '12px 0' } });
    wrap.appendChild(el('p', {
      style: { fontSize: '12px', color: 'var(--ink-muted)', margin: '0 0 8px 0' },
      html: '💡 Зангилаа болон шошгуудыг хулганаар чирж байрлуулж болно.'
    }));
    wrap.appendChild(svg);
    return wrap;
  }

  // -----------------------------
  // Render single node detail
  // -----------------------------
  function renderNode(node, lp, result) {
    const div = el('div', { class: 'card', style: { marginBottom: '12px' } });
    const header = el('div', { class: 'step-header' });
    const isInc = node.isIncumbent;
    const isPruned = (node.status === 'infeasible' ||
      node.action.indexOf('✗') === 0 || node.action.indexOf('∞') === 0);

    let badge;
    if (node.parentId === null) badge = el('span', { class: 'step-badge' }, 'LP relax');
    else if (isInc) badge = el('span', { class: 'step-badge final' }, '★ Зан #' + node.id);
    else if (isPruned) badge = el('span', { class: 'step-badge', style: { background: 'var(--bg-subtle)', color: 'var(--ink-muted)' } }, '✗ Зан #' + node.id);
    else if (node.isInteger) badge = el('span', { class: 'step-badge', style: { background: 'var(--accent)' } }, '✓ Зан #' + node.id);
    else badge = el('span', { class: 'step-badge iter' }, 'Зан #' + node.id);
    header.appendChild(badge);

    let title;
    if (node.parentId === null) title = 'Анхны бодлого (LP сулруулалт)';
    else if (node.branchInfo) {
      title = 'Эцэг #' + node.parentId + ' + хязгаарлалт: ' +
              subscriptDigits(node.branchInfo.varName) + ' ' +
              (node.branchInfo.op === '<=' ? '≤' : '≥') + ' ' +
              node.branchInfo.rhs.toString();
    }
    header.appendChild(el('span', { class: 'step-title' }, title));
    div.appendChild(header);

    // Body
    const body = el('div', { style: { marginTop: '8px' } });

    if (node.status === 'infeasible') {
      body.appendChild(el('p', {
        html: '<b>Status:</b> Шийдгүй (хязгаарлалтуудыг хангах боломжгүй).'
      }));
    } else if (node.status === 'unbounded') {
      body.appendChild(el('p', {
        html: '<b>Status:</b> Хязгааргүй.'
      }));
    } else if (node.x) {
      const xText = node.x.map((v, j) =>
        subscriptDigits('x_' + (j + 1)) + ' = ' + v.toString()).join(', ');
      body.appendChild(el('p', {
        html: '<b>LP шийд:</b> ' + xText + ', <b>Z = ' + node.z.toString() + '</b>'
      }));
    }

    if (node.action) {
      body.appendChild(el('p', {
        style: {
          marginTop: '6px',
          fontSize: '13px',
          color: isPruned ? 'var(--ink-muted)' : (isInc ? '#8a7320' : 'var(--ink)')
        },
        html: window.LP.mathSubscript(node.action)
      }));
    }

    div.appendChild(body);
    return div;
  }

  // Expose
  window.LP = window.LP || {};
  window.LP.renderIntegerSolution = renderIntegerSolution;
})();
