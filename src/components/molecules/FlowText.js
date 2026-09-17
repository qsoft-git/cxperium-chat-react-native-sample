import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { resolveText } from '../../services/flowEngine';

/**
 * MOLECULE
 * EN: The read-only components of a form screen: TextHeading, TextSubheading,
 *     TextBody, TextCaption, RichText. Any type this sample does not know
 *     (Image, NavigationList, PhotoPicker…) ALSO lands here and is printed as
 *     text, so a newer flow never looks like an empty screen.
 * TR: Form ekranının salt-okunur bileşenleri: TextHeading, TextSubheading,
 *     TextBody, TextCaption, RichText. Bu örneğin tanımadığı her tip (Image,
 *     NavigationList, PhotoPicker…) DE buraya düşer ve metin olarak basılır;
 *     böylece daha yeni bir akış asla boş ekran gibi görünmez.
 */
export default function FlowText({ node, ctx }) {
  const text = resolveText(node.text, ctx);

  switch (node.type) {
    case 'TextHeading':
      return <Text style={styles.heading}>{text}</Text>;
    case 'TextSubheading':
      return <Text style={styles.subheading}>{text}</Text>;
    case 'TextCaption':
      return <Text style={styles.caption}>{text}</Text>;
    case 'TextBody':
    case 'RichText':
      return <Text style={styles.body}>{text}</Text>;
    default: {
      // EN: Unknown component: show its label/text (or its type) rather than
      //     nothing. The user then at least sees that something is there.
      // TR: Bilinmeyen bileşen: hiçbir şey yerine etiketini/metnini (ya da
      //     tipini) göster. Kullanıcı en azından orada bir şey olduğunu görür.
      const fallback = text || resolveText(node.label, ctx) || `[${node.type}]`;
      return <Text style={styles.unknown}>{fallback}</Text>;
    }
  }
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    color: '#27272a',
    marginBottom: 8,
    lineHeight: 21,
  },
  caption: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 8,
  },
  unknown: {
    fontSize: 14,
    color: '#71717a',
    fontStyle: 'italic',
    marginBottom: 8,
  },
});
