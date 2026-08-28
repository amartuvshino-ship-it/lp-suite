// =============================================================================
// SIMPLEX SOLUTION RENDERER — renders all steps + summary + economics
// =============================================================================
(function () {
  'use strict';
  const el = window.LP.el;
  const subscriptDigits = window.LP.subscriptDigits;
  const Settings = window.LP.Settings;

  function renderSimplexSolution(engine, lp, container) {
    container.innerHTML = '';
    const wrap = el('div');

    wrap.appendChild(el('h2', { class: 'section-title' },
      el('span', { class: 'step-num' }, 'Бодолт'),
      'Алхам алхмаар'
    ));

    // Canonical form card
    const canonCard = buildCanonicalFormCard(lp, engine);
    wrap.appendChild(canonCard);

    // Z-row construction explanation (before the first tableau)
    const zRowCard = buildZRowExplanation(lp);
    wrap.appendChild(zRowCard);

    // Each step
    engine.steps.forEach((step, idx) => {
      const stepDiv = el('div', { class: 'step' });
      const header = el('div', { class: 'step-header' });

      let badgeText, badgeCls = 'step-badge';
      if (idx === 0) badgeText = 'Анхны';
      else if (step.final) {
        if (step.optimal) { badgeText = 'Эцсийн'; }
        else if (step.infeasible) { badgeText = 'Шийдгүй'; }
        else if (step.unbounded) { badgeText = 'Хязгааргүй'; }
        else badgeText = 'Дуусгасан';
        badgeCls += ' final';
      } else {
        badgeText = 'Iteration ' + step.iter;
        badgeCls += ' iter';
      }

      header.appendChild(el('span', { class: badgeCls }, badgeText));
      header.appendChild(el('span', { class: 'step-title' }, step.label));
      stepDiv.appendChild(header);

      if (typeof step.enterCol === 'number' && step.enterCol >= 0) {
        const colName = subscriptDigits(step.varNames[step.enterCol]);
        const rowName = step.leaveRow >= 0
          ? subscriptDigits(step.varNames[step.basis[step.leaveRow]])
          : null;
        const exp = el('div', { class: 'panel info' });
        exp.appendChild(el('div', { class: 'panel-title' }, '◇ Pivot сонголт'));
        const text = el('div');
        text.innerHTML =
          '<p>Орох баганаас (<b>' + colName + '</b>) Z мөрд хамгийн ' +
          (step.isMax ? 'их сөрөг' : 'их эерэг') +
          ' утга байна — энэ нь зорилгод хамгийн их сайжруулалт өгөх хувьсагч.' +
          (rowName
            ? ' Гарах мөр болж <b>' + rowName + '</b> сонгогдов: ' +
              'RHS/багана харьцааны хамгийн бага утга → энэ нөөц хамгийн түрүүнд цөөлөгдөнө.'
            : '') +
          '</p>';
        exp.appendChild(text);
        stepDiv.appendChild(exp);
      }

      stepDiv.appendChild(window.LP.renderTableau(step));

      if (step.final) {
        if (step.infeasible) {
          stepDiv.appendChild(buildInfeasiblePanel());
        } else if (step.unbounded) {
          stepDiv.appendChild(buildUnboundedPanel());
        } else if (step.optimal) {
          const sol = engine.getSolution();
          if (sol) stepDiv.appendChild(window.LP.renderSolutionSummary(sol, engine, lp));
        }
      }
      wrap.appendChild(stepDiv);
    });

    // Action bar
    const actions = el('div', { class: 'action-bar' });
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => {
        if (window.LP.openSaveDialog) {
          const method = (engine.state && engine.state.aux &&
            engine.state.aux.some(a => a.type === 'artificial')) ? 'bigm' : 'simplex';
          window.LP.openSaveDialog(lp, method);
        }
      }
    }, '☆ Хадгалах'));
    actions.appendChild(el('button', {
      class: 'btn btn-secondary',
      onClick: () => window.LP.exportPDF(container, 'simplex-solution.pdf')
    }, '⬇ PDF татах'));
    wrap.appendChild(actions);

    container.appendChild(wrap);
  }

  function buildCanonicalFormCard(lp, engine) {
    const card = el('div', { class: 'card' });
    card.appendChild(el('h3', { class: 'subsection' }, 'Каноник хэлбэр (тэгшитгэл болгох)'));

    const isMax = lp.objective === 'max';
    const exprParts = [];
    exprParts.push((isMax ? 'max' : 'min') + ' Z = ');
    for (let j = 0; j < lp.c.length; j++) {
      const cv = lp.c[j];
      if (j > 0) exprParts.push(cv.isNeg() ? ' − ' : ' + ');
      const absV = cv.isNeg() ? cv.neg() : cv;
      exprParts.push(absV.toString() + subscriptDigits('x_' + (j + 1)));
    }
    card.appendChild(el('div', { class: 'formula-display' }, exprParts.join('')));

    const cList = el('div');
    let slackIdx = 0, artIdx = 0;
    for (let i = 0; i < lp.b.length; i++) {
      const parts = [];
      for (let j = 0; j < lp.c.length; j++) {
        const v = lp.A[i][j];
        if (j > 0) parts.push(v.isNeg() ? ' − ' : ' + ');
        const absV = v.isNeg() ? v.neg() : v;
        parts.push(absV.toString() + subscriptDigits('x_' + (j + 1)));
      }
      if (lp.ops[i] === '<=') {
        slackIdx++;
        parts.push(' + ' + subscriptDigits('s_' + slackIdx));
      } else if (lp.ops[i] === '>=') {
        slackIdx++;
        artIdx++;
        parts.push(' − ' + subscriptDigits('s_' + slackIdx));
        parts.push(' + ' + subscriptDigits('A_' + artIdx));
      } else {
        artIdx++;
        parts.push(' + ' + subscriptDigits('A_' + artIdx));
      }
      parts.push(' = ' + lp.b[i].toString());
      cList.appendChild(el('div', {
        class: 'formula-display',
        style: { textAlign: 'left', padding: '8px 16px' }
      }, parts.join('')));
    }
    card.appendChild(cList);

    // Aux variable explainer
    const aux = engine.state.aux;
    const hasSlack = aux.some(a => a.type === 'slack');
    const hasSurplus = aux.some(a => a.type === 'surplus');
    const hasArtificial = aux.some(a => a.type === 'artificial');

    if (hasSlack || hasSurplus || hasArtificial) {
      const expl = el('details', { class: 'explainer' });
      expl.open = (Settings.detailLevel === 'long');
      expl.appendChild(el('summary', {}, 'Сул, илүүдэл, зохиомол хувьсагчдын утга'));
      const body = el('div', { class: 'body' });
      if (hasSlack) {
        body.appendChild(el('p', {
          html: '<b>+S (Slack — нэмэлт хувьсагч)</b>: <code>≤</code> хязгаарлалт дээр нэмэгддэг. ' +
                'Эдийн засгийн утга — <i>"тухайн нөөцөөс ашиглагдаагүй үлдсэн хэсэг"</i>. ' +
                'Жишээ нь S₁ = 30 гэвэл "30 м.куб мод үлдсэн" гэсэн үг. ' +
                'Хэрвээ S = 0 болж дуусвал тэр нөөц 100% ашиглагдсан.'
        }));
      }
      if (hasSurplus) {
        body.appendChild(el('p', {
          html: '<b>−S (Surplus — илүүдэл хувьсагч)</b>: <code>≥</code> хязгаарлалт дээр хасагддаг. ' +
                'Эдийн засгийн утга — <i>"шаардлагаас давсан илүүдэл"</i>. ' +
                'Стандарт 10 нэгж уураг шаарддаг байхад бид 12 нийлүүлбэл S = 2.'
        }));
      }
      if (hasArtificial) {
        body.appendChild(el('p', {
          html: '<b>+A (Artificial — зохиомол хувьсагч)</b>: <code>≥</code> ба <code>=</code> үед ' +
                'анхны суурь олохын тулд хүчээр нэмдэг. Эдийн засгийн утга — ' +
                '<i>"гадны өндөр өртөгт онцгой арга хэмжээ, торгууль"</i>. Big-M аргад ' +
                (lp.objective === 'max' ? '−M' : '+M') +
                ' (асар их торгууль) тавьдаг учраас алгоритм A-г хамгийн хурдан хөөж гаргахыг ' +
                'хичээдэг. Хэрэв бодолт дуусахад A > 0 хэвээр үлдсэн бол ' +
                '<b>бодлого шийдгүй (Infeasible)</b>.'
        }));
      }
      expl.appendChild(body);
      card.appendChild(expl);
    }
    return card;
  }

  // -----------------------------
  // Z-row construction explanation
  // Why does the Z-row in the initial tableau show NEGATIVE coefficients?
  // -----------------------------
  function buildZRowExplanation(lp) {
    const card = el('div', { class: 'card' });

    // Lead-in (always visible — explains why this section exists)
    card.appendChild(el('h3', { class: 'subsection' },
      '◇ Анхны хүснэгтийн Z мөрөнд яагаад сөрөг тоо байгаа вэ?'));
    card.appendChild(el('p', {
      style: { fontSize: '14px' }
    }, 'Зорилгын функцийг хязгаарлалттай адил хэлбэрт оруулахын тулд бүх ' +
       'гишүүдийг тэнцүүгийн нөгөө тал руу нь шилжүүлэхэд тэмдэг сольдог. ' +
       'Иймээс анхны хүснэгтэд коэффициентууд сөрөг харагдана.'));

    // Collapsible details for the deeper walkthrough
    const details = el('details', { class: 'explainer' });
    details.open = (Settings.detailLevel === 'long');
    details.appendChild(el('summary', {},
      'Дэлгэрэнгүй: алхам алхмаар хэрхэн байгуулсныг харах'));

    const body = el('div', { class: 'body' });

    const isMax = lp.objective === 'max';
    const objSym = isMax ? 'max' : 'min';

    // Build the original objective expression: 50x₁ + 40x₂
    function objExpr(withSigns) {
      let s = '';
      for (let j = 0; j < lp.c.length; j++) {
        const cv = lp.c[j];
        if (j === 0) {
          if (cv.isNeg()) s += '−' + cv.neg().toString();
          else s += cv.toString();
        } else {
          s += cv.isNeg() ? ' − ' + cv.neg().toString() : ' + ' + cv.toString();
        }
        s += subscriptDigits('x_' + (j + 1));
      }
      return s;
    }

    // Negated for moving to LHS: -50x₁ - 40x₂
    function negatedExpr() {
      let s = '';
      for (let j = 0; j < lp.c.length; j++) {
        const cv = lp.c[j].neg();  // flip sign
        if (j === 0) {
          if (cv.isNeg()) s += '−' + cv.neg().toString();
          else s += cv.toString();
        } else {
          s += cv.isNeg() ? ' − ' + cv.neg().toString() : ' + ' + cv.toString();
        }
        s += subscriptDigits('x_' + (j + 1));
      }
      return s;
    }

    // Step 1: original
    body.appendChild(el('p', { html:
      '<b>1.</b> Зорилгын функц анх ийм хэлбэртэй:'
    }));
    body.appendChild(el('div', { class: 'formula-display' },
      objSym + ' Z = ' + objExpr() + '   →   ' +
      'Z = ' + objExpr()));

    // Step 2: move to LHS — same form as constraints
    body.appendChild(el('p', { html:
      '<b>2.</b> Хязгаарлалтын систем нь "хувьсагч … = тогтмол" гэсэн хэлбэртэй ' +
      '(тэгшитгэл болсон, бүх гишүүд зүүн талд). Тэгэхээр Z мөрийг ч <b>тэр л хэлбэрт</b> ' +
      'оруулах ёстой — бүх гишүүдийг зүүн тал руу нь шилжүүлнэ. Шилжүүлэхэд тэмдэг сольдог:'
    }));
    body.appendChild(el('div', { class: 'formula-display' },
      'Z − (' + objExpr() + ') = 0   ⇒   Z ' + negatedExpr() + ' = 0'));

    // Step 3: how this looks in the table
    body.appendChild(el('p', { html:
      '<b>3.</b> Энэ тэгшитгэлийн коэффициентүүдийг шууд хүснэгтийн ' +
      '<b>Z мөрөнд</b> бичнэ. Үүний улмаас анхны хүснэгтэд зорилгын функцийн ' +
      'коэффициентүүд <b>сөрөг тэмдэгтэй</b> харагдана:'
    }));

    // Demo table showing what the Z row looks like
    const demoWrap = el('div', { class: 'tableau-wrap' });
    const demoTbl = el('table', { class: 'tableau', style: { width: 'auto' } });
    const tHead = el('thead');
    const trH = el('tr');
    trH.appendChild(el('th', { class: 'row-label' }, 'Суурь'));
    for (let j = 0; j < lp.c.length; j++) {
      trH.appendChild(el('th', {}, subscriptDigits('x_' + (j + 1))));
    }
    trH.appendChild(el('th', {}, '...'));
    trH.appendChild(el('th', {}, 'RHS'));
    tHead.appendChild(trH);
    demoTbl.appendChild(tHead);
    const tBody = el('tbody');
    const trZ = el('tr', { class: 'z-row' });
    trZ.appendChild(el('td', { class: 'row-label' }, 'Z'));
    for (let j = 0; j < lp.c.length; j++) {
      const negVal = lp.c[j].neg();
      trZ.appendChild(el('td', {
        class: 'neg', style: { fontWeight: '600' }
      }, negVal.toString()));
    }
    trZ.appendChild(el('td', {
      style: { color: 'var(--ink-muted)', fontSize: '11px' }
    }, '...'));
    trZ.appendChild(el('td', { class: 'rhs' }, '0'));
    tBody.appendChild(trZ);
    demoTbl.appendChild(tBody);
    demoWrap.appendChild(demoTbl);
    body.appendChild(demoWrap);

    // Brief economic intuition
    body.appendChild(el('div', { class: 'panel info', html:
      '<div class="panel-title">◇ Тайлбар</div>' +
      '<p>' + (isMax
        ? 'Z мөр дэх <b>сөрөг утгууд</b> нь: "энэ хувьсагчийг нэг нэгжээр нэмэхэд Z хэдээр өснө" ' +
          'гэсэн утгыг агуулж байна. Жишээлбэл −50 нь "x₁-ийг 1-ээр нэмбэл Z 50-аар өснө" ' +
          'гэсэн үг — Z мөрөнд хамгийн их сөрөг тоо байх нь хамгийн өгөөжтэй хувьсагч ' +
          'болохыг харуулна. Тиймээс симплекс алгоритм <b>хамгийн их сөрөг утгатай ' +
          'багана</b>-ыг "орох багана" болгон сонгодог.'
        : 'Z мөр дэх утгууд нь: "энэ хувьсагчийг нэг нэгжээр нэмэхэд Z хэдээр буурна" ' +
          'гэсэн утгыг агуулж байна. Min бодлогод бид <b>хамгийн их эерэг утгатай ' +
          'багана</b>-ыг сонгодог — учир нь тэр чигт хамгийн хурдан Z буурна.') +
      '</p>'
    }));

    details.appendChild(body);
    card.appendChild(details);
    return card;
  }

  function buildInfeasiblePanel() {
    const p = el('div', { class: 'panel danger' });
    p.appendChild(el('div', { class: 'panel-title' }, '✕ Бодлого шийдгүй'));
    p.appendChild(el('p', {
      html: 'Зохиомол хувьсагч (A) эцсийн суурьт эерэг утгатай үлдсэн байна. ' +
            'Энэ нь таны өгсөн хязгаарлалтуудыг нэгэн зэрэг хангах боломжгүй гэдгийг харуулна. ' +
            'Хязгаарлалтын тэмдэг (≤/≥) болон RHS-ээ дахин шалгана уу.'
    }));
    return p;
  }

  function buildUnboundedPanel() {
    const p = el('div', { class: 'panel warn' });
    p.appendChild(el('div', { class: 'panel-title' }, '∞ Хязгааргүй шийд'));
    p.appendChild(el('p', {
      html: 'Орох баганад бүх элемент сөрөг буюу тэг байна — гарах мөрийг сонгох боломжгүй. ' +
            'Энэ нь хязгаарлалтууд тань хангалтгүй, ашиг/үнэ цэнэ хязгааргүй өсөж байгааг харуулна. ' +
            'Дутуу хязгаарлалт байгаа эсэхээ шалгана уу.'
    }));
    return p;
  }

  // -----------------------------
  // SOLUTION SUMMARY (final values, shadow prices)
  // -----------------------------
  function renderSolutionSummary(sol, engine, lp) {
    const wrap = el('div');
    const grid = el('div', { class: 'solution-grid' });

    const zCard = el('div', { class: 'solution-card' });
    zCard.appendChild(el('div', {
      class: 'solution-label'
    }, lp.objective === 'max' ? 'Хамгийн их Z' : 'Хамгийн бага Z'));
    zCard.appendChild(el('div', { class: 'solution-value accent' }, sol.z.toString()));
    grid.appendChild(zCard);

    for (let j = 0; j < sol.x.length; j++) {
      const c = el('div', { class: 'solution-card' });
      c.appendChild(el('div', { class: 'solution-label' }, subscriptDigits('x_' + (j + 1)) + ' (хувьсагч)'));
      c.appendChild(el('div', { class: 'solution-value' }, sol.x[j].toString()));
      grid.appendChild(c);
    }
    wrap.appendChild(grid);

    if (sol.shadowPrices && sol.shadowPrices.length > 0) {
      const sp = el('div', { class: 'card' });
      sp.appendChild(el('h3', { class: 'subsection' }, '◈ Сүүдрийн үнэ ба нөөцийн ашиглалт'));
      const tbl = el('table', {
        class: 'tableau',
        style: { width: 'auto', minWidth: '400px' }
      });
      tbl.innerHTML = '<thead><tr>' +
        '<th class="row-label">Хязгаарлалт</th>' +
        '<th>Төрөл</th>' +
        '<th>Сүүдрийн үнэ</th>' +
        '<th>Эдийн засгийн утга</th></tr></thead>';
      const tb = el('tbody');
      sol.shadowPrices.forEach(s => {
        const tr = el('tr');
        tr.appendChild(el('td', { class: 'row-label' }, '(' + (s.row + 1) + ')'));
        tr.appendChild(el('td', {}, s.type === 'slack' ? '≤ нөөц' : '≥ шаардлага'));
        tr.appendChild(el('td', {}, s.value.toString()));
        tr.appendChild(el('td', { style: { textAlign: 'left' } },
          s.value.isPos()
            ? 'Нөөцөөс 1 нэгж нэмбэл Z ' + s.value.toString() + ' нэгжээр өөрчлөгдөнө (binding).'
            : (s.value.isZero()
                ? 'Нөөц илүүдэлтэй — нэмэх нь Z-д нөлөөгүй (slack > 0).'
                : 'Утга: ' + s.value.toString())
        ));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      const wrap2 = el('div', { class: 'tableau-wrap' });
      wrap2.appendChild(tbl);
      sp.appendChild(wrap2);
      wrap.appendChild(sp);
    }

    const conc = el('div', { class: 'panel success' });
    conc.appendChild(el('div', { class: 'panel-title' }, '✓ Эдийн засгийн дүгнэлт'));
    let parts = [];
    for (let j = 0; j < sol.x.length; j++) {
      parts.push(subscriptDigits('x_' + (j + 1)) + ' = ' + sol.x[j].toString());
    }
    conc.appendChild(el('p', {
      html: 'Оновчтой шийдэлд хүрсэн. Хувьсагчдын утга: <b>' + parts.join(', ') + '</b>. ' +
            'Зорилгын функц <b>Z = ' + sol.z.toString() + '</b>. ' +
            (lp.objective === 'max'
              ? 'Энэ нь өгөгдсөн хязгаарлалтуудын дотор олж болох <b>хамгийн их утга</b>.'
              : 'Энэ нь өгөгдсөн хязгаарлалтуудыг хангах <b>хамгийн бага зардал</b>.')
    }));
    wrap.appendChild(conc);
    return wrap;
  }

  window.LP = window.LP || {};
  window.LP.renderSimplexSolution = renderSimplexSolution;
  window.LP.renderSolutionSummary = renderSolutionSummary;
})();
