import React from 'react';
import { StyleSheet, View } from 'react-native';

import ChoiceChip from '../atoms/ChoiceChip';

/**
 * MOLECULE
 * EN: The row of options under a bot "choices" message.
 * TR: Botun "choices" mesajının altındaki seçenek sırası.
 */
export default function ChoiceGroup({ choices, disabled, onChoose }) {
  if (!choices || choices.length === 0) return null;

  return (
    <View style={styles.group}>
      {choices.map((choice) => (
        <ChoiceChip
          // EN: The option id is stable and unique inside one message, so it is
          //     a better key than the array index.
          // TR: Seçenek kimliği bir mesaj içinde sabit ve benzersizdir; dizi
          //     indeksinden daha iyi bir anahtardır.
          key={choice.id}
          title={choice.title}
          disabled={disabled}
          onPress={() => onChoose(choice)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
