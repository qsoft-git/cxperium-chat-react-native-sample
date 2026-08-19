import { io } from 'socket.io-client';

import { CXPERIUM_CONFIG } from '../config/cxperium.config';

/**
 * EN: Opens the realtime connection that delivers bot replies.
 *     Returns the socket so the caller can close it.
 * TR: Bot yanıtlarını taşıyan anlık bağlantıyı açar.
 *     Çağıranın kapatabilmesi için soketi döner.
 */
export function connectToChat({ auth, onMessage, onStatusChange }) {
  // EN: "/custom" is a socket.io NAMESPACE, not a URL path. It is appended to
  //     the host, and socket.io keeps using its own default path underneath.
  // TR: "/custom" bir socket.io AD ALANIDIR, URL yolu değildir. Sunucu adresine
  //     eklenir; socket.io alt tarafta kendi varsayılan yolunu kullanmaya
  //     devam eder.
  const socket = io(`${CXPERIUM_CONFIG.socketUrl}/custom`, {
    transports: ['websocket'],

    // EN: The handshake carries the identity. The server rejects the
    //     connection outright if any of these three is missing or wrong.
    // TR: Kimlik el sıkışma sırasında taşınır. Bu üçünden biri eksik ya da
    //     yanlışsa sunucu bağlantıyı doğrudan reddeder.
    auth: {
      channelKey: CXPERIUM_CONFIG.channelKey,
      user: auth.userId,
      token: auth.token,
    },
  });

  socket.on('connect', () => {
    // EN: Tell the caller we are live. It will fill the gap that built up
    //     while we were disconnected — see useCxperiumChat.
    // TR: Çağırana bağlandığımızı bildir. Bağlantı kopukken biriken boşluğu o
    //     dolduracak — bkz. useCxperiumChat.
    onStatusChange('connected');
  });

  socket.on('disconnect', () => {
    // EN: socket.io reconnects on its own; we only reflect the state in the UI.
    // TR: socket.io yeniden bağlanmayı kendi yapar; biz yalnızca durumu
    //     arayüze yansıtırız.
    onStatusChange('disconnected');
  });

  socket.on('connect_error', (error) => {
    // EN: Auth failures land here with names like INVALID_TOKEN or
    //     INVALID_SIGNATURE. They will not fix themselves by retrying.
    // TR: Kimlik hataları buraya INVALID_TOKEN ya da INVALID_SIGNATURE gibi
    //     adlarla düşer. Tekrar denemekle kendiliğinden düzelmezler.
    onStatusChange('error', error?.message);
  });

  socket.on('message.created', (message) => {
    // EN: This is the only event that carries a bot reply. Delivery is
    //     at-least-once, so the same message can arrive twice — the caller
    //     de-duplicates by id.
    // TR: Bot yanıtını taşıyan tek olay budur. Teslimat en-az-bir-kez olduğu
    //     için aynı mesaj iki kez gelebilir — çağıran kimliğe göre tekilleştirir.
    onMessage(message);
  });

  return socket;
}

/**
 * EN: Closes the connection. Call it when the chat screen unmounts, otherwise
 *     the socket keeps running in the background.
 * TR: Bağlantıyı kapatır. Sohbet ekranı kaldırıldığında çağırın; aksi halde
 *     soket arka planda çalışmaya devam eder.
 */
export function disconnectFromChat(socket) {
  if (socket) socket.disconnect();
}
