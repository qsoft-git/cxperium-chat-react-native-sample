import { CXPERIUM_CONFIG } from '../config/cxperium.config';

/**
 * EN: Obtains the user identity and the token every other call needs.
 *     Returns { userId, displayName, token }.
 * TR: Kullanıcı kimliğini ve diğer tüm çağrıların ihtiyaç duyduğu token'ı alır.
 *     { userId, displayName, token } döner.
 */
export async function authenticate(displayName) {
  // EN: Two paths on purpose — the safe one for production, the quick one for
  //     local development. The choice lives in the config file, not here.
  // TR: Bilerek iki yol var — canlı için güvenli olan, yerel geliştirme için
  //     hızlı olan. Seçim bu dosyada değil, yapılandırma dosyasında yapılır.
  if (CXPERIUM_CONFIG.authMode === 'backend') {
    return authenticateViaYourBackend(displayName);
  }

  return authenticateOnDevice(displayName);
}

/**
 * EN: PRODUCTION PATH. Asks YOUR server for a token. Your server is the only
 *     place that knows the channel secret.
 * TR: CANLI YOL. Token'ı KENDİ sunucunuzdan ister. Kanal secret'ını bilen tek
 *     yer sizin sunucunuzdur.
 */
async function authenticateViaYourBackend(displayName) {
  // EN: Send whatever your own session uses (a cookie, a bearer token of your
  //     own, ...). This sample keeps it minimal on purpose.
  // TR: Kendi oturumunuz ne kullanıyorsa onu gönderin (çerez, kendi bearer
  //     token'ınız, ...). Bu örnek bilerek en sade halde bırakıldı.
  const response = await fetch(CXPERIUM_CONFIG.backendTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed with status ${response.status}`);
  }

  const data = await response.json();

  // EN: Your server decides the user id. Keep it stable per person — the whole
  //     conversation history hangs off it.
  // TR: Kullanıcı kimliğini sizin sunucunuz belirler. Kişi başına sabit tutun —
  //     bütün konuşma geçmişi bu kimliğe bağlıdır.
  return {
    userId: data.userId,
    displayName,
    token: data.token,
  };
}

/**
 * EN: DEVELOPMENT PATH — the channel secret is inside the app. Read the
 *     warning in cxperium.config.js before you use this in a real build.
 * TR: GELİŞTİRME YOLU — kanal secret'ı uygulamanın içindedir. Gerçek bir
 *     derlemede kullanmadan önce cxperium.config.js içindeki uyarıyı okuyun.
 */
async function authenticateOnDevice(displayName) {
  const url = `${CXPERIUM_CONFIG.restBaseUrl}/custom/${CXPERIUM_CONFIG.channelKey}/register`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // EN: The register endpoint expects the raw channel secret in "apiKey"
      //     (not in "Authorization"). This is exactly why it belongs on a
      //     server, not on a phone.
      // TR: Kayıt ucu kanal secret'ını ham haliyle "apiKey" başlığında bekler
      //     ("Authorization" değil). Bu yüzden zaten telefonda değil sunucuda
      //     durması gerekir.
      apiKey: CXPERIUM_CONFIG.devChannelSecret,
    },
    body: JSON.stringify({ user: { name: displayName } }),
  });

  if (!response.ok) {
    throw new Error(`Register failed with status ${response.status}`);
  }

  const data = await response.json();

  // EN: The server generates the user id ("c_<uuid>"). Persist it (and the
  //     token) on the device so the same person keeps the same conversation
  //     across app restarts — this sample keeps them in memory only.
  // TR: Kullanıcı kimliğini ("c_<uuid>") sunucu üretir. Aynı kişinin uygulama
  //     yeniden açıldığında aynı konuşmayı sürdürmesi için kimliği (ve token'ı)
  //     cihazda saklayın — bu örnek yalnızca bellekte tutar.
  return {
    userId: data.contact?.id ?? data.user,
    displayName: data.contact?.name ?? displayName,
    token: data.token,
  };
}
