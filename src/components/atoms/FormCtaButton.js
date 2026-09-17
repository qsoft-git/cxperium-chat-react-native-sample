import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

/**
 * ATOM
 * EN: The "Open form" button under a bot `form` message. Disabled once the
 *     form has been answered — a form is single-use, like a choices message.
 * TR: Botun `form` mesajının altındaki "Formu aç" butonu. Form cevaplanınca
 *     kapanır — form, seçenek mesajı gibi tek kullanımlıktır.
 */
export default function FormCtaButton({ title, disabled, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
