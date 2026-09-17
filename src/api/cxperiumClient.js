import { CXPERIUM_CONFIG } from '../config/cxperium.config';
import { buildExchangeBody, buildFormReply, describeExchangeError } from '../services/flowEngine';

/**
 * EN: REST calls. Two are needed for a working chat: send a message, and read
 *     the messages you have not seen yet. Two more are needed only for forms:
 *     send the completed form (same /messages endpoint) and ask the bot for
 *     the next screen of a server-driven form (/flows/exchange).
 * TR: REST çağrıları. Çalışan bir sohbet için iki tanesi gerekir: mesaj
 *     gönderme ve henüz görmediğiniz mesajları okuma. İki tanesi yalnızca
 *     formlar içindir: tamamlanan formu gönderme (aynı /messages ucu) ve
 *     sunucu güdümlü formda bir sonraki ekranı bota sorma (/flows/exchange).
 */

function messagesUrl() {
  // EN: The channel key is part of the path, not a header.
  // TR: Kanal anahtarı bir başlık değil, adresin parçasıdır.
  return `${CXPERIUM_CONFIG.restBaseUrl}/custom/${CXPERIUM_CONFIG.channelKey}/messages`;
}

function flowExchangeUrl() {
  return `${CXPERIUM_CONFIG.restBaseUrl}/custom/${CXPERIUM_CONFIG.channelKey}/flows/exchange`;
}

/**
 * EN: Sends one text message. Resolves with the server-side message id.
 * TR: Tek bir metin mesajı gönderir. Sunucu tarafındaki mesaj kimliğiyle sonuçlanır.
 */
export async function sendTextMessage({ auth, text }) {
  // EN: We generate the message id ourselves. The server treats it as an
  //     idempotency key, so retrying a failed send never creates a duplicate.
  // TR: Mesaj kimliğini biz üretiyoruz. Sunucu bunu tekrar-önleme anahtarı
  //     olarak kullanır; başarısız bir gönderimi tekrarlamak asla kopya kayıt
  //     oluşturmaz.
  const localId = createMessageId();

  const response = await fetch(messagesUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      user: { id: auth.userId, name: auth.displayName },
      message: {
        id: localId,
        ts: Math.floor(Date.now() / 1000),
        type: 'text',
        text,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Send failed with status ${response.status}`);
  }

  const data = await response.json();

  return data.messageId ?? localId;
}

/**
 * EN: Sends the option the user tapped in a choice message.
 * TR: Kullanıcının bir seçenek mesajında dokunduğu şıkkı gönderir.
 */
export async function sendChoice({ auth, choice }) {
  const localId = createMessageId();

  const response = await fetch(messagesUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      user: { id: auth.userId, name: auth.displayName },
      message: {
        id: localId,
        ts: Math.floor(Date.now() / 1000),
        // EN: Outgoing type is "choice" (singular). The bot sends "choices"
        //     (plural) when it offers them — the two names are not the same.
        // TR: Giden tip "choice" (tekil). Bot seçenek sunarken "choices"
        //     (çoğul) gönderir — iki ad aynı şey değildir.
        type: 'choice',
        choice: { id: choice.id, title: choice.title },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Send failed with status ${response.status}`);
  }

  const data = await response.json();

  return data.messageId ?? localId;
}

/**
 * EN: Sends a completed form (contract §B). Same endpoint and auth as text;
 *     only the message shape differs:
 *       { type:"form", form:{ token, name, version, response } }
 *     `form` is the object that arrived in the bot's `type:"form"` message —
 *     its `token` is what lets the bot match the answer to the question.
 * TR: Tamamlanan formu gönderir (sözleşme §B). Metinle aynı uç ve kimlik;
 *     yalnızca mesaj biçimi farklıdır:
 *       { type:"form", form:{ token, name, version, response } }
 *     `form`, botun `type:"form"` mesajıyla gelen nesnedir — `token`'ı, botun
 *     cevabı soruyla eşleştirmesini sağlar.
 */
export async function sendFormReply({ auth, form, response }) {
  const localId = createMessageId();

  const body = buildFormReply(form, response, {
    userId: auth.userId,
    displayName: auth.displayName,
    messageId: localId,
    ts: Math.floor(Date.now() / 1000),
  });

  const httpResponse = await fetch(messagesUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(body),
  });

  if (!httpResponse.ok) {
    throw new Error(`Send failed with status ${httpResponse.status}`);
  }

  const data = await httpResponse.json();

  return data.messageId ?? localId;
}

/**
 * EN: Asks the bot for the next screen of a server-driven form (contract §C).
 *     `action` is "INIT" (opening), "data_exchange" (a Footer submit) or
 *     "BACK". Resolves with the bot's answer `{ version, screen, data }`.
 *     Rejects with a readable message on any failure — the server answers
 *     JSON `{ status, error:{ code, message } }`, but a proxy may answer 502
 *     with HTML, so the body is never assumed to be JSON.
 * TR: Sunucu güdümlü formda bir sonraki ekranı bota sorar (sözleşme §C).
 *     `action` "INIT" (açılış), "data_exchange" (Footer gönderimi) ya da
 *     "BACK" olur. Botun cevabı `{ version, screen, data }` ile sonuçlanır.
 *     Her hatada okunur bir mesajla reddedilir — sunucu JSON
 *     `{ status, error:{ code, message } }` döner ama önündeki vekil 502 ile
 *     HTML dönebilir; bu yüzden gövde asla JSON varsayılmaz.
 */
export async function flowExchange({ auth, form, action, screenId, data }) {
  const httpResponse = await fetch(flowExchangeUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(buildExchangeBody(auth.userId, form, action, screenId, data)),
  });

  const text = await httpResponse.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (parseError) {
    parsed = null;
  }

  if (httpResponse.status !== 200 || !parsed || !parsed.screen) {
    throw new Error(describeExchangeError(httpResponse.status, parsed ?? text));
  }

  return parsed;
}

/**
 * EN: Reads messages newer than `afterSeq`. Used twice: once to load history
 *     when the chat opens, and again after the socket reconnects to fill the
 *     gap that occurred while the connection was down.
 * TR: `afterSeq` değerinden yeni mesajları okur. İki yerde kullanılır: sohbet
 *     açılırken geçmişi yüklemek için ve soket yeniden bağlandıktan sonra
 *     bağlantı kopukken oluşan boşluğu doldurmak için.
 */
export async function fetchMessages({ auth, afterSeq = 0 }) {
  const params = new URLSearchParams({
    user: auth.userId,
    after: String(afterSeq),
    limit: String(CXPERIUM_CONFIG.historyLimit),
  });

  const response = await fetch(`${messagesUrl()}?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}`);
  }

  const data = await response.json();

  // EN: Reading with after > 0 also acknowledges everything up to that point,
  //     so there is no separate "mark as read" call to make.
  // TR: after > 0 ile okumak o noktaya kadarki her şeyi aynı zamanda
  //     onaylar; bu yüzden ayrıca bir "okundu bilgisi" çağrısı yapmanız
  //     gerekmez.
  return {
    messages: data.messages ?? [],
    cursor: data.cursor ?? afterSeq,
    hasMore: Boolean(data.hasMore),
  };
}

/**
 * EN: A locally unique id. Good enough as an idempotency key; it never has to
 *     be globally unique.
 * TR: Yerel olarak benzersiz bir kimlik. Tekrar-önleme anahtarı olarak
 *     yeterlidir; evrensel benzersizlik gerekmez.
 */
function createMessageId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
