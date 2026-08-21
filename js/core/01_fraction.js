// =============================================================================
// FRACTION ARITHMETIC — Frac class for exact (rational) arithmetic
// =============================================================================
// All algorithms operate on fractions internally so results are always exact.
// Display can switch between fraction and decimal at render time.
// =============================================================================

(function () {
  'use strict';

  class Frac {
    constructor(n, d = 1) {
      if (d === 0) throw new Error('Тэгээр хуваагдах боломжгүй');
      if (d < 0) { n = -n; d = -d; }
      const g = Frac._gcd(Math.abs(n), Math.abs(d));
      this.n = n / g;
      this.d = d / g;
    }
    static _gcd(a, b) { return b === 0 ? a : Frac._gcd(b, a % b); }
    static from(x) {
      if (x instanceof Frac) return x;
      if (typeof x === 'number') {
        if (Number.isInteger(x)) return new Frac(x, 1);
        const den = 1000000;
        return new Frac(Math.round(x * den), den);
      }
      if (typeof x === 'string') {
        const s = x.trim();
        if (s.includes('/')) {
          const [a, b] = s.split('/').map(t => parseInt(t.trim(), 10));
          return new Frac(a, b);
        }
        return Frac.from(parseFloat(s));
      }
      throw new Error('Буруу тоо: ' + x);
    }
    add(o) { o = Frac.from(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { o = Frac.from(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { o = Frac.from(o); return new Frac(this.n * o.n, this.d * o.d); }
    div(o) { o = Frac.from(o); if (o.n === 0) throw new Error('div0'); return new Frac(this.n * o.d, this.d * o.n); }
    neg()  { return new Frac(-this.n, this.d); }
    cmp(o) { o = Frac.from(o); return this.n * o.d - o.n * this.d; }
    eq(o)  { return this.cmp(o) === 0; }
    lt(o)  { return this.cmp(o) <  0; }
    gt(o)  { return this.cmp(o) >  0; }
    lte(o) { return this.cmp(o) <= 0; }
    gte(o) { return this.cmp(o) >= 0; }
    isZero(){ return this.n === 0; }
    isNeg() { return this.n < 0; }
    isPos() { return this.n > 0; }
    toNumber() { return this.n / this.d; }
    toString(mode) {
      mode = mode || (window.LP && window.LP.Settings ? window.LP.Settings.numberDisplay : 'fraction');
      if (this.n === 0) return '0';
      if (mode === 'decimal') {
        const v = this.toNumber();
        const r = Math.round(v * 1000) / 1000;
        return Number.isInteger(r) ? String(r) : r.toFixed(3).replace(/\.?0+$/, '');
      }
      if (this.d === 1) return String(this.n);
      return this.n + '/' + this.d;
    }
  }

  // Expose globally
  window.LP = window.LP || {};
  window.LP.Frac = Frac;
  window.LP.F = (n, d) => new Frac(n, d);
})();
