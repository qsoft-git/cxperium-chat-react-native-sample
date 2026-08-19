import { useCallback, useEffect, useRef, useState } from 'react';

import { authenticate } from '../api/cxperiumAuth';
import { fetchMessages, sendChoice, sendTextMessage } from '../api/cxperiumClient';
import { connectToChat, disconnectFromChat } from '../api/cxperiumSocket';

/**
 * EN: All the chat logic lives here, so the components below stay purely
 *     visual. If you only want the behaviour and not our UI, copy this one
 *     file and render it however you like.
 * TR: Bütün sohbet mantığı burada durur; böylece aşağıdaki bileşenler tamamen
 *     görsel kalır. Arayüzümüzü değil yalnızca davranışı istiyorsanız, bu tek
 *     dosyayı kopyalayıp istediğiniz gibi çizebilirsiniz.
 */
export function useCxperiumChat({ displayName }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  // EN: Refs, not state: these change often and must never trigger a re-render.
  // TR: State değil ref: bunlar sık değişir ve asla yeniden çizim tetiklememeli.
  const authRef = useRef(null);
  const socketRef = useRef(null);
  const lastSeqRef = useRef(0);

  /**
   * EN: Adds messages while dropping ones we already have. Delivery is
   *     at-least-once and history can overlap the socket, so duplicates are
   *     normal rather than exceptional.
   * TR: Elimizde olanları eleyerek mesaj ekler. Teslimat en-az-bir-kezdir ve
   *     geçmiş ile soket çakışabilir; yani kopyalar istisna değil, olağandır.
   */
  const mergeMessages = useCallback((incoming) => {
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id));
      const fresh = incoming.filter((m) => m.id && !seen.has(m.id));

      if (fresh.length === 0) return current;

      // EN: Order by seq — the server's sequence number, not arrival time.
      //     A reconnect can deliver an older message after a newer one.
      // TR: seq'e göre sırala — sunucunun sıra numarası, geliş zamanı değil.
      //     Yeniden bağlanma, yeni bir mesajdan sonra eskisini getirebilir.
      return [...current, ...fresh].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    });

    // EN: Remember the newest seq so the next gap-fill starts from the right
    //     place.
    // TR: Bir sonraki boşluk doldurmanın doğru yerden başlaması için en yeni
    //     seq'i sakla.
    incoming.forEach((message) => {
      if ((message.seq ?? 0) > lastSeqRef.current) {
        lastSeqRef.current = message.seq;
      }
    });
  }, []);

  /**
   * EN: Pulls everything we missed. Runs on open and after every reconnect.
   * TR: Kaçırdığımız her şeyi çeker. Açılışta ve her yeniden bağlanmada çalışır.
   */
  const fillGap = useCallback(async () => {
    if (!authRef.current) return;

    try {
      const { messages: missed } = await fetchMessages({
        auth: authRef.current,
        afterSeq: lastSeqRef.current,
      });

      mergeMessages(missed);
    } catch (gapError) {
      // EN: A failed gap-fill is not fatal: the socket still delivers new
      //     messages. Surface it, do not tear the chat down.
      // TR: Boşluk doldurmanın başarısız olması ölümcül değildir: soket yeni
      //     mesajları getirmeye devam eder. Göster, ama sohbeti yıkma.
      setError(gapError.message);
    }
  }, [mergeMessages]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        // EN: 1) Identify ourselves and get a token.
        // TR: 1) Kendimizi tanıtıp bir token alalım.
        const auth = await authenticate(displayName);
        if (cancelled) return;
        authRef.current = auth;

        // EN: 2) Load the conversation so far.
        // TR: 2) Buraya kadarki konuşmayı yükleyelim.
        const history = await fetchMessages({ auth, afterSeq: 0 });
        if (cancelled) return;
        mergeMessages(history.messages);

        // EN: 3) Open the socket LAST. Doing it before loading history would
        //     let a live reply arrive and then be overwritten by older data.
        // TR: 3) Soketi EN SON açalım. Geçmişten önce açmak, canlı bir yanıtın
        //     gelip ardından eski verinin üzerine yazılmasına yol açar.
        socketRef.current = connectToChat({
          auth,
          onMessage: (message) => mergeMessages([message]),
          onStatusChange: (next, reason) => {
            setStatus(next);
            if (next === 'error') setError(reason ?? 'connection error');
            // EN: Every successful (re)connect fills whatever we missed.
            // TR: Her başarılı (yeniden) bağlanma, kaçırdıklarımızı doldurur.
            if (next === 'connected') fillGap();
          },
        });
      } catch (startError) {
        if (!cancelled) {
          setStatus('error');
          setError(startError.message);
        }
      }
    }

    start();

    return () => {
      // EN: Guard against a late response from a screen the user already left.
      // TR: Kullanıcının çoktan terk ettiği bir ekrandan gelen geç yanıta karşı
      //     koruma.
      cancelled = true;
      disconnectFromChat(socketRef.current);
      socketRef.current = null;
    };
  }, [displayName, fillGap, mergeMessages]);

  /**
   * EN: Sends text and shows it immediately, before the server confirms.
   * TR: Metni gönderir ve sunucu onaylamadan önce hemen gösterir.
   */
  const send = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || !authRef.current) return;

      // EN: Optimistic echo. The server will send the same message back with a
      //     real seq; mergeMessages drops it as a duplicate because the id
      //     matches.
      // TR: İyimser yankı. Sunucu aynı mesajı gerçek bir seq ile geri
      //     gönderecek; kimlik eşleştiği için mergeMessages onu kopya sayıp eler.
      setSending(true);

      try {
        const messageId = await sendTextMessage({
          auth: authRef.current,
          text: trimmed,
        });

        mergeMessages([
          {
            id: messageId,
            seq: lastSeqRef.current + 0.5, // EN: keep it just after the last one / TR: sonuncunun hemen ardında tut
            ts: Math.floor(Date.now() / 1000),
            direction: 'in',
            type: 'text',
            text: trimmed,
          },
        ]);
      } catch (sendError) {
        setError(sendError.message);
      } finally {
        setSending(false);
      }
    },
    [mergeMessages]
  );

  /**
   * EN: Sends the option the user tapped.
   * TR: Kullanıcının dokunduğu şıkkı gönderir.
   */
  const choose = useCallback(
    async (choice) => {
      if (!authRef.current) return;

      setSending(true);

      try {
        const messageId = await sendChoice({ auth: authRef.current, choice });

        mergeMessages([
          {
            id: messageId,
            seq: lastSeqRef.current + 0.5,
            ts: Math.floor(Date.now() / 1000),
            direction: 'in',
            type: 'text',
            text: choice.title,
          },
        ]);
      } catch (chooseError) {
        setError(chooseError.message);
      } finally {
        setSending(false);
      }
    },
    [mergeMessages]
  );

  return { messages, status, error, sending, send, choose };
}
