import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

/**
 * ATOM
 * EN: One tappable option from a bot "choices" message.
 * TR: Botun "choices" mesajındaki dokunulabilir tek bir seçenek.
 */
export default function ChoiceChip({ title, disabled, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
      // EN: Screen readers announce this as a button, not as plain text.
      // TR: Ekran okuyucular bunu düz metin olarak değil, buton olarak okur.
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#7c3aed',
    backgroundColor: '#ffffff',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '500',
  },
});
