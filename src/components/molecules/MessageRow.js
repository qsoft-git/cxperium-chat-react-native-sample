import React from 'react';
import { StyleSheet, View } from 'react-native';

import FormCtaButton from '../atoms/FormCtaButton';
import MessageBubble from '../atoms/MessageBubble';
import Timestamp from '../atoms/Timestamp';
import { FLOW_TEXT, summarizeResponse } from '../../services/flowEngine';

/**
 * MOLECULE
 * EN: A bubble plus its timestamp, pushed to the correct side. This is where
 *     we decide what a message's text actually is — the bot sends several
 *     shapes and this row turns each of them into something displayable.
 *     A bot `form` message additionally gets an "Open form" button under the
 *     bubble; tapping it calls `onOpenForm(message)`.
 * TR: Bir balon ve zaman damgası, doğru tarafa yaslanmış hali. Bir mesajın
 *     metninin ne olduğuna burada karar veriyoruz — bot birkaç farklı biçim
 *     gönderir ve bu satır her birini gösterilebilir bir şeye çevirir.
 *     Botun `form` mesajı ayrıca balonun altında "Formu aç" butonu alır;
 *     dokununca `onOpenForm(message)` çağrılır.
 */
export default function MessageRow({ message, onOpenForm, formDisabled }) {
  // EN: "in" means the user wrote it. Anything else came from the bot or an
  //     agent — the server defaults to "out" when the field is missing.
  // TR: "in" kullanıcının yazdığı anlamına gelir. Diğer her şey bottan ya da
  //     temsilciden gelmiştir — alan yoksa sunucu "out" varsayar.
  const isMine = message.direction === 'in';
  const isFormOffer = message.type === 'form' && !isMine && message.form;

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={styles.column}>
        <MessageBubble text={toDisplayText(message)} isMine={isMine} />
        {isFormOffer ? (
          <FormCtaButton
            title={message.form.cta || FLOW_TEXT.open}
            disabled={formDisabled || !onOpenForm}
            onPress={() => onOpenForm && onOpenForm(message)}
          />
        ) : null}
        <Timestamp unixSeconds={message.ts} align={isMine ? 'right' : 'left'} />
      </View>
    </View>
  );
}

/**
 * EN: Turns any incoming message shape into a single line of text.
 * TR: Gelen herhangi bir mesaj biçimini tek satır metne çevirir.
 */
function toDisplayText(message) {
  switch (message.type) {
    case 'text':
      return message.text ?? '';

    case 'choices':
      // EN: The buttons themselves are drawn by ChoiceGroup; the bubble only
      //     carries the question that goes with them.
      // TR: Butonları ChoiceGroup çizer; balon yalnızca onlarla birlikte gelen
      //     soruyu taşır.
      return message.text ?? '';

    case 'media':
      // EN: This sample does not render media. Showing the caption (or a
      //     placeholder) is honest; silently dropping the message is not.
      // TR: Bu örnek medyayı çizmez. Açıklamayı (ya da bir yer tutucuyu)
      //     göstermek dürüsttür; mesajı sessizce yutmak değildir.
      return message.media?.caption ?? '[media]';

    case 'form':
      // EN: From the bot: `text` is the header/body/footer of the form, which
      //     is exactly what a client without form support would show. From the
      //     user (history): a "Form sent" summary of the answers.
      // TR: Bottan: `text` formun başlık/gövde/altbilgisidir; form desteği
      //     olmayan bir istemcinin göstereceği şeyin aynısı. Kullanıcıdan
      //     (geçmiş): cevapların "Form gönderildi" özeti.
      if (message.direction === 'in') {
        return message.text ?? summarizeResponse(message.form?.response, null);
      }
      return message.text ?? '';

    default:
      // EN: New server-side types must not make the chat look broken.
      // TR: Sunucu tarafında eklenen yeni tipler sohbeti bozuk göstermemeli.
      return message.text ?? '[unsupported message]';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  column: { maxWidth: '85%' },
});
