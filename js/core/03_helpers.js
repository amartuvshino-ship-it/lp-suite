// =============================================================================
// HELPERS — DOM creation, escaping, subscript digits
// =============================================================================
(function () {
  'use strict';

  // HTML escape
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // DOM element creator
  // el(tag, attrs, ...children)
  function el(tag, attrs, ...kids) {
    attrs = attrs || {};
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') {
        e.addEventListener(k.slice(2).toLowerCase(), v);
      }
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v);
    }
    for (const k of kids) {
      if (k == null) continue;
      if (Array.isArray(k)) {
        k.forEach(c => c && e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
      }
      else if (typeof k === 'string') e.appendChild(document.createTextNode(k));
      else e.appendChild(k);
    }
    return e;
  }

  // Variable subscript helper: x_1 -> x₁, A_2 -> A₂
  function subscriptDigits(s) {
    return String(s).replace(/_(\d+)/g, (_, d) =>
      d.split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[+c]).join('')
    );
  }

  // Math subscript: x_1 -> x₁, d_ij -> dᵢⱼ, u_i -> uᵢ, v_j -> vⱼ
  // Handles BOTH digit and letter subscripts.
  // Letter map: only those Unicode subscripts that exist (Latin small).
  // Digits and letters can be mixed inside the subscript group.
  function mathSubscript(s) {
    if (s == null) return '';
    const digitMap = '₀₁₂₃₄₅₆₇₈₉';
    // Only Latin small letters that have official Unicode subscripts.
    // For missing ones (like 'b','c','d','f','g','q','w','y','z') we fall
    // back to a tag-less <sub>x</sub>-style HTML wrap when called via *Html.
    const letterMap = {
      a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ',
      l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ',
      s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
      // capital letters have no subscripts — fall back below
    };
    return String(s).replace(/_([A-Za-z0-9]+)/g, (whole, sub) => {
      let out = '';
      for (const ch of sub) {
        if (/\d/.test(ch)) out += digitMap[+ch];
        else if (letterMap[ch.toLowerCase()]) out += letterMap[ch.toLowerCase()];
        else out += ch;  // unsupported — leave as-is (rare)
      }
      return out;
    });
  }

  // HTML version: same as mathSubscript but for letters without Unicode
  // subscript glyph, falls back to <sub>...</sub> tags.
  // Use this in HTML strings only.
  function mathSubscriptHtml(s) {
    if (s == null) return '';
    const digitMap = '₀₁₂₃₄₅₆₇₈₉';
    const letterMap = {
      a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ',
      l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ',
      s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
    };
    return String(s).replace(/_([A-Za-z0-9]+)/g, (whole, sub) => {
      // Try Unicode for every char first
      let out = '';
      let usedHtmlFallback = false;
      for (const ch of sub) {
        if (/\d/.test(ch)) out += digitMap[+ch];
        else if (letterMap[ch.toLowerCase()] && ch === ch.toLowerCase()) out += letterMap[ch];
        else { usedHtmlFallback = true; break; }
      }
      if (usedHtmlFallback) return '<sub>' + sub + '</sub>';
      return out;
    });
  }

  // Number/Frac formatter
  function fmt(v) {
    if (window.LP.Frac && v instanceof window.LP.Frac) return v.toString();
    return String(v);
  }

  // SVG element creator
  function svgEl(tag, attrs, text) {
    const ns = 'http://www.w3.org/2000/svg';
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    return e;
  }

  window.LP = window.LP || {};
  window.LP.esc = esc;
  window.LP.el = el;
  window.LP.subscriptDigits = subscriptDigits;
  window.LP.mathSubscript = mathSubscript;
  window.LP.mathSubscriptHtml = mathSubscriptHtml;
  window.LP.fmt = fmt;
  window.LP.svgEl = svgEl;
})();
