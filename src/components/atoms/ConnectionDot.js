import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * ATOM
 * EN: A coloured dot showing the realtime connection state. Worth having:
 *     without it, a dropped socket looks exactly like a quiet bot.
 * TR: Anlık bağlantı durumunu gösteren renkli nokta. Bulunması değerli:
 *     olmadığında kopmuş bir soket ile sessiz bir bot birbirinden ayırt edilemez.
 */
export default function ConnectionDot({ status }) {
  return <View style={[styles.dot, styles[status] ?? styles.connecting]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connected: { backgroundColor: '#16a34a' },
  connecting: { backgroundColor: '#f59e0b' },
  disconnected: { backgroundColor: '#f59e0b' },
  error: { backgroundColor: '#dc2626' },
});
