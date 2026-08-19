import React, { useCallback, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import ChoiceGroup from '../molecules/ChoiceGroup';
import MessageRow from '../molecules/MessageRow';

/**
 * ORGANISM
 * EN: The scrolling conversation. Uses FlatList rather than ScrollView so long
 *     histories stay smooth — only the visible rows are rendered.
 * TR: Kayan konuşma alanı. Uzun geçmişlerin akıcı kalması için ScrollView değil
 *     FlatList kullanır — yalnızca görünen satırlar çizilir.
 */
export default function MessageList({ messages, busy, onChoose }) {
  const listRef = useRef(null);

  const renderItem = useCallback(
    ({ item, index }) => {
      // EN: Only the LAST choices message stays tappable. Letting the user
      //     answer a question from ten messages ago would send the bot a reply
      //     it is no longer waiting for.
      // TR: Yalnızca SON seçenek mesajı dokunulabilir kalır. Kullanıcının on
      //     mesaj önceki bir soruyu yanıtlamasına izin vermek, bota artık
      //     beklemediği bir cevap göndermek olur.
      const isLast = index === messages.length - 1;

      return (
        <View>
          <MessageRow message={item} />
          {item.type === 'choices' && (
            <ChoiceGroup
              choices={item.choices}
              disabled={busy || !isLast}
              onChoose={onChoose}
            />
          )}
        </View>
      );
    },
    [busy, messages.length, onChoose]
  );

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      // EN: Scroll to the newest message when the list grows or the keyboard
      //     pushes the layout up.
      // TR: Liste büyüdüğünde ya da klavye düzeni yukarı ittiğinde en yeni
      //     mesaja kaydır.
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 12,
  },
});
