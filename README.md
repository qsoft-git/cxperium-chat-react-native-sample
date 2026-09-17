# cxperium-chat-native-sample

**EN** — A minimal React Native chat client for a Cxperium **custom (mobile)** channel.
**TR** — Cxperium **custom (mobil)** kanalı için asgari bir React Native sohbet istemcisi.

> **EN** — This is a sample you **copy into your own app**, not a library you install.
> Every method carries a comment in English and Turkish, because you will be reading
> and changing this code, not just calling it.
>
> **TR** — Bu, kurduğunuz bir kütüphane değil, **kendi uygulamanıza kopyalayacağınız**
> bir örnektir. Her metodun altında İngilizce ve Türkçe yorum vardır; çünkü bu kodu
> yalnızca çağırmayacak, okuyup değiştireceksiniz.

---

## 1. Quick start · Hızlı başlangıç

```bash
npm install
npm start
npm test      # EN: unit tests (jest-expo) · TR: birim testleri (jest-expo)
```

**EN** — Then open `src/config/cxperium.config.js` and fill in `channelKey`.
It is shown in the panel the moment you create the mobile channel.

**TR** — Ardından `src/config/cxperium.config.js` dosyasını açıp `channelKey`
değerini doldurun. Bu değer, mobil kanalı oluşturduğunuz anda panelde gösterilir.

---

## 2. Project layout · Proje yerleşimi

**EN** — The components follow **atomic design**: small pieces compose into bigger
ones, and each level is allowed to know only about the level below it.

**TR** — Bileşenler **atomic design** düzenini izler: küçük parçalar birleşerek
büyükleri oluşturur ve her katman yalnızca bir alt katmanı bilir.

```
src/
├── config/cxperium.config.js   EN: the only file you must edit
│                               TR: düzenlemeniz gereken tek dosya
├── api/
│   ├── cxperiumAuth.js         EN: obtains the user token
│   │                           TR: kullanıcı token'ını alır
│   ├── cxperiumClient.js       EN: send a message / a form reply, read history, flow exchange
│   │                           TR: mesaj / form cevabı gönderme, geçmişi okuma, flow exchange
│   └── cxperiumSocket.js       EN: realtime bot replies
│                               TR: anlık bot yanıtları
├── services/
│   └── flowEngine.js           EN: form (WhatsApp Flow) engine — pure JS, unit-tested
│                               TR: form (WhatsApp Flow) motoru — saf JS, birim testli
├── hooks/
│   └── useCxperiumChat.js      EN: all the logic, no UI
│                               TR: bütün mantık, arayüz yok
├── components/
│   ├── atoms/                  MessageBubble · Timestamp · ChoiceChip
│   │                           SendButton · ConnectionDot · FormCtaButton
│   ├── molecules/              MessageRow · ChoiceGroup · Composer
│   │                           FlowField · FlowText
│   ├── organisms/              ChatHeader · MessageList · FlowForm
│   └── templates/              ChatTemplate
└── screens/
    └── ChatScreen.js           EN: logic meets layout
                                TR: mantık ile yerleşimin buluştuğu yer
```

**EN** — If you only want the behaviour and not our look, copy
`src/api/` + `src/hooks/` (+ `src/services/` for forms) and render the messages
yourself. The hook returns `{ messages, status, error, sending, send, choose }`
plus, for forms, `{ activeForm, answeredForms, openForm, closeForm, submitForm, exchange }`.

**TR** — Görünümümüzü değil yalnızca davranışı istiyorsanız `src/api/` ve
`src/hooks/` (formlar için ayrıca `src/services/`) klasörlerini kopyalayıp
mesajları kendiniz çizin. Hook `{ messages, status, error, sending, send, choose }`
ve formlar için `{ activeForm, answeredForms, openForm, closeForm, submitForm, exchange }` döner.

---

## 3. How it works · Nasıl çalışır

**EN**

1. **Authenticate** — the app gets a user id and a token.
2. **Load history** — everything said so far, over REST.
3. **Open the socket** — bot replies arrive as `message.created` events.
4. **On every reconnect** — read anything missed while the connection was down.

Step 4 matters. A socket that drops silently loses messages; the sample refills
the gap from the last sequence number it saw, so nothing disappears.

**TR**

1. **Kimlik doğrula** — uygulama bir kullanıcı kimliği ve token alır.
2. **Geçmişi yükle** — o ana kadar söylenen her şey, REST üzerinden.
3. **Soketi aç** — bot yanıtları `message.created` olayıyla gelir.
4. **Her yeniden bağlanmada** — bağlantı kopukken kaçırılanları oku.

4. adım önemlidir. Sessizce kopan bir soket mesaj kaybettirir; örnek, gördüğü son
sıra numarasından itibaren boşluğu yeniden doldurur, böylece hiçbir şey kaybolmaz.

---

## 4. Authentication — read this before you ship
## 4. Kimlik doğrulama — yayına çıkmadan önce okuyun

**EN** — The sample ships with `authMode: 'device'` so it runs the moment you
clone it. In that mode the **channel secret is inside the app bundle**. Anyone
can extract it from an APK or IPA and impersonate your channel.

Before a release build, switch to `authMode: 'backend'`:

- Your server calls `POST /custom/<channelKey>/register` with the secret.
- It returns `{ userId, token }` to the app.
- The secret never leaves your server.

The token is scoped to a single user id, so it cannot be used to read someone
else's conversation.

**TR** — Örnek, klonladığınız anda çalışsın diye `authMode: 'device'` ile gelir.
Bu modda **kanal secret'ı uygulama paketinin içindedir**. APK ya da IPA
dosyasından çıkarılıp kanalınızın kimliğine bürünülebilir.

Yayına çıkacak derlemeden önce `authMode: 'backend'` moduna geçin:

- Sunucunuz `POST /custom/<channelKey>/register` ucunu secret ile çağırır.
- Uygulamaya `{ userId, token }` döner.
- Secret sunucunuzdan hiç çıkmaz.

Token tek bir kullanıcı kimliğine bağlıdır; başkasının konuşmasını okumak için
kullanılamaz.

---

## 5. Message types · Mesaj tipleri

**EN** — What the bot can send you:

| Type | Rendered by | Note |
|---|---|---|
| `text` | `MessageBubble` | Plain text. |
| `choices` | `MessageBubble` + `ChoiceGroup` | Only the **last** one stays tappable. |
| `media` | `MessageRow` | Caption only in this sample — rendering images is left to you. |
| `form` | `MessageRow` + `FormCtaButton` → `FlowForm` | A WhatsApp-Flow style form: `text` in the bubble, `form.cta` opens the screens (`form.screens`, Flow JSON v7 subset). Static screens (`navigate` / `complete`) run on the device; `data_exchange` / `INIT` / `BACK` ask the bot via `POST /custom/:key/flows/exchange`. The completed form goes to `/messages` as `{ type:"form", form:{ token, name, version, response } }`; the bubble then shows a "Form sent" summary. Unknown component types are shown as text, never dropped. Logic lives in `src/services/flowEngine.js` (pure JS, see `__tests__/`). |
| `unknown` | `MessageRow` | Falls back to text so the chat never looks broken. |

What you can send: `text`, `choice` (singular — the reply to a `choices`
message) and `form` (the reply to a `form` message; `form.token` is mandatory).

**TR** — Botun size gönderebilecekleri:

| Tip | Çizen | Not |
|---|---|---|
| `text` | `MessageBubble` | Düz metin. |
| `choices` | `MessageBubble` + `ChoiceGroup` | Yalnızca **son** mesaj dokunulabilir kalır. |
| `media` | `MessageRow` | Bu örnekte yalnızca açıklama — görsel çizimi size bırakıldı. |
| `form` | `MessageRow` + `FormCtaButton` → `FlowForm` | WhatsApp Flow tarzı form: balonda `text`, `form.cta` ekranları açar (`form.screens`, Flow JSON v7 alt kümesi). Statik ekranlar (`navigate` / `complete`) cihazda çalışır; `data_exchange` / `INIT` / `BACK` bota `POST /custom/:key/flows/exchange` ile sorulur. Tamamlanan form `/messages` ucuna `{ type:"form", form:{ token, name, version, response } }` olarak gider; balonda "Form gönderildi" özeti görünür. Bilinmeyen bileşen tipleri düşürülmez, metin olarak gösterilir. Mantık `src/services/flowEngine.js` içindedir (saf JS, bkz. `__tests__/`). |
| `unknown` | `MessageRow` | Metne düşer; sohbet asla bozuk görünmez. |

Sizin gönderebilecekleriniz: `text`, `choice` (tekil — bir `choices` mesajına
verilen yanıt) ve `form` (bir `form` mesajına verilen yanıt; `form.token` zorunludur).

---

## 6. Things left to you · Size bırakılanlar

**EN**

- **Persisting the user id and token** — the sample keeps them in memory, so a
  restart starts a new conversation. Use `AsyncStorage` or secure storage.
- **Rendering media** — `MessageRow` shows the caption; images and files are yours.
- **Push notifications** — for replies that arrive while the app is closed.
- **Retry on send failure** — the message id is already an idempotency key, so a
  retry is safe and will not duplicate.

**TR**

- **Kullanıcı kimliği ve token'ı saklamak** — örnek bunları bellekte tutar, yani
  yeniden başlatma yeni bir konuşma açar. `AsyncStorage` ya da güvenli depolama
  kullanın.
- **Medyayı çizmek** — `MessageRow` açıklamayı gösterir; görseller ve dosyalar size ait.
- **Push bildirimleri** — uygulama kapalıyken gelen yanıtlar için.
- **Gönderim hatasında tekrar denemek** — mesaj kimliği zaten tekrar-önleme
  anahtarıdır; tekrar denemek güvenlidir ve kopya oluşturmaz.
