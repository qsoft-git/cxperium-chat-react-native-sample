import React from 'react';

import ChatScreen from './src/screens/ChatScreen';

/**
 * EN: The entry point. In your own app you would render <ChatScreen /> from
 *     wherever your navigation puts the support screen — it does not have to
 *     be the root.
 * TR: Giriş noktası. Kendi uygulamanızda <ChatScreen /> bileşenini gezinme
 *     yapınızın destek ekranını koyduğu yerden çizersiniz — kök olmak zorunda
 *     değildir.
 */
export default function App() {
  // EN: Pass the signed-in person's name if you have one. It is shown to the
  //     agent in the panel, so "Guest" is a poor default in production.
  // TR: Oturum açmış kişinin adı varsa gönderin. Bu ad panelde temsilciye
  //     gösterilir; bu yüzden canlıda "Guest" zayıf bir varsayılandır.
  return <ChatScreen displayName="Guest" />;
}
