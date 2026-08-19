/**
 * EN: Every value you need to change lives in THIS file. Nothing else in the
 *     sample hardcodes an address or a key.
 * TR: Değiştirmeniz gereken her değer BU dosyada. Örnekte başka hiçbir yerde
 *     sabit adres veya anahtar yok.
 */
export const CXPERIUM_CONFIG = {
  /**
   * EN: The channel key shown in the panel right after you create the mobile
   *     channel. It looks like "ch_9f2a1c7b4e". It is public — it is safe to
   *     ship inside your app.
   * TR: Mobil kanalı oluşturduğunuz anda panelde gösterilen kanal anahtarı.
   *     "ch_9f2a1c7b4e" gibi görünür. Herkese açıktır — uygulamanızın içinde
   *     taşınması sakıncasızdır.
   */
  channelKey: 'ch_REPLACE_ME',

  /**
   * EN: REST host. Sending a message and reading history go here.
   * TR: REST sunucusu. Mesaj gönderme ve geçmişi okuma buraya gider.
   */
  restBaseUrl: 'https://provider.cxperium.com',

  /**
   * EN: WebSocket host. Bot replies arrive from here in real time. This is a
   *     DIFFERENT host from restBaseUrl — do not merge them.
   * TR: WebSocket sunucusu. Bot yanıtları buradan anlık olarak gelir. Bu adres
   *     restBaseUrl'den FARKLI bir sunucudur — ikisini birleştirmeyin.
   */
  socketUrl: 'https://ws.cxperium.com',

  /**
   * EN: How the app obtains its user token.
   *
   *     'backend' (RECOMMENDED, production): your own server calls the
   *       register endpoint with the channel secret and hands the token to the
   *       app. The secret never leaves your server.
   *
   *     'device' (DEVELOPMENT ONLY): the app itself calls the register
   *       endpoint, which means the channel secret has to be inside the app
   *       bundle. Anyone can extract it from an APK/IPA and impersonate your
   *       channel. Never ship a release build with this setting.
   *
   * TR: Uygulamanın kullanıcı token'ını nasıl aldığı.
   *
   *     'backend' (ÖNERİLEN, canlı): kendi sunucunuz kanal secret'ı ile kayıt
   *       ucunu çağırır ve token'ı uygulamaya verir. Secret sunucunuzdan hiç
   *       çıkmaz.
   *
   *     'device' (YALNIZCA GELİŞTİRME): kayıt ucunu uygulamanın kendisi çağırır,
   *       yani kanal secret'ı uygulama paketinin içinde bulunmak zorundadır.
   *       APK/IPA dosyasından çıkarılıp kanalınızın kimliğine bürünülebilir.
   *       Yayına çıkacak bir derlemede bu ayarı asla kullanmayın.
   */
  authMode: 'device',

  /**
   * EN: Used only when authMode is 'backend'. Your endpoint should return
   *     { userId, token } for the signed-in user.
   * TR: Yalnızca authMode 'backend' iken kullanılır. Bu uç, oturum açmış
   *     kullanıcı için { userId, token } döndürmelidir.
   */
  backendTokenUrl: 'https://your-server.com/cxperium/token',

  /**
   * EN: Used only when authMode is 'device'. See the warning above.
   * TR: Yalnızca authMode 'device' iken kullanılır. Yukarıdaki uyarıya bakın.
   */
  devChannelSecret: 'REPLACE_ME_ONLY_FOR_LOCAL_DEVELOPMENT',

  /**
   * EN: How many past messages to load when the chat opens.
   * TR: Sohbet açıldığında kaç geçmiş mesajın yükleneceği.
   */
  historyLimit: 50,
};
