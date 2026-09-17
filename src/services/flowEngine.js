/**
 * EN: The form (WhatsApp Flow) engine. PURE JavaScript — no React, no
 *     react-native import — so it can be unit-tested with plain jest and
 *     reused outside this sample. It implements the custom-channel form
 *     contract (docs/custom-kanal-flow-sozlesme.md):
 *       §A incoming `type:"form"` message  → parseFlow / createFormState
 *       §B completed form reply            → buildFormReply
 *       §C server-driven screens           → buildExchangeBody / applyExchangeResponse
 *     Everything here is immutable: functions take a state and return a new
 *     one, which is exactly what React's setState wants.
 * TR: Form (WhatsApp Flow) motoru. SAF JavaScript — React ya da react-native
 *     import'u yok — böylece düz jest ile test edilir ve bu örneğin dışında da
 *     kullanılabilir. Custom kanal form sözleşmesini uygular
 *     (docs/custom-kanal-flow-sozlesme.md):
 *       §A gelen `type:"form"` mesajı      → parseFlow / createFormState
 *       §B tamamlanan form cevabı          → buildFormReply
 *       §C sunucu güdümlü ekranlar         → buildExchangeBody / applyExchangeResponse
 *     Buradaki her şey değişmezdir (immutable): fonksiyonlar bir durum alır,
 *     yenisini döner; React'in setState'i tam olarak bunu ister.
 */

/**
 * EN: UI strings in one place so you can translate them. The rest of the
 *     sample is English, so the defaults are English too.
 * TR: Arayüz metinleri tek yerde; çevirmek isterseniz burayı değiştirin.
 *     Örneğin geri kalanı İngilizce olduğu için varsayılanlar da İngilizce.
 */
export const FLOW_TEXT = {
  open: 'Open form',
  sent: 'Form sent',
  continue: 'Continue',
  sending: 'Sending…',
  select: 'Select…',
  back: 'Back',
  close: 'Close',
  retry: 'Retry',
  yes: 'Yes',
  no: 'No',
  required: 'This field is required.',
  invalidEmail: 'Enter a valid e-mail address.',
  invalidPhone: 'Enter a valid phone number.',
  invalidNumber: 'Enter a number.',
  invalidDate: 'Enter a date as YYYY-MM-DD.',
  minChars: 'Enter at least {n} characters.',
  maxChars: 'Enter at most {n} characters.',
  minSelected: 'Select at least {n} options.',
  maxSelected: 'Select at most {n} options.',
  serverError: 'Something went wrong, please try again.',
  unknownScreen: 'The server asked for a screen this form does not have.',
  noScreens: 'This form has no screens to show.',
};

/**
 * EN: Component types that hold a value. Anything else is either text,
 *     structure (Form / If / Switch / Footer) or unknown.
 * TR: Değer taşıyan bileşen tipleri. Geri kalanı ya metin, ya yapı
 *     (Form / If / Switch / Footer) ya da bilinmeyendir.
 */
export const INPUT_TYPES = [
  'TextInput',
  'TextArea',
  'Dropdown',
  'RadioButtonsGroup',
  'CheckboxGroup',
  'ChipsSelector',
  'OptIn',
  'DatePicker',
  'CalendarPicker',
];

export const TEXT_TYPES = ['TextHeading', 'TextSubheading', 'TextBody', 'TextCaption', 'RichText'];

/* ---------------------------------------------------------------------- */
/* §A — parsing the incoming form                                          */
/* ---------------------------------------------------------------------- */

/**
 * EN: Reads the `form` object of an incoming message and indexes its screens.
 *     `serverDriven` is true when any step needs the bot (flow_action
 *     data_exchange, or a data_exchange action anywhere in the screens).
 * TR: Gelen mesajın `form` nesnesini okur ve ekranlarını indeksler.
 *     `serverDriven`, herhangi bir adım botu gerektiriyorsa (flow_action
 *     data_exchange ya da ekranlarda bir data_exchange eylemi) true olur.
 */
export function parseFlow(form) {
  const list = Array.isArray(form?.screens) ? form.screens.filter((s) => s && s.id) : [];
  const screens = {};
  list.forEach((screen) => {
    screens[screen.id] = screen;
  });

  const firstScreen = (form?.screen && screens[form.screen]) || list[0] || null;
  const needsInit = form?.action === 'data_exchange';
  const serverDriven = needsInit || JSON.stringify(list).indexOf('"data_exchange"') >= 0;

  return {
    screens,
    order: list.map((s) => s.id),
    firstScreen,
    needsInit,
    serverDriven,
    flowVersion: form?.flowVersion ?? null,
    routingModel: form?.routingModel ?? null,
  };
}

/**
 * EN: One entry of the screen stack: the screen definition, the data it was
 *     opened with, the values typed so far and the validation errors.
 * TR: Ekran yığınının bir girdisi: ekran tanımı, açılırken gelen veri, o ana
 *     kadar girilen değerler ve doğrulama hataları.
 */
export function createScreenState(screen, data) {
  const screenData = isEmptyObject(data) ? exampleData(screen.data) : { ...data };
  const state = { id: screen.id, screen, data: screenData, values: {}, errors: {}, notice: null };
  state.values = initialValues(screen, { form: {}, data: screenData });
  return state;
}

/**
 * EN: The whole form state — what FlowForm keeps in React state. Returns null
 *     when the form has no screens (the message is then shown as plain text).
 * TR: Formun tüm durumu — FlowForm bunu React state'inde tutar. Formda ekran
 *     yoksa null döner (mesaj o zaman düz metin olarak gösterilir).
 */
export function createFormState(form) {
  const parsed = parseFlow(form);
  if (!parsed.firstScreen) return null;

  return {
    form,
    parsed,
    stack: [createScreenState(parsed.firstScreen, form.data)],
    // EN: flow_action data_exchange: the first screen comes from the server
    //     (INIT). Until it arrives the local screen is shown as "loading".
    // TR: flow_action data_exchange: ilk ekran sunucudan (INIT) gelir. Gelene
    //     kadar yerel ekran "yükleniyor" halinde gösterilir.
    busy: parsed.needsInit,
    error: null,
  };
}

export function currentScreen(state) {
  return state && state.stack.length ? state.stack[state.stack.length - 1] : null;
}

/**
 * EN: The §C request that opens a server-driven form, or null when the form
 *     is static.
 * TR: Sunucu güdümlü bir formu açan §C isteği; form statikse null.
 */
export function initRequest(state) {
  if (!state || !state.parsed.needsInit) return null;
  const top = currentScreen(state);
  return { action: 'INIT', screenId: top.id, data: top.data };
}

/* ---------------------------------------------------------------------- */
/* Bindings — ${form.x}, ${data.x}, ${screen.ID.form.x}                    */
/* ---------------------------------------------------------------------- */

/**
 * EN: Builds the lookup context for a screen: its own values and data plus
 *     every earlier screen (for `${screen.GIRIS.form.ad}`).
 * TR: Bir ekranın bağlam nesnesini kurar: kendi değerleri ve verisi artı
 *     önceki tüm ekranlar (`${screen.GIRIS.form.ad}` için).
 */
export function bindingContext(state, screenState) {
  const top = screenState || currentScreen(state) || { values: {}, data: {} };
  const screens = {};
  (state?.stack || []).forEach((entry) => {
    screens[entry.id] = { form: entry.values, data: entry.data };
  });
  screens[top.id] = { form: top.values, data: top.data };
  return { form: top.values || {}, data: top.data || {}, screens };
}

function lookupPath(path, ctx) {
  const parts = String(path).split('.');
  let source;

  if (parts[0] === 'form') {
    source = ctx.form;
    parts.shift();
  } else if (parts[0] === 'data') {
    source = ctx.data;
    parts.shift();
  } else if (parts[0] === 'screen') {
    // EN: screen.<ID>.form.x / screen.<ID>.data.x
    // TR: screen.<ID>.form.x / screen.<ID>.data.x
    const target = ctx.screens?.[parts[1]];
    if (!target) return undefined;
    source = parts[2] === 'form' ? target.form : target.data;
    parts.splice(0, 3);
  } else {
    return undefined;
  }

  let value = source;
  for (let i = 0; i < parts.length; i += 1) {
    if (value == null) return undefined;
    value = value[parts[i]];
  }
  return value;
}

/**
 * EN: A SMALL, SAFE evaluator for the expressions Flow JSON puts inside
 *     `${...}` — no eval. Supports paths, 'strings', numbers, true/false/null,
 *     == != > >= < <= && || ! and parentheses. That covers `visible`,
 *     `required` and `If.condition` in practice.
 * TR: Flow JSON'un `${...}` içine koyduğu ifadeler için KÜÇÜK ve GÜVENLİ bir
 *     değerlendirici — eval yok. Yollar, 'metin', sayı, true/false/null,
 *     == != > >= < <= && || ! ve parantez desteklenir. Pratikte `visible`,
 *     `required` ve `If.condition` için yeterlidir.
 */
export function evaluate(source, ctx) {
  const s = String(source == null ? '' : source);
  let i = 0;

  const skipSpace = () => {
    while (i < s.length && /\s/.test(s[i])) i += 1;
  };

  const looseEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return a == null && b == null;
    if (typeof a !== 'object' && typeof b !== 'object') return String(a) === String(b);
    return JSON.stringify(a) === JSON.stringify(b);
  };

  function primary() {
    skipSpace();
    const c = s[i];
    if (c === undefined) return undefined;
    if (c === '(') {
      i += 1;
      const v = orExpr();
      skipSpace();
      if (s[i] === ')') i += 1;
      return v;
    }
    if (c === '!') {
      i += 1;
      return !primary();
    }
    if (c === '-') {
      i += 1;
      return -Number(primary());
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let out = '';
      while (j < s.length && s[j] !== c) {
        if (s[j] === '\\' && j + 1 < s.length) j += 1;
        out += s[j];
        j += 1;
      }
      i = j + 1;
      return out;
    }
    if (c === '$' && s[i + 1] === '{') {
      // EN: nested "${...}" — evaluate its inside with the same rules.
      // TR: iç içe "${...}" — içini aynı kurallarla çöz.
      let depth = 1;
      let k = i + 2;
      while (k < s.length && depth > 0) {
        if (s[k] === '{') depth += 1;
        else if (s[k] === '}') depth -= 1;
        k += 1;
      }
      const inner = s.slice(i + 2, k - 1);
      i = k;
      return evaluate(inner, ctx);
    }
    let m = /^[0-9]+(\.[0-9]+)?/.exec(s.slice(i));
    if (m) {
      i += m[0].length;
      return Number(m[0]);
    }
    m = /^[A-Za-z_][\w$]*(\.[\w$-]+)*/.exec(s.slice(i));
    if (m) {
      i += m[0].length;
      if (m[0] === 'true') return true;
      if (m[0] === 'false') return false;
      if (m[0] === 'null') return null;
      return lookupPath(m[0], ctx);
    }
    // EN: unknown character — skip it so the loop always advances.
    // TR: tanınmayan karakter — döngü ilerlesin diye atla.
    i += 1;
    return undefined;
  }

  function comparison() {
    let left = primary();
    for (;;) {
      skipSpace();
      let op = s.slice(i, i + 2);
      if (op === '>=' || op === '<=') i += 2;
      else if (s[i] === '>' || s[i] === '<') {
        op = s[i];
        i += 1;
      } else return left;
      const right = primary();
      let a = Number(left);
      let b = Number(right);
      const numeric = left !== '' && right !== '' && left != null && right != null && !Number.isNaN(a) && !Number.isNaN(b);
      if (!numeric) {
        a = String(left);
        b = String(right);
      }
      if (op === '>') left = a > b;
      else if (op === '>=') left = a >= b;
      else if (op === '<') left = a < b;
      else left = a <= b;
    }
  }

  function equality() {
    let left = comparison();
    for (;;) {
      skipSpace();
      const op = s.slice(i, i + 2);
      if (op !== '==' && op !== '!=') return left;
      i += 2;
      if (s[i] === '=') i += 1;
      const right = comparison();
      left = op === '==' ? looseEqual(left, right) : !looseEqual(left, right);
    }
  }

  function andExpr() {
    let left = equality();
    for (;;) {
      skipSpace();
      if (s.slice(i, i + 2) !== '&&') return left;
      i += 2;
      const right = equality();
      left = Boolean(left) && Boolean(right);
    }
  }

  function orExpr() {
    let left = andExpr();
    for (;;) {
      skipSpace();
      if (s.slice(i, i + 2) !== '||') return left;
      i += 2;
      const right = andExpr();
      left = Boolean(left) || Boolean(right);
    }
  }

  return orExpr();
}

/**
 * EN: Resolves `${...}` bindings in a string, array or object. A string that
 *     is ONE binding returns the raw value (array, boolean, object); a string
 *     with text around it gets the value embedded as text. Non-strings pass
 *     through untouched.
 * TR: Bir metin, dizi ya da nesnedeki `${...}` bağlarını çözer. TEK bir bağdan
 *     oluşan metin ham değeri döner (dizi, boolean, nesne); etrafında metin
 *     varsa değer metne gömülür. Metin olmayanlar dokunulmadan geçer.
 */
export function resolveBindings(node, ctx) {
  if (Array.isArray(node)) return node.map((item) => resolveBindings(item, ctx));
  if (node && typeof node === 'object') {
    const out = {};
    Object.keys(node).forEach((key) => {
      out[key] = resolveBindings(node[key], ctx);
    });
    return out;
  }
  if (typeof node !== 'string') return node;

  const single = /^\s*\$\{([^}]*)\}\s*$/.exec(node);
  if (single) return evaluate(single[1], ctx);
  if (node.indexOf('${') < 0) return node;

  return node.replace(/\$\{([^}]*)\}/g, (_, inner) => {
    const value = evaluate(inner, ctx);
    if (value == null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

/**
 * EN: Resolves a text-ish value to a string. Arrays (RichText / TextBody with
 *     several lines) are joined with newlines.
 * TR: Metin benzeri bir değeri metne çevirir. Diziler (birden çok satırlı
 *     RichText / TextBody) satır sonuyla birleştirilir.
 */
export function resolveText(value, ctx) {
  if (Array.isArray(value)) return value.map((v) => resolveText(v, ctx)).join('\n');
  const resolved = resolveBindings(value, ctx);
  return resolved == null ? '' : String(resolved);
}

/**
 * EN: visible / enabled / required: a boolean, a binding or a condition.
 * TR: visible / enabled / required: boolean, bağ ya da koşul.
 */
export function resolveBool(value, ctx, fallback) {
  if (value === undefined || value === null) return fallback;
  // EN: `evaluate` understands both "${form.x}" and a bare "form.x == 'a'".
  // TR: `evaluate` hem "${form.x}" hem de çıplak "form.x == 'a'" biçimini anlar.
  if (typeof value === 'string') return Boolean(evaluate(value, ctx));
  return Boolean(value);
}

/* ---------------------------------------------------------------------- */
/* Walking a screen                                                        */
/* ---------------------------------------------------------------------- */

/**
 * EN: Flattens a screen's layout into the list of things to draw, honouring
 *     Form / If / Switch and `visible`. Each item is { node, formDef } where
 *     formDef is the enclosing Form (for its error-messages). The Footer is
 *     returned separately because it is drawn outside the scroll area.
 *     Unknown component types are KEPT (with `unknown: true`) so the UI can
 *     show them as text instead of silently dropping them.
 * TR: Bir ekranın yerleşimini çizilecekler listesine düzleştirir; Form / If /
 *     Switch ve `visible` gözetilir. Her öğe { node, formDef } biçimindedir;
 *     formDef onu saran Form'dur (error-messages için). Footer kaydırma
 *     alanının dışında çizildiği için ayrı döner. Bilinmeyen bileşen tipleri
 *     DÜŞÜRÜLMEZ (`unknown: true` ile tutulur) ki arayüz sessizce yutmak
 *     yerine metin olarak gösterebilsin.
 */
export function collectComponents(screen, ctx) {
  const items = [];
  let footer = null;

  function walk(node, formDef) {
    if (!node || typeof node !== 'object') return;
    if (!resolveBool(node.visible, ctx, true)) return;

    switch (node.type) {
      case 'Form':
        (node.children || []).forEach((child) => walk(child, node));
        return;
      case 'If': {
        const branch = resolveBool(node.condition, ctx, false) ? node.then : node.else;
        (branch || []).forEach((child) => walk(child, formDef));
        return;
      }
      case 'Switch': {
        const cases = node.cases || {};
        const key = String(resolveBindings(node.value, ctx));
        (cases[key] || cases.default || []).forEach((child) => walk(child, formDef));
        return;
      }
      case 'Footer':
        footer = node;
        return;
      default:
        items.push({
          node,
          formDef,
          unknown: INPUT_TYPES.indexOf(node.type) < 0 && TEXT_TYPES.indexOf(node.type) < 0,
        });
    }
  }

  ((screen?.layout && screen.layout.children) || []).forEach((child) => walk(child, null));
  return { items, footer };
}

/**
 * EN: The option list of a Dropdown / RadioButtonsGroup / CheckboxGroup —
 *     either inline or bound to `${data.x}`.
 * TR: Dropdown / RadioButtonsGroup / CheckboxGroup seçenek listesi — ya
 *     satır içi ya da `${data.x}` ile bağlı.
 */
export function dataSource(node, ctx) {
  const source = resolveBindings(node?.['data-source'], ctx);
  return Array.isArray(source) ? source : [];
}

/**
 * EN: Starting values: Form.init-values, component init-value, and OptIn
 *     defaulting to false so the key never disappears from the payload.
 * TR: Başlangıç değerleri: Form.init-values, bileşen init-value ve OptIn'in
 *     false ile başlaması — anahtar payload'dan kaybolmasın diye.
 */
function initialValues(screen, ctx) {
  const values = {};

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Form') {
      const init = resolveBindings(node['init-values'], ctx) || {};
      Object.keys(init).forEach((key) => {
        if (values[key] === undefined) values[key] = init[key];
      });
    }
    if (node.name && INPUT_TYPES.indexOf(node.type) >= 0) {
      if (node['init-value'] !== undefined && values[node.name] === undefined) {
        values[node.name] = resolveBindings(node['init-value'], ctx);
      }
      if (node.type === 'OptIn' && values[node.name] === undefined) values[node.name] = false;
    }
    ['children', 'then', 'else'].forEach((key) => (node[key] || []).forEach(walk));
    Object.keys(node.cases || {}).forEach((key) => (node.cases[key] || []).forEach(walk));
  }

  ((screen?.layout && screen.layout.children) || []).forEach(walk);
  return values;
}

/* ---------------------------------------------------------------------- */
/* Validation                                                              */
/* ---------------------------------------------------------------------- */

function format(template, n) {
  return String(template).replace('{n}', n);
}

function isBlank(value, node) {
  if (node?.type === 'OptIn') return !value;
  return value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
}

/**
 * EN: Validates the visible, enabled fields of a screen. Returns
 *     { valid, errors } where errors maps field name → message. A Form's
 *     `error-messages[name]` (or the component's `error-message`) overrides
 *     the default text.
 * TR: Bir ekranın görünür ve etkin alanlarını doğrular. { valid, errors }
 *     döner; errors alan adı → mesaj eşlemesidir. Form'un
 *     `error-messages[name]` değeri (ya da bileşenin `error-message`'ı)
 *     varsayılan metni ezer.
 */
export function validateScreen(screen, values, data, ctxOverride) {
  const ctx = ctxOverride || { form: values || {}, data: data || {}, screens: {} };
  const { items } = collectComponents(screen, ctx);
  const errors = {};

  items.forEach(({ node, formDef }) => {
    const name = node.name;
    if (!name || INPUT_TYPES.indexOf(node.type) < 0) return;
    if (!resolveBool(node.enabled, ctx, true)) return;

    const value = ctx.form[name];
    const blank = isBlank(value, node);
    const custom = (formDef && formDef['error-messages'] && formDef['error-messages'][name]) || node['error-message'];
    let error = null;

    if (resolveBool(node.required, ctx, false) && blank) {
      error = FLOW_TEXT.required;
    } else if (
      (node.type === 'CheckboxGroup' || node.type === 'ChipsSelector') &&
      Number(node['min-selected-items']) > 0 &&
      (blank || value.length < Number(node['min-selected-items']))
    ) {
      error = format(FLOW_TEXT.minSelected, node['min-selected-items']);
    } else if (!blank) {
      const text = typeof value === 'string' ? value.trim() : value;
      const inputType = node['input-type'];

      if (node.type === 'TextInput' || node.type === 'TextArea') {
        const length = String(text).length;
        const max = node['max-chars'] || node['max-length'];
        if (inputType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) error = FLOW_TEXT.invalidEmail;
        else if (inputType === 'phone' && !/^\+?[0-9 ()./-]{6,20}$/.test(text)) error = FLOW_TEXT.invalidPhone;
        else if (inputType === 'number' && Number.isNaN(Number(text))) error = FLOW_TEXT.invalidNumber;
        else if (inputType === 'passcode' && !/^\d+$/.test(text)) error = FLOW_TEXT.invalidNumber;
        else if (node['min-chars'] && length < Number(node['min-chars'])) error = format(FLOW_TEXT.minChars, node['min-chars']);
        else if (max && length > Number(max)) error = format(FLOW_TEXT.maxChars, max);
        else if (node.pattern) {
          try {
            if (!new RegExp(node.pattern).test(text)) error = FLOW_TEXT.required;
          } catch (patternError) {
            // EN: a broken pattern must not block the user.
            // TR: bozuk bir desen kullanıcıyı engellememeli.
          }
        }
      } else if (node.type === 'CheckboxGroup' || node.type === 'ChipsSelector') {
        if (node['max-selected-items'] && value.length > Number(node['max-selected-items'])) {
          error = format(FLOW_TEXT.maxSelected, node['max-selected-items']);
        }
      } else if (node.type === 'DatePicker' || node.type === 'CalendarPicker') {
        if (!toIsoDate(value)) error = FLOW_TEXT.invalidDate;
      }
    }

    if (error) errors[name] = custom || error;
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * EN: Date helpers. Meta's DatePicker carries a millisecond timestamp (as a
 *     string); this sample lets the user type YYYY-MM-DD and converts.
 * TR: Tarih yardımcıları. Meta'nın DatePicker'ı ms zaman damgası (metin)
 *     taşır; bu örnek kullanıcıya YYYY-MM-DD yazdırıp dönüştürür.
 */
export function toIsoDate(value) {
  if (value == null || value === '') return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const d = new Date(`${text}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? '' : text;
  }
  const n = Number(text);
  if (!Number.isNaN(n)) {
    const d = new Date(n < 1e11 ? n * 1000 : n);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return '';
}

export function fromIsoDate(isoDate, type) {
  if (!isoDate) return undefined;
  if (type === 'DatePicker') return String(new Date(`${isoDate}T00:00:00Z`).getTime());
  return isoDate;
}

/* ---------------------------------------------------------------------- */
/* Actions                                                                 */
/* ---------------------------------------------------------------------- */

function replaceTop(stack, entry) {
  return [...stack.slice(0, -1), entry];
}

/**
 * EN: Every value from every visited screen, later screens winning.
 * TR: Ziyaret edilen tüm ekranların değerleri; sonraki ekran öncekini ezer.
 */
export function allValues(state) {
  const out = {};
  (state?.stack || []).forEach((entry) => Object.assign(out, entry.values));
  return out;
}

/**
 * EN: Stores the values the user typed into the current screen and clears
 *     the errors of the fields that changed.
 * TR: Kullanıcının geçerli ekrana girdiği değerleri saklar ve değişen
 *     alanların hatalarını temizler.
 */
export function setValues(state, values) {
  const top = currentScreen(state);
  if (!top) return state;
  const errors = { ...top.errors };
  Object.keys(values || {}).forEach((key) => delete errors[key]);
  return {
    ...state,
    stack: replaceTop(state.stack, { ...top, values: { ...top.values, ...(values || {}) }, errors }),
  };
}

/**
 * EN: Runs a Footer (or link) action against the current screen. Returns
 *     { kind, state, ... }:
 *       navigate      → state has the next screen pushed; `nextScreen`, `payload`
 *       complete      → `response` = resolved payload, or all values when empty
 *       data_exchange → `payload` + `screenId`; state is busy; caller sends §C
 *       update_data   → state's data merged (no network)
 *       error         → unknown target screen
 *     Validation is NOT done here — see submitScreen.
 * TR: Bir Footer (ya da bağlantı) eylemini geçerli ekrana uygular.
 *     { kind, state, ... } döner:
 *       navigate      → state'e sonraki ekran eklenmiştir; `nextScreen`, `payload`
 *       complete      → `response` = çözülmüş payload; boşsa tüm değerler
 *       data_exchange → `payload` + `screenId`; state meşgul; çağıran §C gönderir
 *       update_data   → state'in verisi birleştirilir (ağ yok)
 *       error         → hedef ekran yok
 *     Doğrulama burada YAPILMAZ — bkz. submitScreen.
 */
export function applyAction(state, action, values) {
  const withValues = values ? setValues(state, values) : state;
  const top = currentScreen(withValues);
  if (!top || !action) return { kind: 'noop', state: withValues };

  const ctx = bindingContext(withValues, top);
  const payload = resolveBindings(action.payload, ctx);

  switch (action.name) {
    case 'navigate': {
      const targetId = action.next && action.next.name;
      const target = withValues.parsed.screens[targetId];
      if (!target) {
        return { kind: 'error', message: `${FLOW_TEXT.unknownScreen} (${targetId})`, state: withValues };
      }
      const next = createScreenState(target, payload);
      return {
        kind: 'navigate',
        nextScreen: target.id,
        payload: payload || {},
        state: { ...withValues, stack: [...withValues.stack, next], error: null },
      };
    }
    case 'complete': {
      const response = isEmptyObject(payload) ? allValues(withValues) : payload;
      return { kind: 'complete', response, state: withValues };
    }
    case 'data_exchange':
      return {
        kind: 'data_exchange',
        screenId: top.id,
        payload: payload || {},
        state: { ...withValues, busy: true, error: null },
      };
    case 'update_data': {
      const updated = { ...top, data: { ...top.data, ...(payload || {}) } };
      return { kind: 'update_data', state: { ...withValues, stack: replaceTop(withValues.stack, updated) } };
    }
    case 'open_url':
      return { kind: 'open_url', url: resolveBindings(action.url, ctx), state: withValues };
    default:
      return { kind: 'unsupported', state: withValues };
  }
}

/**
 * EN: What the Footer button does: store values, validate, then run the
 *     Footer's on-click-action. `kind: 'invalid'` means errors are now in the
 *     screen state and nothing else happened.
 * TR: Footer butonunun yaptığı şey: değerleri sakla, doğrula, sonra Footer'ın
 *     on-click-action'ını çalıştır. `kind: 'invalid'` hataların ekran
 *     durumuna yazıldığı ve başka bir şey olmadığı anlamına gelir.
 */
export function submitScreen(state, values) {
  const withValues = setValues(state, values || {});
  const top = currentScreen(withValues);
  if (!top) return { kind: 'noop', state: withValues };

  const ctx = bindingContext(withValues, top);
  const { footer } = collectComponents(top.screen, ctx);
  const { valid, errors } = validateScreen(top.screen, top.values, top.data, ctx);

  if (!valid) {
    return { kind: 'invalid', errors, state: { ...withValues, stack: replaceTop(withValues.stack, { ...top, errors }) } };
  }
  if (!footer || !footer['on-click-action']) return { kind: 'noop', state: withValues };
  return applyAction(withValues, footer['on-click-action']);
}

/**
 * EN: The back button. On the first screen the form closes; otherwise the
 *     previous screen is restored with its values. If that screen asks for
 *     `refresh_on_back` and the flow is server-driven, a §C BACK request is
 *     returned instead of the screen (the caller sends it and applies the
 *     response).
 * TR: Geri butonu. İlk ekranda form kapanır; yoksa önceki ekran değerleriyle
 *     geri gelir. O ekran `refresh_on_back` istiyorsa ve akış sunucu
 *     güdümlüyse ekran yerine §C BACK isteği döner (çağıran gönderir ve cevabı
 *     uygular).
 */
export function goBack(state) {
  if (!state || state.busy) return { kind: 'noop', state };
  if (state.stack.length <= 1) return { kind: 'close', state };

  const stack = state.stack.slice(0, -1);
  const top = { ...stack[stack.length - 1], errors: {}, notice: null };
  const next = { ...state, stack: replaceTop(stack, top), error: null };

  if (state.parsed.serverDriven && top.screen.refresh_on_back) {
    return { kind: 'data_exchange', action: 'BACK', screenId: top.id, payload: top.data, state: { ...next, busy: true } };
  }
  return { kind: 'screen', state: next };
}

/* ---------------------------------------------------------------------- */
/* §B — the reply body                                                     */
/* ---------------------------------------------------------------------- */

/**
 * EN: Builds the §B body that goes to POST /custom/:key/messages:
 *       { user:{id}, message:{ id, ts, type:"form", form:{ token, name, version, response } } }
 *     `form.token` is mandatory on the server side (otherwise the message is
 *     dead-lettered), so it is copied verbatim from the incoming form.
 * TR: POST /custom/:key/messages'a giden §B gövdesini kurar:
 *       { user:{id}, message:{ id, ts, type:"form", form:{ token, name, version, response } } }
 *     `form.token` sunucu tarafında ZORUNLUDUR (yoksa mesaj DLQ'ya düşer); bu
 *     yüzden gelen formdan olduğu gibi kopyalanır.
 */
export function buildFormReply(form, response, options = {}) {
  const user = compact({ id: options.userId, name: options.displayName });
  const message = compact({
    id: options.messageId,
    ts: options.ts,
    type: 'form',
    form: compact({
      token: form?.token,
      name: form?.name,
      version: form?.version,
      response: response || {},
    }),
  });
  return { user, message };
}

/* ---------------------------------------------------------------------- */
/* §C — server-driven screens                                              */
/* ---------------------------------------------------------------------- */

/**
 * EN: Builds the §C body for POST /custom/:key/flows/exchange:
 *       { user:{id}, flow:{ token, name, version, action, screen, data } }
 *     `action` is "INIT" | "data_exchange" | "BACK" (default data_exchange).
 * TR: POST /custom/:key/flows/exchange için §C gövdesini kurar:
 *       { user:{id}, flow:{ token, name, version, action, screen, data } }
 *     `action` "INIT" | "data_exchange" | "BACK" (varsayılan data_exchange).
 */
export function buildExchangeBody(userId, form, action, screenId, data) {
  return {
    user: { id: userId },
    flow: compact({
      token: form?.token,
      name: form?.name,
      version: form?.version,
      action: action || 'data_exchange',
      screen: screenId,
      data: data || {},
    }),
  };
}

/**
 * EN: Turns any exchange failure into one message for the user. The server
 *     answers JSON ({ status, error:{ code, message } }) on its own errors but
 *     a proxy in front of it may answer 502 with an HTML page — both are
 *     tolerated.
 * TR: Herhangi bir exchange hatasını kullanıcı için tek bir mesaja çevirir.
 *     Sunucu kendi hatalarında JSON ({ status, error:{ code, message } }) döner
 *     ama önündeki bir vekil 502 ile HTML sayfası dönebilir — ikisi de
 *     tolere edilir.
 */
export function describeExchangeError(status, body) {
  let parsed = body;
  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body);
    } catch (parseError) {
      parsed = null;
    }
  }
  const message = parsed && parsed.error && parsed.error.message;
  if (message) return String(message);
  const code = parsed && parsed.error && parsed.error.code;
  if (code) return `${FLOW_TEXT.serverError} (${code})`;
  return status ? `${FLOW_TEXT.serverError} (HTTP ${status})` : FLOW_TEXT.serverError;
}

/**
 * EN: Applies a successful §C answer `{ version, screen, data }`:
 *       screen "SUCCESS" (or data.extension_message_response present)
 *         → { kind:'complete', response } — send §B and close
 *       same screen as the current one → its data is refreshed, values kept
 *       another known screen → pushed on the stack with the data
 *       unknown screen → { kind:'error' }
 *     `data.error_message` becomes a notice above the screen. Pass
 *     { reset: true } for the INIT answer so the placeholder screen is
 *     replaced rather than stacked upon.
 * TR: Başarılı bir §C cevabını `{ version, screen, data }` uygular:
 *       ekran "SUCCESS" (ya da data.extension_message_response varsa)
 *         → { kind:'complete', response } — §B gönderilir, form kapanır
 *       geçerli ekranla aynı ekran → verisi tazelenir, değerler korunur
 *       bilinen başka ekran → veriyle yığına eklenir
 *       bilinmeyen ekran → { kind:'error' }
 *     `data.error_message` ekranın üstünde uyarı olur. INIT cevabı için
 *     { reset: true } geçin ki yer tutucu ekran üstüne eklenmek yerine
 *     değiştirilsin.
 */
export function applyExchangeResponse(state, res, options = {}) {
  const data = (res && res.data) || {};
  const base = { ...state, busy: false, error: null };

  if (!res || !res.screen) {
    return { kind: 'error', message: FLOW_TEXT.serverError, state: { ...base, error: { message: FLOW_TEXT.serverError } } };
  }

  if (res.screen === 'SUCCESS' || data.extension_message_response) {
    const params = (data.extension_message_response && data.extension_message_response.params) || {};
    return { kind: 'complete', response: params, state: base };
  }

  const notice = data.error_message ? String(data.error_message) : null;
  let stack = options.reset ? [] : state.stack;
  const top = stack[stack.length - 1];

  if (top && res.screen === top.id) {
    stack = replaceTop(stack, { ...top, data: { ...top.data, ...data }, errors: {}, notice });
  } else {
    const target = state.parsed.screens[res.screen];
    if (!target) {
      const message = `${FLOW_TEXT.unknownScreen} (${res.screen})`;
      return { kind: 'error', message, state: { ...base, error: { message } } };
    }
    const entry = createScreenState(target, data);
    stack = [...stack, { ...entry, notice }];
  }

  return { kind: 'screen', state: { ...base, stack } };
}

/**
 * EN: Marks the form as failed with a retry description; FlowForm shows the
 *     message and a Retry button that re-sends `retry`.
 * TR: Formu tekrar-dene bilgisiyle hatalı işaretler; FlowForm mesajı ve
 *     `retry`'ı yeniden gönderen bir Tekrar dene butonu gösterir.
 */
export function setExchangeError(state, message, retry) {
  return { ...state, busy: false, error: { message: message || FLOW_TEXT.serverError, retry: retry || null } };
}

/* ---------------------------------------------------------------------- */
/* Summaries                                                               */
/* ---------------------------------------------------------------------- */

/**
 * EN: Field labels and option titles of every visited screen, keyed by field
 *     name — used to print a readable summary ("Name: Ahmet") instead of raw
 *     keys after the form is sent.
 * TR: Ziyaret edilen tüm ekranların alan etiketleri ve seçenek başlıkları,
 *     alan adına göre — form gönderildikten sonra ham anahtar yerine okunur
 *     bir özet ("Ad: Ahmet") basmak için.
 */
export function fieldInfo(state) {
  const out = {};
  (state?.stack || []).forEach((entry) => {
    const ctx = bindingContext(state, entry);
    collectComponents(entry.screen, ctx).items.forEach(({ node }) => {
      if (!node.name || INPUT_TYPES.indexOf(node.type) < 0) return;
      const options = {};
      dataSource(node, ctx).forEach((option) => {
        options[String(option.id)] = resolveText(option.title, ctx);
      });
      out[node.name] = {
        label: typeof node.label === 'string' ? resolveText(node.label, ctx) : resolveText(node.title, ctx),
        type: node.type,
        options,
      };
    });
  });
  return out;
}

function valueText(value, info) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? FLOW_TEXT.yes : FLOW_TEXT.no;
  if (Array.isArray(value)) return value.map((v) => valueText(v, info)).join(', ');
  if (info?.options && info.options[String(value)] != null) return info.options[String(value)];
  if (info?.type === 'DatePicker' && /^\d{10,13}$/.test(String(value))) return toIsoDate(value) || String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * EN: The text of the "Form sent" bubble: a headline plus one line per field.
 * TR: "Form gönderildi" balonunun metni: başlık artı alan başına bir satır.
 */
export function summarizeResponse(response, info) {
  const lines = [FLOW_TEXT.sent];
  Object.keys(response || {}).forEach((key) => {
    if (key === 'flow_token') return;
    const meta = (info && info[key]) || null;
    lines.push(`${(meta && meta.label) || key}: ${valueText(response[key], meta)}`);
  });
  return lines.join('\n');
}

/* ---------------------------------------------------------------------- */
/* Small helpers                                                           */
/* ---------------------------------------------------------------------- */

export function isEmptyObject(value) {
  return !value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length === 0;
}

/**
 * EN: A screen's `data` schema carries { type, __example__ } entries; when
 *     nothing real was passed we show the examples so bindings do not print
 *     "undefined".
 * TR: Ekranın `data` şeması { type, __example__ } girdileri taşır; gerçek
 *     veri gelmediyse bağlar "undefined" basmasın diye örnekler gösterilir.
 */
export function exampleData(schema) {
  const out = {};
  Object.keys(schema || {}).forEach((key) => {
    const entry = schema[key];
    out[key] = entry && typeof entry === 'object' && !Array.isArray(entry) && '__example__' in entry ? entry.__example__ : entry;
  });
  return out;
}

function compact(object) {
  const out = {};
  Object.keys(object).forEach((key) => {
    if (object[key] !== undefined) out[key] = object[key];
  });
  return out;
}
