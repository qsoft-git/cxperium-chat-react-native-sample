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
│   ├── cxperiumClient.js       EN: send a message, read history
│   │                           TR: mesaj gönderme, geçmişi okuma
│   └── cxperiumSocket.js       EN: realtime bot replies
│                               TR: anlık bot yanıtları
├── hooks/
│   └── useCxperiumChat.js      EN: all the logic, no UI
│                               TR: bütün mantık, arayüz yok
├── components/
│   ├── atoms/                  MessageBubble · Timestamp · ChoiceChip
│   │                           SendButton · ConnectionDot
│   ├── molecules/              MessageRow · ChoiceGroup · Composer
│   ├── organisms/              ChatHeader · MessageList
│   └── templates/              ChatTemplate
└── screens/
    └── ChatScreen.js           EN: logic meets layout
                                TR: mantık ile yerleşimin buluştuğu yer
```

**EN** — If you only want the behaviour and not our look, copy
`src/api/` + `src/hooks/` and render the messages yourself. The hook returns
`{ messages, status, error, sending, send, choose }` and nothing else.

**TR** — Görünümümüzü değil yalnızca davranışı istiyorsanız `src/api/` ve
`src/hooks/` klasörlerini kopyalayıp mesajları kendiniz çizin. Hook yalnızca
`{ messages, status, error, sending, send, choose }` döner.

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
| `unknown` | `MessageRow` | Falls back to text so the chat never looks broken. |

What you can send: `text` and `choice` (singular — the reply to a `choices`
message).

**TR** — Botun size gönderebilecekleri:

| Tip | Çizen | Not |
|---|---|---|
| `text` | `MessageBubble` | Düz metin. |
| `choices` | `MessageBubble` + `ChoiceGroup` | Yalnızca **son** mesaj dokunulabilir kalır. |
| `media` | `MessageRow` | Bu örnekte yalnızca açıklama — görsel çizimi size bırakıldı. |
| `unknown` | `MessageRow` | Metne düşer; sohbet asla bozuk görünmez. |

Sizin gönderebilecekleriniz: `text` ve `choice` (tekil — bir `choices` mesajına
verilen yanıt).

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
