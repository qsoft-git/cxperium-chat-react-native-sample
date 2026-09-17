/**
 * EN: Unit tests for the pure form engine. No React, no network — every case
 *     drives the engine with plain objects and checks the state / bodies it
 *     produces against the custom-channel form contract (§A, §B, §C).
 * TR: Saf form motorunun birim testleri. React yok, ağ yok — her senaryo motoru
 *     düz nesnelerle sürer ve ürettiği durumu / gövdeleri custom kanal form
 *     sözleşmesiyle (§A, §B, §C) karşılaştırır.
 */
import {
  FLOW_TEXT,
  applyAction,
  applyExchangeResponse,
  bindingContext,
  buildExchangeBody,
  buildFormReply,
  collectComponents,
  createFormState,
  currentScreen,
  describeExchangeError,
  evaluate,
  fieldInfo,
  goBack,
  initRequest,
  parseFlow,
  resolveBindings,
  resolveText,
  submitScreen,
  summarizeResponse,
  validateScreen,
} from '../src/services/flowEngine';

/* ---------------- fixtures (mirrors dev-tools/custom-e2e/flows) ---------------- */

const STATIC_SCREENS = [
  {
    id: 'GIRIS',
    title: 'Iletisim',
    layout: {
      type: 'SingleColumnLayout',
      children: [
        { type: 'TextHeading', text: 'Kisa bir form' },
        {
          type: 'Form',
          name: 'form',
          children: [
            { type: 'TextInput', name: 'ad', label: 'Adiniz', 'input-type': 'text', required: true },
            { type: 'TextInput', name: 'eposta', label: 'E-posta', 'input-type': 'email', required: true },
            {
              type: 'Footer',
              label: 'Devam',
              'on-click-action': {
                name: 'navigate',
                next: { type: 'screen', name: 'SONUC' },
                payload: { ad: '${form.ad}', eposta: '${form.eposta}' },
              },
            },
          ],
        },
      ],
    },
  },
  {
    id: 'SONUC',
    title: 'Ozet',
    terminal: true,
    layout: {
      type: 'SingleColumnLayout',
      children: [
        { type: 'TextBody', text: 'Tesekkurler ${data.ad}.' },
        {
          type: 'Form',
          name: 'detay',
          children: [
            { type: 'TextArea', name: 'mesaj', label: 'Mesajiniz', required: true },
            {
              type: 'Footer',
              label: 'Gonder',
              'on-click-action': {
                name: 'complete',
                payload: { ad: '${screen.GIRIS.form.ad}', eposta: '${screen.GIRIS.form.eposta}', mesaj: '${form.mesaj}' },
              },
            },
          ],
        },
      ],
    },
  },
];

const EXCHANGE_SCREENS = [
  {
    id: 'GIRIS',
    title: 'Bilgi',
    data: {},
    layout: {
      type: 'SingleColumnLayout',
      children: [
        { type: 'TextHeading', text: 'Bir sey yazin, sunucuya gonderelim' },
        {
          type: 'Form',
          name: 'form',
          children: [
            { type: 'TextInput', name: 'girdi', label: 'Girdiniz', 'input-type': 'text', required: true },
            { type: 'Footer', label: 'Gonder', 'on-click-action': { name: 'data_exchange', payload: { girdi: '${form.girdi}' } } },
          ],
        },
      ],
    },
  },
  {
    id: 'SONUC',
    title: 'Sonuc',
    terminal: true,
    data: {},
    layout: {
      type: 'SingleColumnLayout',
      children: [
        { type: 'TextBody', text: 'Sunucudan gelen: ${data.mesaj}' },
        { type: 'Footer', label: 'Bitir', 'on-click-action': { name: 'complete', payload: {} } },
      ],
    },
  },
];

function formMessage(screens, overrides = {}) {
  // EN: §A — the `form` object of an incoming `type:"form"` message.
  // TR: §A — gelen `type:"form"` mesajının `form` nesnesi.
  return {
    token: 'MyBot.Dialogs.KayitDialog&u_42',
    id: '66f0',
    name: 'kayit_formu',
    version: 3,
    cta: 'Formu Aç',
    action: 'navigate',
    screen: 'GIRIS',
    data: {},
    flowVersion: '7.0',
    routingModel: null,
    screens,
    ...overrides,
  };
}

/* ---------------- §A parse ---------------- */

describe('parseFlow', () => {
  test('indexes screens, picks the first screen and detects server-driven flows', () => {
    const staticFlow = parseFlow(formMessage(STATIC_SCREENS));
    expect(Object.keys(staticFlow.screens)).toEqual(['GIRIS', 'SONUC']);
    expect(staticFlow.firstScreen.id).toBe('GIRIS');
    expect(staticFlow.serverDriven).toBe(false);
    expect(staticFlow.needsInit).toBe(false);

    const exchangeFlow = parseFlow(formMessage(EXCHANGE_SCREENS));
    expect(exchangeFlow.serverDriven).toBe(true);
    expect(exchangeFlow.needsInit).toBe(false);

    const initFlow = parseFlow(formMessage(EXCHANGE_SCREENS, { action: 'data_exchange' }));
    expect(initFlow.needsInit).toBe(true);
  });

  test('honours form.screen as the starting screen and tolerates missing screens', () => {
    expect(parseFlow(formMessage(STATIC_SCREENS, { screen: 'SONUC' })).firstScreen.id).toBe('SONUC');
    expect(parseFlow({ token: 't' }).firstScreen).toBeNull();
    expect(createFormState({ token: 't', screens: [] })).toBeNull();
  });
});

/* ---------------- bindings ---------------- */

describe('resolveBindings', () => {
  const ctx = { form: { ad: 'Ahmet', kvkk: true, iller: ['34', '06'] }, data: { mesaj: 'selam', n: 3 }, screens: {} };

  test('a lone ${form.x} / ${data.x} returns the raw value', () => {
    expect(resolveBindings('${form.ad}', ctx)).toBe('Ahmet');
    expect(resolveBindings('${form.kvkk}', ctx)).toBe(true);
    expect(resolveBindings('${form.iller}', ctx)).toEqual(['34', '06']);
    expect(resolveBindings('${data.n}', ctx)).toBe(3);
  });

  test('bindings inside text are embedded, missing ones become empty', () => {
    expect(resolveBindings('Merhaba ${form.ad}, ${data.mesaj}!', ctx)).toBe('Merhaba Ahmet, selam!');
    expect(resolveBindings('x=${form.yok}', ctx)).toBe('x=');
    expect(resolveText(['a ${form.ad}', 'b ${data.mesaj}'], ctx)).toBe('a Ahmet\nb selam');
  });

  test('objects and arrays are resolved recursively; non-strings pass through', () => {
    expect(resolveBindings({ ad: '${form.ad}', list: ['${data.n}', 'sabit'], sayi: 7, bos: null }, ctx)).toEqual({
      ad: 'Ahmet',
      list: [3, 'sabit'],
      sayi: 7,
      bos: null,
    });
  });

  test('screen.<ID>.form.x reaches values of earlier screens', () => {
    const state = createFormState(formMessage(STATIC_SCREENS));
    const moved = submitScreen(state, { ad: 'Ayse', eposta: 'a@b.co' }).state;
    const context = bindingContext(moved, currentScreen(moved));
    expect(resolveBindings('${screen.GIRIS.form.ad}', context)).toBe('Ayse');
  });

  test('small expressions work for visible / If conditions', () => {
    expect(evaluate("form.ad == 'Ahmet' && data.n > 2", ctx)).toBe(true);
    expect(evaluate('!form.kvkk', ctx)).toBe(false);
    expect(evaluate("(form.ad != 'Ahmet') || data.mesaj == 'selam'", ctx)).toBe(true);
  });
});

/* ---------------- static flow end-to-end ---------------- */

describe('static flow (navigate → complete)', () => {
  test('produces the merged response across two screens', () => {
    const form = formMessage(STATIC_SCREENS);
    const state = createFormState(form);
    expect(state.busy).toBe(false);
    expect(currentScreen(state).id).toBe('GIRIS');

    const step1 = submitScreen(state, { ad: 'Ahmet', eposta: 'a@b.c' });
    expect(step1.kind).toBe('navigate');
    expect(step1.nextScreen).toBe('SONUC');
    expect(step1.payload).toEqual({ ad: 'Ahmet', eposta: 'a@b.c' });
    expect(step1.state.stack).toHaveLength(2);
    expect(currentScreen(step1.state).data).toEqual({ ad: 'Ahmet', eposta: 'a@b.c' });

    // EN: the next screen sees the payload through ${data.x}
    // TR: sonraki ekran payload'ı ${data.x} ile görür
    const ctx = bindingContext(step1.state, currentScreen(step1.state));
    const { items, footer } = collectComponents(currentScreen(step1.state).screen, ctx);
    expect(resolveText(items[0].node.text, ctx)).toBe('Tesekkurler Ahmet.');
    expect(footer.label).toBe('Gonder');

    const step2 = submitScreen(step1.state, { mesaj: 'Merhaba' });
    expect(step2.kind).toBe('complete');
    expect(step2.response).toEqual({ ad: 'Ahmet', eposta: 'a@b.c', mesaj: 'Merhaba' });
  });

  test('complete with an empty payload falls back to every typed value', () => {
    const screens = [
      {
        id: 'TEK',
        title: 'Tek',
        terminal: true,
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextInput', name: 'icerik', label: 'Icerik' },
            { type: 'OptIn', name: 'kvkk', label: 'Kabul' },
            { type: 'Footer', label: 'Gonder', 'on-click-action': { name: 'complete', payload: {} } },
          ],
        },
      },
    ];
    const result = submitScreen(createFormState(formMessage(screens)), { icerik: 'x' });
    expect(result.kind).toBe('complete');
    // EN: untouched OptIn is false, not missing
    // TR: dokunulmamış OptIn eksik değil, false
    expect(result.response).toEqual({ icerik: 'x', kvkk: false });
  });

  test('navigate to an unknown screen is reported, not thrown', () => {
    const state = createFormState(formMessage(STATIC_SCREENS));
    const result = applyAction(state, { name: 'navigate', next: { name: 'YOK' } }, { ad: 'a', eposta: 'a@b.c' });
    expect(result.kind).toBe('error');
    expect(result.message).toContain('YOK');
  });
});

/* ---------------- validation ---------------- */

describe('validateScreen', () => {
  test('required fields block the footer and errors land in the screen state', () => {
    const state = createFormState(formMessage(STATIC_SCREENS));
    const result = submitScreen(state, {});
    expect(result.kind).toBe('invalid');
    expect(result.errors).toEqual({ ad: FLOW_TEXT.required, eposta: FLOW_TEXT.required });
    expect(currentScreen(result.state).errors.ad).toBe(FLOW_TEXT.required);
    expect(result.state.stack).toHaveLength(1);
  });

  test('input-type rules and custom error messages', () => {
    const screen = STATIC_SCREENS[0];
    expect(validateScreen(screen, { ad: 'Ali', eposta: 'not-an-email' }).errors).toEqual({ eposta: FLOW_TEXT.invalidEmail });
    expect(validateScreen(screen, { ad: 'Ali', eposta: 'a@b.co' }).valid).toBe(true);

    const custom = {
      id: 'X',
      layout: {
        children: [
          {
            type: 'Form',
            name: 'f',
            'error-messages': { tel: 'Telefon gerekli' },
            children: [
              { type: 'TextInput', name: 'tel', 'input-type': 'phone', required: true },
              { type: 'CheckboxGroup', name: 'ilgi', 'min-selected-items': 2, 'data-source': [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] },
              { type: 'DatePicker', name: 'tarih', label: 'Tarih' },
            ],
          },
        ],
      },
    };
    expect(validateScreen(custom, { ilgi: ['a'], tarih: 'dun' }).errors).toEqual({
      tel: 'Telefon gerekli',
      ilgi: FLOW_TEXT.minSelected.replace('{n}', 2),
      tarih: FLOW_TEXT.invalidDate,
    });
    expect(validateScreen(custom, { tel: '+90 555 000 00 00', ilgi: ['a', 'b'], tarih: '2026-09-17' }).valid).toBe(true);
  });

  test('hidden and disabled fields are not validated', () => {
    const screen = {
      id: 'X',
      layout: {
        children: [
          { type: 'TextInput', name: 'gizli', required: true, visible: false },
          { type: 'TextInput', name: 'pasif', required: true, enabled: false },
          { type: 'TextInput', name: 'kosullu', required: true, visible: "${data.mod == 'tam'}" },
        ],
      },
    };
    expect(validateScreen(screen, {}, { mod: 'kisa' }).valid).toBe(true);
    expect(validateScreen(screen, {}, { mod: 'tam' }).errors).toEqual({ kosullu: FLOW_TEXT.required });
  });
});

/* ---------------- unknown components ---------------- */

describe('unknown component types', () => {
  test('are kept for display and never break validation or completion', () => {
    const screens = [
      {
        id: 'TEK',
        title: 'Tek',
        terminal: true,
        layout: {
          children: [
            { type: 'PhotoPicker', name: 'foto', label: 'Fotograf', required: true },
            { type: 'SomeFutureWidget', text: 'ileride' },
            { type: 'TextInput', name: 'ad', label: 'Ad' },
            { type: 'Footer', label: 'Bitir', 'on-click-action': { name: 'complete', payload: { ad: '${form.ad}' } } },
          ],
        },
      },
    ];
    const state = createFormState(formMessage(screens));
    const { items } = collectComponents(currentScreen(state).screen, bindingContext(state));
    expect(items.map((i) => i.node.type)).toEqual(['PhotoPicker', 'SomeFutureWidget', 'TextInput']);
    expect(items[0].unknown).toBe(true);
    expect(items[2].unknown).toBe(false);

    const result = submitScreen(state, { ad: 'Ali' });
    expect(result.kind).toBe('complete');
    expect(result.response).toEqual({ ad: 'Ali' });
  });
});

/* ---------------- §B reply body ---------------- */

describe('buildFormReply (§B)', () => {
  test('matches the contract shape exactly', () => {
    const form = formMessage(STATIC_SCREENS);
    const body = buildFormReply(form, { ad: 'Ahmet', email: 'a@b.c', kvkk: true }, { userId: 'u_42', messageId: 'm_1', ts: 1789000000 });
    expect(body).toEqual({
      user: { id: 'u_42' },
      message: {
        id: 'm_1',
        ts: 1789000000,
        type: 'form',
        form: {
          token: 'MyBot.Dialogs.KayitDialog&u_42',
          name: 'kayit_formu',
          version: 3,
          response: { ad: 'Ahmet', email: 'a@b.c', kvkk: true },
        },
      },
    });
  });

  test('token is copied verbatim and optional fields are omitted, never null', () => {
    const body = buildFormReply({ token: 'T&u' }, null, { userId: 'u' });
    expect(body.message.form).toEqual({ token: 'T&u', response: {} });
    expect(Object.keys(body.message)).toEqual(['type', 'form']);
  });
});

/* ---------------- §C exchange ---------------- */

describe('data_exchange (§C)', () => {
  const form = formMessage(EXCHANGE_SCREENS);

  test('footer submit yields the exchange request and the body matches the contract', () => {
    const state = createFormState(form);
    const result = submitScreen(state, { girdi: 'merhaba' });
    expect(result.kind).toBe('data_exchange');
    expect(result.screenId).toBe('GIRIS');
    expect(result.payload).toEqual({ girdi: 'merhaba' });
    expect(result.state.busy).toBe(true);

    expect(buildExchangeBody('u_42', form, 'data_exchange', result.screenId, result.payload)).toEqual({
      user: { id: 'u_42' },
      flow: {
        token: 'MyBot.Dialogs.KayitDialog&u_42',
        name: 'kayit_formu',
        version: 3,
        action: 'data_exchange',
        screen: 'GIRIS',
        data: { girdi: 'merhaba' },
      },
    });
    expect(buildExchangeBody('u_42', form).flow.action).toBe('data_exchange');
    expect(buildExchangeBody('u_42', form, 'INIT', 'GIRIS').flow.data).toEqual({});
  });

  test('the bot answer moves GIRIS → SONUC with its data, then complete uses the typed values', () => {
    const busy = submitScreen(createFormState(form), { girdi: 'merhaba' }).state;
    const applied = applyExchangeResponse(busy, { version: '3.0', screen: 'SONUC', data: { mesaj: 'selam' } });
    expect(applied.kind).toBe('screen');
    expect(applied.state.busy).toBe(false);
    expect(applied.state.stack.map((s) => s.id)).toEqual(['GIRIS', 'SONUC']);

    const ctx = bindingContext(applied.state);
    const { items } = collectComponents(currentScreen(applied.state).screen, ctx);
    expect(resolveText(items[0].node.text, ctx)).toBe('Sunucudan gelen: selam');

    const done = submitScreen(applied.state, {});
    expect(done.kind).toBe('complete');
    expect(done.response).toEqual({ girdi: 'merhaba' });
  });

  test('same screen back from the bot refreshes data, keeps values and shows error_message', () => {
    const busy = submitScreen(createFormState(form), { girdi: 'merhaba' }).state;
    const applied = applyExchangeResponse(busy, { screen: 'GIRIS', data: { error_message: 'Gecersiz', ipucu: 'x' } });
    expect(applied.kind).toBe('screen');
    expect(applied.state.stack).toHaveLength(1);
    expect(currentScreen(applied.state).values).toEqual({ girdi: 'merhaba' });
    expect(currentScreen(applied.state).data.ipucu).toBe('x');
    expect(currentScreen(applied.state).notice).toBe('Gecersiz');
  });

  test('SUCCESS completes the form with extension_message_response.params', () => {
    const busy = submitScreen(createFormState(form), { girdi: 'merhaba' }).state;
    const applied = applyExchangeResponse(busy, {
      screen: 'SUCCESS',
      data: { extension_message_response: { params: { flow_token: 'MyBot.Dialogs.KayitDialog&u_42', adres_id: 'a_9' } } },
    });
    expect(applied.kind).toBe('complete');
    expect(applied.response).toEqual({ flow_token: 'MyBot.Dialogs.KayitDialog&u_42', adres_id: 'a_9' });

    const body = buildFormReply(form, applied.response, { userId: 'u_42' });
    expect(body.message.form.response.adres_id).toBe('a_9');
  });

  test('INIT: flow_action data_exchange asks the bot first and replaces the placeholder screen', () => {
    const state = createFormState(formMessage(EXCHANGE_SCREENS, { action: 'data_exchange' }));
    expect(state.busy).toBe(true);
    expect(initRequest(state)).toEqual({ action: 'INIT', screenId: 'GIRIS', data: {} });
    expect(initRequest(createFormState(form))).toBeNull();

    const applied = applyExchangeResponse(state, { screen: 'GIRIS', data: { ipucu: 'baslangic' } }, { reset: true });
    expect(applied.state.stack).toHaveLength(1);
    expect(currentScreen(applied.state).data).toEqual({ ipucu: 'baslangic' });
    expect(applied.state.busy).toBe(false);
  });

  test('unknown screen from the bot and empty answers are errors, not crashes', () => {
    const state = createFormState(form);
    expect(applyExchangeResponse(state, { screen: 'YOK', data: {} }).kind).toBe('error');
    expect(applyExchangeResponse(state, null).kind).toBe('error');
    expect(applyExchangeResponse(state, { data: {} }).state.error.message).toBe(FLOW_TEXT.serverError);
  });

  test('describeExchangeError tolerates JSON errors and HTML 502 pages', () => {
    expect(describeExchangeError(502, { status: 502, error: { code: 'BOT_UNREACHABLE', message: 'Bot down' } })).toBe('Bot down');
    expect(describeExchangeError(400, JSON.stringify({ status: 400, error: { code: 'INVALID_BODY' } }))).toContain('INVALID_BODY');
    expect(describeExchangeError(502, '<html><body>502 Bad Gateway</body></html>')).toContain('HTTP 502');
    expect(describeExchangeError(0, null)).toBe(FLOW_TEXT.serverError);
  });
});

/* ---------------- BACK ---------------- */

describe('goBack', () => {
  test('static flow: pops the stack keeping earlier values; first screen closes', () => {
    const state = createFormState(formMessage(STATIC_SCREENS));
    const moved = submitScreen(state, { ad: 'Ahmet', eposta: 'a@b.c' }).state;
    const back = goBack(moved);
    expect(back.kind).toBe('screen');
    expect(back.state.stack).toHaveLength(1);
    expect(currentScreen(back.state).values).toEqual({ ad: 'Ahmet', eposta: 'a@b.c' });
    expect(goBack(back.state).kind).toBe('close');
  });

  test('server-driven flow with refresh_on_back asks the bot with action BACK', () => {
    const screens = [{ ...EXCHANGE_SCREENS[0], refresh_on_back: true }, EXCHANGE_SCREENS[1]];
    const form = formMessage(screens);
    const busy = submitScreen(createFormState(form), { girdi: 'merhaba' }).state;
    const moved = applyExchangeResponse(busy, { screen: 'SONUC', data: { mesaj: 'selam' } }).state;

    const back = goBack(moved);
    expect(back.kind).toBe('data_exchange');
    expect(back.action).toBe('BACK');
    expect(back.screenId).toBe('GIRIS');
    expect(back.state.busy).toBe(true);
    expect(buildExchangeBody('u_42', form, back.action, back.screenId, back.payload).flow).toMatchObject({
      action: 'BACK',
      screen: 'GIRIS',
    });
  });

  test('server-driven flow without refresh_on_back goes back locally; busy forms ignore back', () => {
    const busy = submitScreen(createFormState(formMessage(EXCHANGE_SCREENS)), { girdi: 'merhaba' }).state;
    expect(goBack(busy).kind).toBe('noop');
    const moved = applyExchangeResponse(busy, { screen: 'SONUC', data: { mesaj: 'selam' } }).state;
    const back = goBack(moved);
    expect(back.kind).toBe('screen');
    expect(currentScreen(back.state).id).toBe('GIRIS');
  });
});

/* ---------------- summary ---------------- */

describe('summarizeResponse', () => {
  test('uses field labels and option titles when known', () => {
    const screens = [
      {
        id: 'TEK',
        layout: {
          children: [
            { type: 'TextInput', name: 'ad', label: 'Adiniz' },
            { type: 'Dropdown', name: 'il', label: 'Il', 'data-source': [{ id: '34', title: 'Istanbul' }] },
            { type: 'OptIn', name: 'kvkk', label: 'KVKK' },
            { type: 'Footer', label: 'Bitir', 'on-click-action': { name: 'complete' } },
          ],
        },
      },
    ];
    const state = createFormState(formMessage(screens));
    const info = fieldInfo(state);
    expect(summarizeResponse({ ad: 'Ahmet', il: '34', kvkk: true, flow_token: 'x' }, info)).toBe(
      `${FLOW_TEXT.sent}\nAdiniz: Ahmet\nIl: Istanbul\nKVKK: ${FLOW_TEXT.yes}`
    );
    expect(summarizeResponse({ ad: 'Ahmet' }, null)).toBe(`${FLOW_TEXT.sent}\nad: Ahmet`);
  });
});
