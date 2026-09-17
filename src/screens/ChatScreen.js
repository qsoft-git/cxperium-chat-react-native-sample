import React from 'react';

import ChatTemplate from '../components/templates/ChatTemplate';
import { useCxperiumChat } from '../hooks/useCxperiumChat';

/**
 * SCREEN
 * EN: Where behaviour meets layout. This is the only file that knows about
 *     both — everything above it is pure UI, everything below it is pure logic.
 *     It is also the shortest file in the project, and that is the point.
 * TR: Davranışın yerleşimle buluştuğu yer. İkisini birden bilen tek dosya
 *     budur — üstündeki her şey saf arayüz, altındaki her şey saf mantıktır.
 *     Aynı zamanda projedeki en kısa dosya, ki mesele de bu.
 */
export default function ChatScreen({ displayName = 'Guest' }) {
  const {
    messages,
    status,
    error,
    sending,
    send,
    choose,
    activeForm,
    answeredForms,
    openForm,
    closeForm,
    submitForm,
    exchange,
  } = useCxperiumChat({ displayName });

  return (
    <ChatTemplate
      title="Support"
      status={status}
      error={error}
      messages={messages}
      busy={sending}
      onSend={send}
      onChoose={choose}
      placeholder="Type a message…"
      activeForm={activeForm}
      answeredForms={answeredForms}
      onOpenForm={openForm}
      onCloseForm={closeForm}
      onSubmitForm={submitForm}
      onExchange={exchange}
    />
  );
}
