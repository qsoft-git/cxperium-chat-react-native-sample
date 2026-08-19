import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import SendButton from '../atoms/SendButton';

/**
 * MOLECULE
 * EN: The text field plus the send button. It owns the draft text and nothing
 *     else — the parent never has to re-render while the user types.
 * TR: Metin alanı ve gönder butonu. Yalnızca taslak metni yönetir, başka
 *     hiçbir şeyi — kullanıcı yazarken üst bileşenin yeniden çizilmesi gerekmez.
 */
export default function Composer({ busy, onSend, placeholder }) {
  const [draft, setDraft] = useState('');

  const canSend = draft.trim().length > 0 && !busy;

  function handleSend() {
    // EN: Clear the field before awaiting the network. If we cleared it after,
    //     a slow connection would let the user keep typing into text that is
    //     about to be wiped.
    // TR: Alanı ağ isteğini beklemeden önce temizle. Sonra temizlersek, yavaş
    //     bağlantıda kullanıcı birazdan silinecek metnin üstüne yazmaya
    //     devam eder.
    const text = draft;
    setDraft('');
    onSend(text);
  }

  return (
    <View style={styles.bar}>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor="#a1a1aa"
        // EN: multiline keeps long messages readable; blurOnSubmit false stops
        //     the keyboard from closing after every send.
        // TR: multiline uzun mesajları okunur tutar; blurOnSubmit false her
        //     gönderimden sonra klavyenin kapanmasını engeller.
        multiline
        blurOnSubmit={false}
        onSubmitEditing={canSend ? handleSend : undefined}
      />
      <SendButton disabled={!canSend} busy={busy} onPress={handleSend} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
    color: '#18181b',
    fontSize: 15,
  },
});
