import { registerRootComponent } from 'expo';

import App from './App';

/**
 * EN: The native entry point. React Native looks for a root component
 *     registered under the name "main"; exporting a component from App.js is
 *     not enough on its own — without this call the app fails to start with
 *     "main has not been registered".
 * TR: Yerel giriş noktası. React Native "main" adıyla kaydedilmiş bir kök
 *     bileşen arar; App.js'ten bileşen export etmek tek başına yetmez — bu
 *     çağrı olmadan uygulama "main has not been registered" hatasıyla açılmaz.
 */
registerRootComponent(App);
