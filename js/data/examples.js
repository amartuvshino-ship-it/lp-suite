// =============================================================================
// EXAMPLES — pre-loaded LP problems from the lecture
// =============================================================================
(function () {
  'use strict';

  const Examples = [
    {
      id: 'modon-urlal',
      title: '"Модон урлал" — Сонгодог жишээ',
      icon: '🪑',
      method: 'simplex',
      desc: 'Стол ба сандал үйлдвэрлэгчийн ашгийг хамгийн их болгох. 2 хувьсагч, 2 хязгаарлалт.',
      lp: {
        objective: 'max', c: [50, 40],
        A: [[4, 2], [2, 4]],
        ops: ['<=', '<='],
        b: [100, 80],
        varNames: ['x_1', 'x_2'],
      }
    },
    {
      id: 'hiam-bigm',
      title: '"Хиам" — Big-M, диет бодлого',
      icon: '🥗',
      method: 'bigm',
      desc: 'Хиамны зардлыг хамгийн бага болгох. ≥ хязгаарлалттай тул Big-M арга шаардлагатай.',
      lp: {
        objective: 'min', c: [5, 3],
        A: [[1, 2], [2, 1]],
        ops: ['>=', '>='],
        b: [10, 8],
        varNames: ['x_1', 'x_2'],
      }
    },
    {
      id: 'three-product',
      title: '3 бүтээгдэхүүн — Олон хувьсагчтай',
      icon: '🏭',
      method: 'simplex',
      desc: 'A, B, C гэсэн 3 бүтээгдэхүүний ашиг. Симплекс хүснэгт олон iteration шаарддаг.',
      lp: {
        objective: 'max', c: [40, 30, 50],
        A: [
          [2, 1, 3],
          [1, 2, 1],
          [3, 1, 2],
        ],
        ops: ['<=', '<=', '<='],
        b: [100, 80, 90],
        varNames: ['x_1', 'x_2', 'x_3'],
      }
    },
    {
      id: 'mixed-constraints',
      title: 'Холимог ≤, ≥, = хязгаарлалт',
      icon: '⚖',
      method: 'bigm',
      desc: 'Гурван төрлийн хязгаарлалт холилдсон жишээ. Slack, surplus, artificial бүгд ашиглагдана.',
      lp: {
        objective: 'max', c: [3, 2],
        A: [[1, 1], [2, 1], [1, 1]],
        ops: ['<=', '>=', '='],
        b: [10, 8, 6],
        varNames: ['x_1', 'x_2'],
      }
    },
    {
      id: 'graphical-example',
      title: 'Графикийн жишээ',
      icon: '📐',
      method: 'graphical',
      desc: '2-хувьсагчтай LP-г координатын хавтгай дээр шийднэ. Боломжит мужийн оройн цэгүүд.',
      lp: {
        objective: 'max', c: [50, 40],
        A: [[4, 2], [2, 4]],
        ops: ['<=', '<='],
        b: [100, 80],
        varNames: ['x_1', 'x_2'],
      }
    },
    {
      id: 'duality-furniture',
      title: '"Модон урлал" — Хосмог бодлого',
      icon: '⚖',
      method: 'duality',
      desc: 'Анхдагч → Хосмог автомат хөрвүүлэлт. Z=W=1400 алтан дүрмийн жишээ.',
      lp: {
        objective: 'max', c: [50, 40],
        A: [[4, 2], [2, 4]],
        ops: ['<=', '<='],
        b: [100, 80],
        varNames: ['x_1', 'x_2'],
      }
    },
    {
      id: 'matrix-furniture',
      title: 'Матрицын арга — AX=B',
      icon: '◫',
      method: 'matrix',
      desc: 'Тодорхойлогч ба урвуу матрицаар оптимум олох. (4·4 − 2·2 = 12)',
      lp: {
        objective: 'max', c: [50, 40],
        A: [[4, 2], [2, 4]],
        ops: ['=', '='],
        b: [100, 80],
        varNames: ['x_1', 'x_2'],
      }
    },
    {
      id: 'integer-classic',
      title: 'Бүхэл тоон — Сонгодог жишээ',
      icon: '🔢',
      method: 'integer',
      desc: 'max 3x₁+5x₂, 2x₁+4x₂≤25, 3x₁+2x₂≤18, бүхэл. Branch & Bound арга.',
      lp: {
        objective: 'max', c: [3, 5],
        A: [[2, 4], [3, 2]],
        ops: ['<=', '<='],
        b: [25, 18],
        varNames: ['x_1', 'x_2'],
      }
    },
    {
      id: 'integer-knapsack',
      title: 'Бүхэл тоон — Knapsack',
      icon: '🎒',
      method: 'integer',
      desc: '3 төрлийн бүтээгдэхүүн, 2 нөөц. Хязгаарлалттай нөхцөлд хамгийн их үнэ цэнэ.',
      lp: {
        objective: 'max', c: [5, 4, 3],
        A: [[1, 2, 1], [3, 1, 2]],
        ops: ['<=', '<='],
        b: [4, 6],
        varNames: ['x_1', 'x_2', 'x_3'],
      }
    },
  ];

  window.LP = window.LP || {};
  window.LP.Examples = Examples;
})();
