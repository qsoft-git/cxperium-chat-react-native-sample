import React from 'react';
import { StyleSheet, View } from 'react-native';

import MessageBubble from '../atoms/MessageBubble';
import Timestamp from '../atoms/Timestamp';

/**
 * MOLECULE
 * EN: A bubble plus its timestamp, pushed to the correct side. This is where
 *     we decide what a message's text actually is — the bot sends several
 *     shapes and this row turns each of them into something displayable.
 * TR: Bir balon ve zaman damgası, doğru tarafa yaslanmış hali. Bir mesajın
 *     metninin ne olduğuna burada karar veriyoruz — bot birkaç farklı biçim
 *     gönderir ve bu satır her birini gösterilebilir bir şeye çevirir.
 */
export default function MessageRow({ message }) {
  // EN: "in" means the user wrote it. Anything else came from the bot or an
  //     agent — the server defaults to "out" when the field is missing.
  // TR: "in" kullanıcının yazdığı anlamına gelir. Diğer her şey bottan ya da
  //     temsilciden gelmiştir — alan yoksa sunucu "out" varsayar.
  const isMine = message.direction === 'in';

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={styles.column}>
        <MessageBubble text={toDisplayText(message)} isMine={isMine} />
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
