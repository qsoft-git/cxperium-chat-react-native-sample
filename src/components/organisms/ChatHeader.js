import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ConnectionDot from '../atoms/ConnectionDot';

/**
 * ORGANISM
 * EN: The bar at the top: who you are talking to and whether the realtime
 *     connection is alive.
 * TR: Üstteki çubuk: kiminle konuştuğunuz ve anlık bağlantının ayakta olup
 *     olmadığı.
 */
export default function ChatHeader({ title, status }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.statusRow}>
        <ConnectionDot status={status} />
        <Text style={styles.statusText}>{STATUS_LABELS[status] ?? status}</Text>
      </View>
    </View>
  );
}

// EN: Kept next to the component because it is presentation, not logic.
// TR: Mantık değil sunum olduğu için bileşenin yanında duruyor.
const STATUS_LABELS = {
  connected: 'Online',
  connecting: 'Connecting…',
  disconnected: 'Reconnecting…',
  error: 'Offline',
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#71717a',
  },
});
