// =============================================================================
// TRANSPORT NETWORK UI — bipartite graph visualization
// =============================================================================
// Renders:
//   - Supply nodes (left column) with their capacity
//   - Demand nodes (right column) with their requirement
//   - Edges between every supply-demand pair (light gray, with cost label)
//   - Allocated edges highlighted (thicker, green) with the allocation number
// =============================================================================

(function () {
  'use strict';
  const el = window.LP.el;
  const svgEl = window.LP.svgEl;
  const F = window.LP.F;

  function renderNetworkSVG(input, alloc) {
    const m = input.supply.length;
    const n = input.demand.length;
    const NODE_R = 28;
    const PAD = 80;
    const ROW_GAP = 90;
    const W = 760;
    const H = Math.max(m, n) * ROW_GAP + 2 * PAD;

    const svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      width: '100%',
    });
    svg.style.maxWidth = '820px';
    svg.style.background = '#FAFAF7';
    svg.style.userSelect = 'none';

    // -----------------------------
    // Default node positions (left = supply, right = demand)
    // Centered vertically based on the larger of m and n.
    // -----------------------------
    const supplyX0 = PAD + NODE_R + 30;
    const demandX0 = W - PAD - NODE_R - 30;
    const supplyY0 = (i) => PAD + i * ROW_GAP + (Math.max(m, n) - m) * ROW_GAP / 2 + NODE_R;
    const demandY0 = (j) => PAD + j * ROW_GAP + (Math.max(m, n) - n) * ROW_GAP / 2 + NODE_R;

    // positions: keyed by 's0','s1',... and 'd0','d1',...
    const pos = {};
    for (let i = 0; i < m; i++) pos['s' + i] = { x: supplyX0, y: supplyY0(i) };
    for (let j = 0; j < n; j++) pos['d' + j] = { x: demandX0, y: demandY0(j) };

    // -----------------------------
    // Default label-t for each edge (i,j)
    // -----------------------------
    function defaultT(i, j) {
      const total = m * n;
      const idx = i * n + j;
      if (total <= 1) return 0.5;
      return 0.22 + (0.56 * idx) / (total - 1);
    }
    const edgeT = {};   // 'i,j' → t
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++) edgeT[i + ',' + j] = defaultT(i, j);

    // -----------------------------
    // SVG point conversion
    // -----------------------------
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
    // Compute the edge endpoints (line touches the circle's perimeter, not center)
    // -----------------------------
    function edgeEndpoints(i, j) {
      const sP = pos['s' + i];
      const dP = pos['d' + j];
      const dx = dP.x - sP.x;
      const dy = dP.y - sP.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.001) {
        return { x1: sP.x, y1: sP.y, x2: dP.x, y2: dP.y };
      }
      const ux = dx / len;
      const uy = dy / len;
      return {
        x1: sP.x + ux * NODE_R,
        y1: sP.y + uy * NODE_R,
        x2: dP.x - ux * NODE_R,
        y2: dP.y - uy * NODE_R,
      };
    }

    // -----------------------------
    // Refs for later updates
    // -----------------------------
    const edgeRefs = {};   // 'i,j' → { line, labelGroup, geom }
    const nodeRefs = {};   // 's0' / 'd0' / ... → SVG <g>

    function updateEdge(i, j) {
      const ref = edgeRefs[i + ',' + j];
      if (!ref) return;
      const ep = edgeEndpoints(i, j);
      ref.line.setAttribute('x1', ep.x1);
      ref.line.setAttribute('y1', ep.y1);
      ref.line.setAttribute('x2', ep.x2);
      ref.line.setAttribute('y2', ep.y2);
      const t = edgeT[i + ',' + j];
      const lx = ep.x1 + (ep.x2 - ep.x1) * t;
      const ly = ep.y1 + (ep.y2 - ep.y1) * t;
      ref.labelGroup.setAttribute('transform', 'translate(' + lx + ',' + ly + ')');
      ref.geom = {
        x1: ep.x1, y1: ep.y1,
        dx: ep.x2 - ep.x1, dy: ep.y2 - ep.y1,
        len2: (ep.x2 - ep.x1) * (ep.x2 - ep.x1) + (ep.y2 - ep.y1) * (ep.y2 - ep.y1),
      };
    }

    function updateNode(key) {
      const p = pos[key];
      const g = nodeRefs[key];
      if (!g) return;
      g.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
      // Update all edges that touch this node
      if (key.startsWith('s')) {
        const i = parseInt(key.slice(1));
        for (let j = 0; j < n; j++) updateEdge(i, j);
      } else {
        const j = parseInt(key.slice(1));
        for (let i = 0; i < m; i++) updateEdge(i, j);
      }
    }

    // -----------------------------
    // STAGE 1: draw all edges (lines)
    // -----------------------------
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        const isAlloc = alloc && !alloc[i][j].isZero();
        const line = svgEl('line', {
          stroke: isAlloc ? '#2C5F2D' : '#D8D5C7',
          'stroke-width': isAlloc ? '3' : '1',
          'stroke-opacity': isAlloc ? '1' : '0.5',
        });
        svg.appendChild(line);
        edgeRefs[i + ',' + j] = { line: line, labelGroup: null };
      }
    }

    // -----------------------------
    // STAGE 2: draw all edge labels (drag along line)
    // -----------------------------
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        const isAlloc = alloc && !alloc[i][j].isZero();
        const cost = input.cost[i][j];
        const labelGroup = svgEl('g', {
          'data-edge': i + ',' + j,
          style: 'cursor: grab',
        });

        if (isAlloc) {
          const allocText = alloc[i][j].toString();
          const costText = '(' + cost.toString() + ')';
          const pillW = Math.max(38, allocText.length * 9 + 14);
          const pillH = 22;
          labelGroup.appendChild(svgEl('rect', {
            x: -pillW / 2, y: -pillH / 2,
            width: pillW, height: pillH, rx: '11',
            fill: '#FFFFFF',
            stroke: '#2C5F2D',
            'stroke-width': '1.5',
          }));
          labelGroup.appendChild(svgEl('text', {
            x: 0, y: 5,
            'text-anchor': 'middle',
            fill: '#2C5F2D',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '13', 'font-weight': '700',
          }, allocText));
          labelGroup.appendChild(svgEl('text', {
            x: 0, y: 22,
            'text-anchor': 'middle',
            fill: '#7A7A7A',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '10',
          }, costText));
        } else {
          const costText = cost.toString();
          const chipW = Math.max(20, costText.length * 7 + 8);
          const chipH = 16;
          labelGroup.appendChild(svgEl('rect', {
            x: -chipW / 2, y: -chipH / 2,
            width: chipW, height: chipH, rx: '3',
            fill: '#FAFAF7',
            stroke: '#C9C5B5',
            'stroke-width': '0.5',
            'fill-opacity': '0.92',
          }));
          labelGroup.appendChild(svgEl('text', {
            x: 0, y: 4,
            'text-anchor': 'middle',
            fill: '#7A7A7A',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '10',
          }, costText));
        }

        edgeRefs[i + ',' + j].labelGroup = labelGroup;
        svg.appendChild(labelGroup);

        // Drag along line
        let labelDragging = false;
        labelGroup.addEventListener('pointerdown', e => {
          labelDragging = true;
          labelGroup.style.cursor = 'grabbing';
          try { labelGroup.setPointerCapture(e.pointerId); } catch (err) {}
          e.stopPropagation();
          e.preventDefault();
        });
        labelGroup.addEventListener('pointermove', e => {
          if (!labelDragging) return;
          const sp = svgPointFromEvent(e);
          const g = edgeRefs[i + ',' + j].geom;
          if (!g || g.len2 === 0) return;
          let t = ((sp.x - g.x1) * g.dx + (sp.y - g.y1) * g.dy) / g.len2;
          if (t < 0.05) t = 0.05;
          if (t > 0.95) t = 0.95;
          edgeT[i + ',' + j] = t;
          updateEdge(i, j);
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
      }
    }

    // -----------------------------
    // STAGE 3: draw nodes (drag-able anywhere)
    // -----------------------------
    function makeNode(key, fill, stroke, text, subText, sideLabel) {
      const g = svgEl('g', {
        'data-node': key,
        style: 'cursor: grab',
      });
      g.appendChild(svgEl('circle', {
        cx: 0, cy: 0, r: NODE_R,
        fill: fill, stroke: stroke, 'stroke-width': '2',
      }));
      g.appendChild(svgEl('text', {
        x: 0, y: 2, 'text-anchor': 'middle',
        fill: stroke,
        'font-family': 'Geist, sans-serif',
        'font-size': '13', 'font-weight': '600',
      }, text));
      g.appendChild(svgEl('text', {
        x: 0, y: 14, 'text-anchor': 'middle',
        fill: stroke,
        'font-family': 'JetBrains Mono, monospace',
        'font-size': '10',
      }, subText));
      if (sideLabel) {
        g.appendChild(svgEl('text', {
          x: 0, y: -NODE_R - 12, 'text-anchor': 'middle',
          fill: '#1A1A1A',
          'font-family': 'Fraunces, serif',
          'font-size': '13', 'font-style': 'italic',
        }, sideLabel));
      }
      svg.appendChild(g);
      nodeRefs[key] = g;

      // Drag behavior
      let nodeDragging = false;
      let dragOffset = { x: 0, y: 0 };
      g.addEventListener('pointerdown', e => {
        nodeDragging = true;
        g.style.cursor = 'grabbing';
        const sp = svgPointFromEvent(e);
        dragOffset.x = sp.x - pos[key].x;
        dragOffset.y = sp.y - pos[key].y;
        try { g.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      g.addEventListener('pointermove', e => {
        if (!nodeDragging) return;
        const sp = svgPointFromEvent(e);
        pos[key].x = sp.x - dragOffset.x;
        pos[key].y = sp.y - dragOffset.y;
        updateNode(key);
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
      return g;
    }

    for (let i = 0; i < m; i++) {
      makeNode('s' + i,
        '#E5E9F2', '#3B4A7A',
        input.supplyNames[i],
        input.supply[i].toString(),
        i === 0 ? 'Нийлүүлэлт' : null);
    }
    for (let j = 0; j < n; j++) {
      makeNode('d' + j,
        '#FBE8DE', '#B5482A',
        input.demandNames[j],
        input.demand[j].toString(),
        j === 0 ? 'Эрэлт' : null);
    }

    // -----------------------------
    // Initial render: position everything once
    // -----------------------------
    for (const key of Object.keys(pos)) updateNode(key);

    return svg;
  }
  function renderTransportNetworkSolution(result, container) {
    container.innerHTML = '';
    const wrap = el('div');

    wrap.appendChild(el('h2', { class: 'section-title' },
      el('span', { class: 'step-num' }, 'Бодолт'),
      result.methodName
    ));

    if (result.input.dummyAdded) {
      const da = result.input.dummyAdded;
      wrap.appendChild(el('div', {
        class: 'panel warn',
        html: '<div class="panel-title">⚠ Тэнцвэргүй бодлого</div>' +
              '<p>' + (da.side === 'supply' ? 'Хуурамч нийлүүлэгч' : 'Хуурамч хэрэглэгч') +
              ' ' + da.amount.toString() + ' хэмжээтэй автоматаар нэмэгдсэн (зардал=0).</p>'
      }));
    }

    // Show network with empty allocation first (just the cost-graph)
    const before = el('div', { class: 'card' });
    before.appendChild(el('h3', { class: 'subsection' }, '◇ Анхны сүлжээ'));
    before.appendChild(el('p', { html:
      'Нийлүүлэгчид (зүүн талд) ба хэрэглэгчид (баруун талд). ' +
      'Холбоос (сум) бүрийн дунд байх жижиг тоо нь <b>нэг нэгж тээврийн зардал</b>.<br>' +
      '<span style="color:var(--ink-muted); font-size:13px">' +
      '💡 Зөвлөгөө: <b>зангилаа болон шошгуудыг гараар хөдөлгөж болно</b>. ' +
      'Зангилаа гулсахад холбоосууд автоматаар сунаж агшина. ' +
      'Шошгууд өөрийн шулууныхаа дагуу гулсана.' +
      '</span>'
    }));
    const beforeSvg = el('div', { style: { display: 'flex', justifyContent: 'center' } });
    beforeSvg.appendChild(renderNetworkSVG(result.input, null));
    before.appendChild(beforeSvg);
    wrap.appendChild(before);

    // Show solution network
    const after = el('div', { class: 'card' });
    after.appendChild(el('h3', { class: 'subsection' }, '◈ Шийдвэрийн сүлжээ (' + result.method + ')'));
    after.appendChild(el('p', { html:
      'Зөвхөн ашиглагдах сум (тээвэрлэлт хийгдэх) тод харагдана. ' +
      'Тэдгээрийн дээр <b>хуваарилагдсан хэмжээ</b> (ногоон) ба зардал (саарал хаалт дотор).<br>' +
      '<span style="color:var(--ink-muted); font-size:13px">' +
      '💡 Зангилаа болон шошгуудыг гараар хөдөлгөж болно.' +
      '</span>'
    }));
    const afterSvg = el('div', { style: { display: 'flex', justifyContent: 'center' } });
    afterSvg.appendChild(renderNetworkSVG(result.input, result.alloc));
    after.appendChild(afterSvg);
    wrap.appendChild(after);

    // Allocation table for clarity
    wrap.appendChild(el('h3', {
      class: 'subsection',
      style: { marginTop: '24px' }
    }, '◈ Хүснэгт хэлбэрээр'));
    wrap.appendChild(window.LP.renderAllocationTable(result.alloc, result.input));

    // Total cost
    const sumGrid = el('div', { class: 'solution-grid' });
    const cc = el('div', { class: 'solution-card' });
    cc.appendChild(el('div', { class: 'solution-label' }, 'Нийт зардал (' + result.method + ')'));
    cc.appendChild(el('div', { class: 'solution-value gold' }, result.totalCost.toString()));
    sumGrid.appendChild(cc);
    wrap.appendChild(sumGrid);

    // Optimize
    const T = window.LP.transport;
    const optActions = el('div', { class: 'action-bar' });
    optActions.appendChild(el('button', {
      class: 'btn btn-primary',
      onClick: () => {
        const optResult = T.modi(result);
        renderModiNetworkSolution(optResult, container);
      }
    }, '⇒ MODI аргаар оптимумчлох'));
    optActions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.exportPDF(container, 'transport-network-' + result.method + '.pdf')
    }, '⬇ PDF татах'));
    wrap.appendChild(optActions);

    container.appendChild(wrap);
  }

  // MODI rendering for network: just show before/after networks + table
  function renderModiNetworkSolution(result, container) {
    container.innerHTML = '';
    const wrap = el('div');
    wrap.appendChild(el('h2', { class: 'section-title' },
      el('span', { class: 'step-num' }, 'MODI'),
      'Оптимумчлал'
    ));

    // Before
    wrap.appendChild(el('h3', { class: 'subsection' },
      '◇ Анхдагч (' + result.initial.method + ')'));
    const beforeWrap = el('div', { style: { display: 'flex', justifyContent: 'center' } });
    beforeWrap.appendChild(renderNetworkSVG(result.input, result.initial.alloc));
    wrap.appendChild(beforeWrap);

    // Show MODI iterations using the table-based renderer for clarity
    wrap.appendChild(el('h3', {
      class: 'subsection',
      style: { marginTop: '24px' }
    }, '◇ MODI iterations (хүснэгт хэлбэрээр)'));

    const iterWrap = el('div');
    result.iterations.forEach((iter) => {
      if (iter.kind !== 'iter') return;
      const iterDiv = el('div', { class: 'card' });
      const header = el('div', { class: 'step-header' });
      header.appendChild(el('span', {
        class: 'step-badge ' + (iter.optimal ? 'final' : 'iter')
      }, iter.optimal ? 'Эцсийн' : 'Iter ' + iter.iter));
      header.appendChild(el('span', { class: 'step-title' },
        iter.optimal ? 'Бүх dᵢⱼ ≥ 0 — оптимум' : 'u, v олох + бууруулах нүд хайх'
      ));
      iterDiv.appendChild(header);
      // Use the same table renderer
      iterDiv.appendChild(window.LP._renderModiTable(
        iter.alloc, iter.basic, result.input,
        iter.u, iter.v, iter.reduced,
        iter.enterCell, iter.loop
      ));
      if (iter.theta && !iter.optimal) {
        iterDiv.appendChild(el('p', {
          style: { fontSize: '13px', color: 'var(--ink-muted)' }
        }, 'θ = ' + iter.theta.toString()));
      }
      iterWrap.appendChild(iterDiv);
    });
    wrap.appendChild(iterWrap);

    // After
    wrap.appendChild(el('h3', {
      class: 'subsection',
      style: { marginTop: '24px' }
    }, '◈ Эцсийн оптимум сүлжээ'));
    const afterWrap = el('div', { style: { display: 'flex', justifyContent: 'center' } });
    afterWrap.appendChild(renderNetworkSVG(result.input, result.alloc));
    wrap.appendChild(afterWrap);

    // Final summary
    const sumGrid = el('div', { class: 'solution-grid' });
    const cInit = el('div', { class: 'solution-card' });
    cInit.appendChild(el('div', { class: 'solution-label' }, 'Анхдагч'));
    cInit.appendChild(el('div', { class: 'solution-value' }, result.initial.totalCost.toString()));
    sumGrid.appendChild(cInit);
    const cOpt = el('div', { class: 'solution-card' });
    cOpt.appendChild(el('div', { class: 'solution-label' }, 'Оптимум (MODI)'));
    cOpt.appendChild(el('div', { class: 'solution-value accent' }, result.totalCost.toString()));
    sumGrid.appendChild(cOpt);
    wrap.appendChild(sumGrid);

    const actions = el('div', { class: 'action-bar' });
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.exportPDF(container, 'transport-network-modi.pdf')
    }, '⬇ PDF татах'));
    wrap.appendChild(actions);

    container.appendChild(wrap);
  }

  window.LP = window.LP || {};
  window.LP.renderNetworkSVG = renderNetworkSVG;
  window.LP.renderTransportNetworkSolution = renderTransportNetworkSolution;
  window.LP.renderModiNetworkSolution = renderModiNetworkSolution;
})();
