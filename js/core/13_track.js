// =============================================================================
// TRACK — Хандалтын хэмжилт
// =============================================================================
// Юу цуглуулдаг вэ:
//   · Аль хуудсыг үзсэн (route)
//   · Улс — БРАУЗЕРЫН ЦАГИЙН БҮСЭЭС тодорхойлно (гадаад үйлчилгээ дуудахгүй)
//   · Хэл, төхөөрөмжийн төрөл (утас / таблет / компьютер)
//   · Санамсаргүй сешн дугаар — нэг зочлолтыг тоолоход
//
// Юуг ЦУГЛУУЛДАГГҮЙ вэ:
//   · IP хаяг · нэр · и-мэйл · cookie · гуравдагч талын хэмжигч
//   Нэвтэрсэн үед л хэрэглэгчийн id серверт холбогдоно.
//
// Унтраах:  js/config.js → ANALYTICS.enabled = false
// =============================================================================
(function () {
  'use strict';

  const Cfg = window.LP.Config || {};
  const A = Cfg.ANALYTICS || {};
  if (A.enabled === false) return;

  // ---------------------------------------------------------------------------
  // Цагийн бүс → улс. Дэлхийн голлох бүсүүдийг хамарсан авсаархан хүснэгт.
  // Олдохгүй бол бүсийн нэрийг шууд бичнэ (жишээ: "Asia/Almaty").
  // ---------------------------------------------------------------------------
  const TZ = {
    'Asia/Ulaanbaatar': 'Монгол', 'Asia/Choibalsan': 'Монгол', 'Asia/Hovd': 'Монгол',
    'Asia/Shanghai': 'Хятад', 'Asia/Urumqi': 'Хятад', 'Asia/Hong_Kong': 'Хонконг',
    'Asia/Macau': 'Макао', 'Asia/Taipei': 'Тайвань',
    'Asia/Seoul': 'Өмнөд Солонгос', 'Asia/Pyongyang': 'Хойд Солонгос',
    'Asia/Tokyo': 'Япон',
    'Asia/Almaty': 'Казахстан', 'Asia/Aqtobe': 'Казахстан', 'Asia/Atyrau': 'Казахстан',
    'Asia/Bishkek': 'Кыргызстан', 'Asia/Tashkent': 'Узбекистан',
    'Asia/Dushanbe': 'Тажикистан', 'Asia/Ashgabat': 'Туркменистан',
    'Asia/Kabul': 'Афганистан', 'Asia/Karachi': 'Пакистан',
    'Asia/Kolkata': 'Энэтхэг', 'Asia/Calcutta': 'Энэтхэг', 'Asia/Colombo': 'Шри-Ланка',
    'Asia/Kathmandu': 'Балба', 'Asia/Dhaka': 'Бангладеш', 'Asia/Thimphu': 'Бутан',
    'Asia/Yangon': 'Мьянмар', 'Asia/Bangkok': 'Тайланд', 'Asia/Vientiane': 'Лаос',
    'Asia/Phnom_Penh': 'Камбож', 'Asia/Ho_Chi_Minh': 'Вьетнам', 'Asia/Saigon': 'Вьетнам',
    'Asia/Kuala_Lumpur': 'Малайз', 'Asia/Singapore': 'Сингапур',
    'Asia/Jakarta': 'Индонез', 'Asia/Makassar': 'Индонез', 'Asia/Jayapura': 'Индонез',
    'Asia/Manila': 'Филиппин', 'Asia/Brunei': 'Бруней',
    'Asia/Dubai': 'АНЭУ', 'Asia/Qatar': 'Катар', 'Asia/Riyadh': 'Саудын Араб',
    'Asia/Kuwait': 'Кувейт', 'Asia/Bahrain': 'Бахрейн', 'Asia/Muscat': 'Оман',
    'Asia/Tehran': 'Иран', 'Asia/Baghdad': 'Ирак', 'Asia/Jerusalem': 'Израиль',
    'Asia/Amman': 'Йордан', 'Asia/Beirut': 'Ливан', 'Asia/Damascus': 'Сири',
    'Asia/Istanbul': 'Турк', 'Europe/Istanbul': 'Турк',
    'Asia/Baku': 'Азербайжан', 'Asia/Yerevan': 'Армен', 'Asia/Tbilisi': 'Гүрж',

    'Europe/Moscow': 'Орос', 'Europe/Kaliningrad': 'Орос', 'Europe/Samara': 'Орос',
    'Asia/Yekaterinburg': 'Орос', 'Asia/Novosibirsk': 'Орос', 'Asia/Krasnoyarsk': 'Орос',
    'Asia/Irkutsk': 'Орос', 'Asia/Yakutsk': 'Орос', 'Asia/Vladivostok': 'Орос',
    'Asia/Omsk': 'Орос', 'Asia/Chita': 'Орос',
    'Europe/Kiev': 'Украин', 'Europe/Kyiv': 'Украин', 'Europe/Minsk': 'Беларусь',
    'Europe/London': 'Их Британи', 'Europe/Dublin': 'Ирланд',
    'Europe/Paris': 'Франц', 'Europe/Berlin': 'Герман', 'Europe/Madrid': 'Испани',
    'Europe/Rome': 'Итали', 'Europe/Lisbon': 'Португал', 'Europe/Amsterdam': 'Нидерланд',
    'Europe/Brussels': 'Бельги', 'Europe/Vienna': 'Австри', 'Europe/Zurich': 'Швейцарь',
    'Europe/Prague': 'Чех', 'Europe/Warsaw': 'Польш', 'Europe/Budapest': 'Унгар',
    'Europe/Bucharest': 'Румын', 'Europe/Sofia': 'Болгар', 'Europe/Athens': 'Грек',
    'Europe/Stockholm': 'Швед', 'Europe/Oslo': 'Норвеги', 'Europe/Copenhagen': 'Дани',
    'Europe/Helsinki': 'Финлянд', 'Europe/Tallinn': 'Эстони', 'Europe/Riga': 'Латви',
    'Europe/Vilnius': 'Литва', 'Europe/Belgrade': 'Серби', 'Europe/Zagreb': 'Хорват',
    'Europe/Bratislava': 'Словак', 'Europe/Ljubljana': 'Словени',

    'America/New_York': 'АНУ', 'America/Chicago': 'АНУ', 'America/Denver': 'АНУ',
    'America/Los_Angeles': 'АНУ', 'America/Phoenix': 'АНУ', 'America/Anchorage': 'АНУ',
    'America/Detroit': 'АНУ', 'Pacific/Honolulu': 'АНУ',
    'America/Toronto': 'Канад', 'America/Vancouver': 'Канад', 'America/Edmonton': 'Канад',
    'America/Winnipeg': 'Канад', 'America/Halifax': 'Канад',
    'America/Mexico_City': 'Мексик', 'America/Bogota': 'Колумб', 'America/Lima': 'Перу',
    'America/Santiago': 'Чили', 'America/Sao_Paulo': 'Бразил',
    'America/Argentina/Buenos_Aires': 'Аргентин', 'America/Havana': 'Куба',

    'Africa/Cairo': 'Египет', 'Africa/Lagos': 'Нигери', 'Africa/Nairobi': 'Кени',
    'Africa/Johannesburg': 'ӨАБНУ', 'Africa/Casablanca': 'Марокко',
    'Africa/Algiers': 'Алжир', 'Africa/Tunis': 'Тунис', 'Africa/Accra': 'Гана',
    'Africa/Addis_Ababa': 'Этиоп',

    'Australia/Sydney': 'Австрали', 'Australia/Melbourne': 'Австрали',
    'Australia/Brisbane': 'Австрали', 'Australia/Perth': 'Австрали',
    'Australia/Adelaide': 'Австрали',
    'Pacific/Auckland': 'Шинэ Зеланд', 'Pacific/Fiji': 'Фижи',
  };

  function country() {
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    if (tz && TZ[tz]) return TZ[tz];
    if (tz) return tz;                      // танихгүй бүс — нэрийг нь хэвээр
    // Цагийн бүс байхгүй бол хэлний бүсийн кодоор
    const l = (navigator.language || '');
    const m = /-([A-Z]{2})$/.exec(l);
    return m ? m[1] : '—';
  }

  function device() {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'Таблет';
    if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return 'Утас';
    return 'Компьютер';
  }

  // Сешн дугаар — зөвхөн энэ табын хугацаанд, хувь хүнийг таних боломжгүй
  function sid() {
    try {
      let s = sessionStorage.getItem('lp.sid');
      if (!s) {
        s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        sessionStorage.setItem('lp.sid', s);
      }
      return s;
    } catch (e) { return ''; }
  }

  const CTX = { country: country(), lang: navigator.language || '—',
                device: device(), sid: sid() };

  // ---------------------------------------------------------------------------
  // Дараалал ба илгээлт
  // ---------------------------------------------------------------------------
  const FLUSH_MS = A.flushMs || 15000;
  const MAX_BATCH = 20;
  let queue = [];
  let timer = null;
  let lastRoute = '', lastAt = 0;

  function flush() {
    clearTimeout(timer); timer = null;
    if (!queue.length) return;
    const Data = window.LP.Data;
    if (!Data || !Data.visits) { queue = []; return; }
    const batch = queue.slice(0, MAX_BATCH);
    queue = queue.slice(MAX_BATCH);
    Data.visits.log(batch).catch(() => { /* алдвал чимээгүй орхино */ });
    if (queue.length) schedule();
  }

  function schedule() {
    if (timer) return;
    timer = setTimeout(flush, FLUSH_MS);
  }

  function hit(route) {
    if (!route) return;
    const now = Date.now();
    // Нэг хуудсыг 5 секундэд нэгээс олон удаа тоолохгүй
    if (route === lastRoute && now - lastAt < 5000) return;
    lastRoute = route; lastAt = now;
    queue.push({ route: route, country: CTX.country, lang: CTX.lang,
                 device: CTX.device, sid: CTX.sid });
    if (queue.length >= MAX_BATCH) flush(); else schedule();
  }

  // Таб хаагдах / нуугдах үед үлдсэнийг илгээнэ
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  // ---------------------------------------------------------------------------
  // Router-т залгах — LP.App.go бүрийг барина
  // ---------------------------------------------------------------------------
  function attach() {
    const App = window.LP.App;
    if (!App || !App.go || App.__tracked) return false;
    const orig = App.go.bind(App);
    App.go = function (route, params) {
      try { hit(route); } catch (e) {}
      return orig(route, params);
    };
    App.__tracked = true;
    // Эхний ачаалалт
    try {
      const h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
      hit(h || 'home');
    } catch (e) { hit('home'); }
    return true;
  }

  if (!attach()) {
    // App хараахан бэлэн болоогүй бол хүлээнэ
    let tries = 0;
    const iv = setInterval(() => { if (attach() || ++tries > 40) clearInterval(iv); }, 120);
  }

  window.LP = window.LP || {};
  window.LP.Track = { hit: hit, flush: flush, context: CTX, queue: () => queue.slice() };
})();
