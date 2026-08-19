import React from 'react';
import { StyleSheet, Text } from 'react-native';

/**
 * ATOM
 * EN: The small time label under a message.
 * TR: Bir mesajın altındaki küçük saat etiketi.
 */
export default function Timestamp({ unixSeconds, align = 'left' }) {
  // EN: The API sends seconds; JavaScript's Date wants milliseconds. Forgetting
  //     this is why timestamps sometimes show 1970.
  // TR: API saniye gönderir; JavaScript'in Date'i milisaniye ister. Zaman
  //     damgalarının bazen 1970 göstermesinin sebebi bunun unutulmasıdır.
  const date = new Date((unixSeconds ?? 0) * 1000);

  const label = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Text style={[styles.text, align === 'right' ? styles.right : styles.left]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    color: '#a1a1aa',
    marginTop: 2,
  },
  left: { textAlign: 'left' },
  right: { textAlign: 'right' },
});
