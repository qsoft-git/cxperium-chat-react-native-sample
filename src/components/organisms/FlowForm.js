import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import FlowField from '../molecules/FlowField';
import FlowText from '../molecules/FlowText';
import {
  FLOW_TEXT,
  INPUT_TYPES,
  applyExchangeResponse,
  bindingContext,
  collectComponents,
  createFormState,
  currentScreen,
  fieldInfo,
  goBack,
  initRequest,
  resolveBool,
  resolveText,
  setExchangeError,
  setValues,
  submitScreen,
  summarizeResponse,
} from '../../services/flowEngine';

/**
 * ORGANISM
 * EN: The full-screen form a bot `form` message opens. It holds the engine
 *     state (screen stack, typed values, errors, busy flag) and nothing
 *     else — every decision is made by flowEngine.js, this file only draws
 *     the result and forwards taps:
 *       Footer  → submitScreen: validate, then navigate / complete /
 *                 data_exchange
 *       Back    → goBack: previous screen, a BACK exchange, or close
 *       onSubmit(form, response, summary) when the form completes (§B)
 *       onExchange(form, action, screenId, data) → Promise<{screen,data}> (§C)
 * TR: Botun `form` mesajının açtığı tam ekran form. Motor durumunu (ekran
 *     yığını, girilen değerler, hatalar, meşgul bayrağı) tutar, başka hiçbir
 *     şeyi — her karar flowEngine.js'te verilir; bu dosya yalnızca sonucu
 *     çizer ve dokunmaları iletir:
 *       Footer  → submitScreen: doğrula, sonra navigate / complete /
 *                 data_exchange
 *       Geri    → goBack: önceki ekran, BACK isteği ya da kapat
 *       Form tamamlanınca onSubmit(form, response, summary) (§B)
 *       onExchange(form, action, screenId, data) → Promise<{screen,data}> (§C)
 */
export default function FlowForm({ form, onClose, onSubmit, onExchange }) {
  const [state, setState] = useState(() => createFormState(form));

  // EN: The latest state for async callbacks, and whether we are still
  //     mounted — a late exchange answer must not touch a closed form.
  // TR: Asenkron geri çağrılar için en güncel durum ve hâlâ bağlı olup
  //     olmadığımız — geç gelen bir exchange cevabı kapanmış forma dokunmamalı.
  const stateRef = useRef(state);
  stateRef.current = state;
  const aliveRef = useRef(true);

  const finish = useCallback(
    (response, finalState) => {
      const summary = summarizeResponse(response, fieldInfo(finalState || stateRef.current));
      onSubmit(form, response, summary);
    },
    [form, onSubmit]
  );

  /**
   * EN: One §C round trip: mark busy, ask the bot, apply the answer. On
   *     failure the error is shown with a Retry button that repeats the same
   *     request.
   * TR: Bir §C gidiş-dönüşü: meşgul işaretle, bota sor, cevabı uygula. Hatada
   *     mesaj, aynı isteği yineleyen Tekrar dene butonuyla gösterilir.
   */
  const runExchange = useCallback(
    async (action, screenId, data, options) => {
      setState((current) => ({ ...current, busy: true, error: null }));
      try {
        const answer = await onExchange(form, action, screenId, data);
        if (!aliveRef.current) return;
        const result = applyExchangeResponse(stateRef.current, answer, options);
        if (result.kind === 'complete') {
          finish(result.response, result.state);
          return;
        }
        setState(result.state);
      } catch (exchangeError) {
        if (!aliveRef.current) return;
        setState((current) =>
          setExchangeError(current, exchangeError?.message, () => runExchange(action, screenId, data, options))
        );
      }
    },
    [finish, form, onExchange]
  );

  useEffect(() => {
    aliveRef.current = true;
    // EN: flow_action "data_exchange": the first real screen comes from the
    //     bot; ask for it right away and REPLACE the placeholder screen.
    // TR: flow_action "data_exchange": ilk gerçek ekran bottan gelir; hemen
    //     iste ve yer tutucu ekranı DEĞİŞTİR.
    const init = initRequest(stateRef.current);
    if (init) runExchange(init.action, init.screenId, init.data, { reset: true });
    return () => {
      aliveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback((name, value) => {
    setState((current) => setValues(current, { [name]: value }));
  }, []);

  const handleFooter = useCallback(() => {
    const result = submitScreen(stateRef.current, {});
    switch (result.kind) {
      case 'complete':
        finish(result.response, result.state);
        return;
      case 'data_exchange':
        setState(result.state);
        runExchange('data_exchange', result.screenId, result.payload);
        return;
      case 'error':
        setState(setExchangeError(result.state, result.message));
        return;
      default:
        setState(result.state);
    }
  }, [finish, runExchange]);

  const handleBack = useCallback(() => {
    const result = goBack(stateRef.current);
    if (result.kind === 'close') {
      onClose();
      return;
    }
    if (result.kind === 'data_exchange') {
      setState(result.state);
      runExchange(result.action, result.screenId, result.payload);
      return;
    }
    setState(result.state);
  }, [onClose, runExchange]);

  // EN: A form without screens cannot be filled — say so instead of showing
  //     an empty sheet.
  // TR: Ekranı olmayan form doldurulamaz — boş bir sayfa yerine bunu söyle.
  if (!state) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.safe}>
          <Header title="" onBack={onClose} onClose={onClose} />
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{FLOW_TEXT.noScreens}</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const top = currentScreen(state);
  const ctx = bindingContext(state, top);
  const { items, footer } = collectComponents(top.screen, ctx);
  const footerLabel = state.busy ? FLOW_TEXT.sending : resolveText(footer?.label, ctx) || FLOW_TEXT.continue;
  const footerEnabled = !state.busy && resolveBool(footer?.enabled, ctx, true);

  return (
    <Modal visible animationType="slide" onRequestClose={handleBack}>
      <SafeAreaView style={styles.safe}>
        <Header title={resolveText(top.screen.title, ctx)} onBack={handleBack} onClose={onClose} />

        {state.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{state.error.message}</Text>
            {state.error.retry ? (
              <TouchableOpacity onPress={state.error.retry} accessibilityRole="button">
                <Text style={styles.retryText}>{FLOW_TEXT.retry}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {top.notice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{top.notice}</Text>
          </View>
        ) : null}

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          {items.map(({ node }, index) =>
            INPUT_TYPES.indexOf(node.type) >= 0 ? (
              <FlowField
                key={node.name || `${node.type}-${index}`}
                node={node}
                ctx={ctx}
                value={top.values[node.name]}
                error={top.errors[node.name]}
                onChange={handleChange}
              />
            ) : (
              <FlowText key={`${node.type}-${index}`} node={node} ctx={ctx} />
            )
          )}
        </ScrollView>

        {footer && resolveBool(footer.visible, ctx, true) ? (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, !footerEnabled && styles.footerButtonDisabled]}
              disabled={!footerEnabled}
              onPress={handleFooter}
              accessibilityRole="button"
            >
              <Text style={styles.footerButtonText}>{footerLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {state.busy ? (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#7c3aed" />
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

/**
 * EN: Back on the left, screen title in the middle, close on the right.
 * TR: Solda geri, ortada ekran başlığı, sağda kapat.
 */
function Header({ title, onBack, onClose }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel={FLOW_TEXT.back} hitSlop={HIT_SLOP}>
        <Text style={styles.headerAction}>‹ {FLOW_TEXT.back}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={FLOW_TEXT.close} hitSlop={HIT_SLOP}>
        <Text style={styles.headerAction}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
    marginHorizontal: 8,
  },
  headerAction: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '500',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    backgroundColor: '#ffffff',
  },
  footerButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  footerButtonDisabled: {
    backgroundColor: '#d4d4d8',
  },
  footerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 13,
  },
  retryText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
  },
  noticeBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fffbeb',
  },
  noticeText: {
    color: '#92400e',
    fontSize: 13,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
