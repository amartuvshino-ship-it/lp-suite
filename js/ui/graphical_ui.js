// =============================================================================
// GRAPHICAL UI — renders the SVG plot + 3-step solution
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const svgEl = window.LP.svgEl;
  const F = window.LP.F;

  // -----------------------------
  // Render SVG plot
  // -----------------------------
  function renderGraphicalSVG(engine) {
    const bounds = engine.computeBounds();
    const W = 580, H = 460;
    const padL = 60, padR = 30, padT = 30, padB = 50;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const sx = x => padL + (x - bounds.xMin) * plotW / (bounds.xMax - bounds.xMin);
    const sy = y => H - padB - (y - bounds.yMin) * plotH / (bounds.yMax - bounds.yMin);

    const svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      width: '100%',
    });
    svg.style.maxWidth = '600px';
    svg.style.background = '#FAFAF7';

    // Grid
    const gridStep = Math.max(1, Math.ceil((bounds.xMax - bounds.xMin) / 10));
    for (let x = bounds.xMin; x <= bounds.xMax; x += gridStep) {
      svg.appendChild(svgEl('line', {
        x1: sx(x), y1: sy(bounds.yMin), x2: sx(x), y2: sy(bounds.yMax),
        stroke: '#E5E3D9', 'stroke-width': '1', 'stroke-dasharray': '2 3'
      }));
    }
    for (let y = bounds.yMin; y <= bounds.yMax; y += gridStep) {
      svg.appendChild(svgEl('line', {
        x1: sx(bounds.xMin), y1: sy(y), x2: sx(bounds.xMax), y2: sy(y),
        stroke: '#E5E3D9', 'stroke-width': '1', 'stroke-dasharray': '2 3'
      }));
    }

    // Feasible region
    if (engine.vertices && engine.vertices.length >= 3) {
      const verts = engine.vertices.map(v => ({ x: v.x.toNumber(), y: v.y.toNumber() }));
      const cx = verts.reduce((a, p) => a + p.x, 0) / verts.length;
      const cy = verts.reduce((a, p) => a + p.y, 0) / verts.length;
      verts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
      const points = verts.map(p => sx(p.x) + ',' + sy(p.y)).join(' ');
      svg.appendChild(svgEl('polygon', {
        points: points,
        fill: '#97BC62', 'fill-opacity': '0.20',
        stroke: '#2C5F2D', 'stroke-width': '1.5', 'stroke-opacity': '0.5',
      }));
    }

    // Constraint lines
    const palette = ['#3B4A7A', '#B5482A', '#C8A951', '#7B5BA0', '#2C5F2D', '#7A6F3D'];
    let pi = 0;
    engine.lines.forEach(L => {
      if (L.isAxis) return;
      const a = L.a.toNumber(), b = L.b.toNumber(), c = L.c.toNumber();
      let pts = [];
      if (b !== 0) {
        pts.push({ x: bounds.xMin, y: (c - a * bounds.xMin) / b });
        pts.push({ x: bounds.xMax, y: (c - a * bounds.xMax) / b });
      }
      if (a !== 0) {
        pts.push({ x: (c - b * bounds.yMin) / a, y: bounds.yMin });
        pts.push({ x: (c - b * bounds.yMax) / a, y: bounds.yMax });
      }
      pts = pts.filter(p =>
        p.x >= bounds.xMin - 1e-6 && p.x <= bounds.xMax + 1e-6 &&
        p.y >= bounds.yMin - 1e-6 && p.y <= bounds.yMax + 1e-6
      );
      if (pts.length >= 2) {
        const color = palette[pi++ % palette.length];
        const p1 = pts[0], p2 = pts[pts.length - 1];
        svg.appendChild(svgEl('line', {
          x1: sx(p1.x), y1: sy(p1.y), x2: sx(p2.x), y2: sy(p2.y),
          stroke: color, 'stroke-width': '2', 'stroke-linecap': 'round',
        }));
        const lx = sx(Math.max(p1.x, p2.x));
        const ly = sy((p1.y + p2.y) / 2);
        svg.appendChild(svgEl('text', {
          x: Math.min(lx + 4, W - 5), y: ly - 4,
          fill: color,
          'font-family': 'JetBrains Mono, monospace', 'font-size': '11', 'font-weight': '600',
        }, L.label));
      }
    });

    // Axes
    svg.appendChild(svgEl('line', {
      x1: sx(0), y1: sy(bounds.yMin), x2: sx(0), y2: sy(bounds.yMax),
      stroke: '#1A1A1A', 'stroke-width': '1.5'
    }));
    svg.appendChild(svgEl('line', {
      x1: sx(bounds.xMin), y1: sy(0), x2: sx(bounds.xMax), y2: sy(0),
      stroke: '#1A1A1A', 'stroke-width': '1.5'
    }));
    for (let x = 0; x <= bounds.xMax; x += gridStep) {
      svg.appendChild(svgEl('line', {
        x1: sx(x), y1: sy(0) - 3, x2: sx(x), y2: sy(0) + 3,
        stroke: '#1A1A1A', 'stroke-width': '1'
      }));
      svg.appendChild(svgEl('text', {
        x: sx(x), y: sy(0) + 18, 'text-anchor': 'middle',
        fill: '#7A7A7A', 'font-family': 'JetBrains Mono, monospace', 'font-size': '10'
      }, String(x)));
    }
    for (let y = 0; y <= bounds.yMax; y += gridStep) {
      if (y === 0) continue;
      svg.appendChild(svgEl('line', {
        x1: sx(0) - 3, y1: sy(y), x2: sx(0) + 3, y2: sy(y),
        stroke: '#1A1A1A', 'stroke-width': '1'
      }));
      svg.appendChild(svgEl('text', {
        x: sx(0) - 8, y: sy(y) + 3, 'text-anchor': 'end',
        fill: '#7A7A7A', 'font-family': 'JetBrains Mono, monospace', 'font-size': '10'
      }, String(y)));
    }
    svg.appendChild(svgEl('text', {
      x: W - padR, y: sy(0) + 38, 'text-anchor': 'end',
      fill: '#1A1A1A', 'font-family': 'Geist, sans-serif',
      'font-size': '13', 'font-style': 'italic',
    }, 'x₁'));
    svg.appendChild(svgEl('text', {
      x: sx(0) - 5, y: padT + 4, 'text-anchor': 'end',
      fill: '#1A1A1A', 'font-family': 'Geist, sans-serif',
      'font-size': '13', 'font-style': 'italic',
    }, 'x₂'));

    // Vertices
    if (engine.vertices) {
      engine.vertices.forEach((v) => {
        const x = v.x.toNumber(), y = v.y.toNumber();
        const isOpt = (engine.optimal && v.x.eq(engine.optimal.x) && v.y.eq(engine.optimal.y));
        svg.appendChild(svgEl('circle', {
          cx: sx(x), cy: sy(y), r: isOpt ? '7' : '5',
          fill: isOpt ? '#C8A951' : '#FFFFFF',
          stroke: isOpt ? '#1A1A1A' : '#2C5F2D',
          'stroke-width': isOpt ? '2.5' : '2',
        }));
        svg.appendChild(svgEl('text', {
          x: sx(x) + 10, y: sy(y) - 8,
          fill: isOpt ? '#1A1A1A' : '#4A4A4A',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': isOpt ? '12' : '11',
          'font-weight': isOpt ? '700' : '500',
        }, '(' + v.x.toString() + ',' + v.y.toString() + ')'));
        if (isOpt) {
          svg.appendChild(svgEl('text', {
            x: sx(x) + 10, y: sy(y) + 8,
            fill: '#8a7320',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '11', 'font-weight': '600',
          }, 'Z=' + v.z.toString() + ' ★'));
        }
      });
    }

    return svg;
  }

  // -----------------------------
  // Render full graphical solution
  // -----------------------------
  function renderGraphicalSolution(eng, lp, container) {
    container.innerHTML = '';
    const wrap = el('div');

    wrap.appendChild(el('h2', { class: 'section-title' },
      el('span', { class: 'step-num' }, 'Бодолт'),
      'Графикийн зураглал'
    ));

    if (eng.status === 'infeasible') {
      wrap.appendChild(el('div', {
        class: 'panel danger',
        html: '<div class="panel-title">✕ Бодлого шийдгүй</div>' +
              '<p>Хязгаарлалтуудын муж хоосон байна — бүх хязгаарлалтыг нэгэн зэрэг хангах цэг олдсонгүй. ' +
              'Хязгаарлалтын тэмдэг (≤/≥) болон утгуудаа дахин шалгана уу.</p>'
      }));
      container.appendChild(wrap);
      return;
    }

    if (eng.status === 'unbounded') {
      wrap.appendChild(el('div', {
        class: 'panel warn',
        html: '<div class="panel-title">∞ Хязгааргүй шийд</div>' +
              '<p>Боломжит муж нь нээлттэй байна, ' +
              (eng.isMax ? 'ашиг' : 'зардал') +
              ' хязгааргүй өсөж байна. Дутуу хязгаарлалт байгаа эсэхээ шалгаарай.</p>'
      }));
      const graphCard = el('div', { class: 'card' });
      graphCard.appendChild(el('h3', { class: 'subsection' }, '◇ Хязгаарлалтууд'));
      const svgWrap = el('div', { class: 'graph-svg-wrap' });
      svgWrap.appendChild(renderGraphicalSVG(eng));
      graphCard.appendChild(svgWrap);
      wrap.appendChild(graphCard);
      container.appendChild(wrap);
      return;
    }

    // Step 1: lines and intercepts
    const card1 = el('div', { class: 'card' });
    card1.appendChild(el('div', { class: 'step-header' },
      el('span', { class: 'step-badge' }, 'Алхам 1'),
      el('span', { class: 'step-title' }, 'Хязгаарлалтын шулуунуудыг зурах')
    ));
    card1.appendChild(el('p', {
      html: 'Тэнцэтгэл бишүүдийг түр зуур тэнцүү (=) тэмдэгтэй болгож, тэнхлэгүүдтэй огтлолцох цэгүүдийг олно.'
    }));
    const interceptsTbl = el('table', {
      class: 'tableau',
      style: { width: 'auto', minWidth: '500px' }
    });
    interceptsTbl.innerHTML = '<thead><tr>' +
      '<th class="row-label">Шулуун</th>' +
      '<th>Тэгшитгэл</th>' +
      '<th>x₁ тэнхлэг (x₂=0)</th>' +
      '<th>x₂ тэнхлэг (x₁=0)</th></tr></thead>';
    const itb = el('tbody');
    for (let i = 0; i < lp.A.length; i++) {
      const tr = el('tr');
      tr.appendChild(el('td', { class: 'row-label' }, 'C' + (i + 1)));
      const a = lp.A[i][0], b = lp.A[i][1];
      let eq = '';
      eq += a.isNeg() ? '−' + a.neg().toString() + 'x₁' : a.toString() + 'x₁';
      eq += b.isNeg() ? ' − ' + b.neg().toString() + 'x₂' : ' + ' + b.toString() + 'x₂';
      eq += ' = ' + lp.b[i].toString();
      tr.appendChild(el('td', {}, eq));
      const x1Int = !a.isZero() ? '(' + lp.b[i].div(a).toString() + ', 0)' : '— (a=0)';
      tr.appendChild(el('td', {}, x1Int));
      const x2Int = !b.isZero() ? '(0, ' + lp.b[i].div(b).toString() + ')' : '— (b=0)';
      tr.appendChild(el('td', {}, x2Int));
      itb.appendChild(tr);
    }
    interceptsTbl.appendChild(itb);
    const itw = el('div', { class: 'tableau-wrap' });
    itw.appendChild(interceptsTbl);
    card1.appendChild(itw);
    wrap.appendChild(card1);

    // Step 2: graph
    const card2 = el('div', { class: 'card' });
    card2.appendChild(el('div', { class: 'step-header' },
      el('span', { class: 'step-badge' }, 'Алхам 2'),
      el('span', { class: 'step-title' }, 'Боломжит шийдийн муж ба оройн цэгүүд')
    ));
    card2.appendChild(el('p', {
      html: 'Хязгаарлалтын тэмдгээс хамаарч мужаа будна (≤ → доош, ≥ → дээш). ' +
            'Бүх мужуудын огтлолцлоор болсон <b>боломжит шийдийн муж</b> нь сонирхож буй хэсэг. ' +
            'Оптимум үргэлж энэхүү мужийн <b>оройн цэгийн нэг дээр</b> оршино.'
    }));
    const svgWrap = el('div', { class: 'graph-svg-wrap' });
    svgWrap.appendChild(renderGraphicalSVG(eng));
    card2.appendChild(svgWrap);
    wrap.appendChild(card2);

    // Step 3: vertex evaluation
    const card3 = el('div', { class: 'card' });
    card3.appendChild(el('div', { class: 'step-header' },
      el('span', { class: 'step-badge' }, 'Алхам 3'),
      el('span', { class: 'step-title' }, 'Оройн цэг бүр дээр Z-г бодох')
    ));
    const vTbl = el('table', { class: 'tableau' });
    vTbl.innerHTML = '<thead><tr>' +
      '<th class="row-label">Цэг</th>' +
      '<th>x₁</th><th>x₂</th>' +
      '<th>Үүссэн</th>' +
      '<th>Z = ' + lp.c[0].toString() + 'x₁ + ' + lp.c[1].toString() + 'x₂</th></tr></thead>';
    const vtb = el('tbody');
    const sorted = eng.vertices.slice().sort((a, b) => {
      const ax = a.x.toNumber(), ay = a.y.toNumber();
      const bx = b.x.toNumber(), by = b.y.toNumber();
      if (ax + ay !== bx + by) return ax + ay - bx - by;
      return ax - bx;
    });
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    sorted.forEach((v, i) => {
      const isOpt = eng.optimal && v.x.eq(eng.optimal.x) && v.y.eq(eng.optimal.y);
      const tr = el('tr');
      if (isOpt) tr.style.background = 'var(--gold-bg)';
      tr.appendChild(el('td', { class: 'row-label' }, labels[i] || String(i + 1)));
      tr.appendChild(el('td', {}, v.x.toString()));
      tr.appendChild(el('td', {}, v.y.toString()));
      tr.appendChild(el('td', {
        style: { fontSize: '11px', color: 'var(--ink-muted)' }
      }, v.formedBy ? v.formedBy.join(' ∩ ') : ''));
      const zCell = el('td', {
        class: isOpt ? 'rhs' : '',
        style: isOpt ? { fontWeight: '700', color: '#8a7320' } : {}
      }, v.z.toString() + (isOpt ? ' ★' : ''));
      tr.appendChild(zCell);
      vtb.appendChild(tr);
    });
    vTbl.appendChild(vtb);
    const vTblWrap = el('div', { class: 'tableau-wrap' });
    vTblWrap.appendChild(vTbl);
    card3.appendChild(vTblWrap);
    wrap.appendChild(card3);

    // Final summary
    const opt = eng.optimal;
    const sumGrid = el('div', { class: 'solution-grid' });
    const zCard = el('div', { class: 'solution-card' });
    zCard.appendChild(el('div', {
      class: 'solution-label'
    }, eng.isMax ? 'Хамгийн их Z' : 'Хамгийн бага Z'));
    zCard.appendChild(el('div', { class: 'solution-value accent' }, opt.z.toString()));
    sumGrid.appendChild(zCard);
    const x1Card = el('div', { class: 'solution-card' });
    x1Card.appendChild(el('div', { class: 'solution-label' }, 'x₁ (хувьсагч)'));
    x1Card.appendChild(el('div', { class: 'solution-value' }, opt.x.toString()));
    sumGrid.appendChild(x1Card);
    const x2Card = el('div', { class: 'solution-card' });
    x2Card.appendChild(el('div', { class: 'solution-label' }, 'x₂ (хувьсагч)'));
    x2Card.appendChild(el('div', { class: 'solution-value' }, opt.y.toString()));
    sumGrid.appendChild(x2Card);
    wrap.appendChild(sumGrid);

    const conc = el('div', { class: 'panel success' });
    conc.appendChild(el('div', { class: 'panel-title' }, '✓ Эдийн засгийн дүгнэлт'));
    conc.appendChild(el('p', {
      html: 'Боломжит мужийн ' + eng.vertices.length + ' оройн цэгийг шалгахад ' +
            '<b>(' + opt.x.toString() + ', ' + opt.y.toString() + ')</b> ' +
            'цэг дээр Z нь ' + (eng.isMax ? 'хамгийн их' : 'хамгийн бага') +
            ' утга буюу <b>' + opt.z.toString() + '</b> авч байна. ' +
            'Энэ бол өгөгдсөн хязгаарлалтуудын хүрээнд олж болох ' +
            (eng.isMax ? 'хамгийн их ашиг' : 'хамгийн бага зардал') + '.'
    }));
    wrap.appendChild(conc);

    const actions = el('div', { class: 'action-bar' });
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => { if (window.LP.openSaveDialog) window.LP.openSaveDialog(lp, 'graphical'); }
    }, '☆ Хадгалах'));
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.exportPDF(container, 'graphical-solution.pdf')
    }, '⬇ PDF татах'));
    wrap.appendChild(actions);

    container.appendChild(wrap);
  }

  window.LP = window.LP || {};
  window.LP.renderGraphicalSVG = renderGraphicalSVG;
  window.LP.renderGraphicalSolution = renderGraphicalSolution;
})();
