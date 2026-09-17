import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Composer from '../molecules/Composer';
import ChatHeader from '../organisms/ChatHeader';
import FlowForm from '../organisms/FlowForm';
import MessageList from '../organisms/MessageList';

/**
 * TEMPLATE
 * EN: Pure layout: header on top, list in the middle, composer at the bottom,
 *     and the form modal over everything while a form is open. It receives
 *     everything as props and holds no state, so you can drop it into any
 *     screen or navigator.
 * TR: Saf yerleşim: üstte başlık, ortada liste, altta yazma alanı ve bir form
 *     açıkken her şeyin üstünde form penceresi. Her şeyi prop olarak alır ve
 *     durum tutmaz; bu yüzden istediğiniz ekrana ya da gezinme yapısına
 *     yerleştirebilirsiniz.
 */
export default function ChatTemplate({
  title,
  status,
  error,
  messages,
  busy,
  onSend,
  onChoose,
  placeholder,
  activeForm,
  answeredForms,
  onOpenForm,
  onCloseForm,
  onSubmitForm,
  onExchange,
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        // EN: iOS needs "padding" to lift the composer above the keyboard;
        //     Android handles it via the manifest and needs nothing here.
        // TR: iOS'ta yazma alanını klavyenin üstüne çıkarmak için "padding"
        //     gerekir; Android bunu manifest üzerinden halleder, burada bir
        //     şey gerekmez.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ChatHeader title={title} status={status} />

        {/* EN: Errors are shown, never swallowed — a silent failure looks
                exactly like a bot that has nothing to say.
            TR: Hatalar gösterilir, asla yutulmaz — sessiz bir hata, söyleyecek
                sözü olmayan bir bottan ayırt edilemez. */}
        {error ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.flex}>
          <MessageList
            messages={messages}
            busy={busy}
            onChoose={onChoose}
            onOpenForm={onOpenForm}
            answeredForms={answeredForms}
          />
        </View>

        <Composer busy={busy} onSend={onSend} placeholder={placeholder} />
      </KeyboardAvoidingView>

      {/* EN: One form at a time. The modal unmounts when the form closes, so
              a re-opened form always starts from its first screen.
          TR: Bir anda tek form. Form kapanınca pencere kaldırılır; yeniden
              açılan form hep ilk ekranından başlar. */}
      {activeForm ? (
        <FlowForm
          form={activeForm}
          onClose={onCloseForm}
          onSubmit={onSubmitForm}
          onExchange={onExchange}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flex: { flex: 1 },
  errorBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
});
