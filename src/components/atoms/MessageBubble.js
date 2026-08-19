import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * ATOM
 * EN: One speech bubble. It knows nothing about the chat — you give it text
 *     and tell it which side it belongs to.
 * TR: Tek bir konuşma balonu. Sohbetle ilgili hiçbir şey bilmez — ona metni
 *     verir ve hangi tarafa ait olduğunu söylersiniz.
 */
export default function MessageBubble({ text, isMine }) {
  return (
    <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
      <Text style={isMine ? styles.mineText : styles.theirsText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  // EN: The user's own messages: filled, right-hand side.
  // TR: Kullanıcının kendi mesajları: dolu renk, sağ taraf.
  mine: {
    backgroundColor: '#7c3aed',
    borderBottomRightRadius: 4,
  },
  mineText: {
    color: '#ffffff',
    fontSize: 15,
  },
  // EN: Bot / agent messages: light, left-hand side.
  // TR: Bot / temsilci mesajları: açık renk, sol taraf.
  theirs: {
    backgroundColor: '#f4f4f5',
    borderBottomLeftRadius: 4,
  },
  theirsText: {
    color: '#18181b',
    fontSize: 15,
  },
});
