import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

/**
 * ATOM
 * EN: The send button. Shows a spinner while a message is in flight so the
 *     user does not tap twice.
 * TR: Gönder butonu. Bir mesaj yoldayken dönen gösterge çıkarır; böylece
 *     kullanıcı iki kez dokunmaz.
 */
export default function SendButton({ disabled, busy, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
    >
      {busy ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={styles.text}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    backgroundColor: '#d4d4d8',
  },
  text: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
});
