/**
 * EN: Renders MessageRow with react-test-renderer to check that a bot `form`
 *     message shows its CTA and that tapping it hands the message back.
 * TR: MessageRow'u react-test-renderer ile çizer; botun `form` mesajının
 *     CTA'sını gösterdiğini ve dokununca mesajı geri verdiğini doğrular.
 */
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, create } from 'react-test-renderer';

import MessageRow from '../src/components/molecules/MessageRow';
import { FLOW_TEXT } from '../src/services/flowEngine';

// EN: The first react-native render under jest transpiles a lot of modules;
//     on a cold cache it can exceed jest's default 5 s. This is startup cost,
//     not a slow component.
// TR: jest altındaki ilk react-native çizimi çok sayıda modülü derler; soğuk
//     önbellekte jest'in varsayılan 5 sn'sini aşabilir. Bu açılış maliyetidir,
//     yavaş bir bileşen değil.
jest.setTimeout(60000);

const FORM_MESSAGE = {
  id: 'm1',
  seq: 58,
  ts: 1789000000,
  type: 'form',
  direction: 'out',
  text: 'Kayıt\nBilgilerinizi girin\nCXPerium',
  form: {
    token: 'MyBot.Dialogs.KayitDialog&u_42',
    name: 'kayit_formu',
    version: 3,
    cta: 'Formu Aç',
    action: 'navigate',
    screen: 'GIRIS',
    data: {},
    screens: [{ id: 'GIRIS', title: 'Kayıt', layout: { children: [] } }],
  },
};

function textsOf(tree) {
  return tree.root.findAllByType(Text).map((node) => node.props.children).flat().filter((c) => typeof c === 'string');
}

describe('MessageRow with a form message', () => {
  test('renders the text and the CTA, and tapping the CTA opens the form', async () => {
    const onOpenForm = jest.fn();
    let tree;
    await act(async () => {
      tree = create(<MessageRow message={FORM_MESSAGE} onOpenForm={onOpenForm} />);
    });

    const texts = textsOf(tree);
    expect(texts).toContain('Kayıt\nBilgilerinizi girin\nCXPerium');
    expect(texts).toContain('Formu Aç');

    const cta = tree.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === 'Formu Aç');
    expect(cta).toBeDefined();
    await act(async () => {
      cta.props.onPress();
    });
    expect(onOpenForm).toHaveBeenCalledWith(FORM_MESSAGE);
  });

  test('a disabled CTA and a missing cta label fall back sensibly', async () => {
    let tree;
    await act(async () => {
      tree = create(
        <MessageRow message={{ ...FORM_MESSAGE, form: { ...FORM_MESSAGE.form, cta: undefined } }} onOpenForm={() => {}} formDisabled />
      );
    });
    const cta = tree.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === FLOW_TEXT.open);
    expect(cta).toBeDefined();
    expect(cta.props.disabled).toBe(true);
  });

  test('our own form reply shows the summary and no CTA', async () => {
    let tree;
    await act(async () => {
      tree = create(
        <MessageRow
          message={{ id: 'm2', ts: 1, type: 'form', direction: 'in', form: { token: 't', response: { ad: 'Ahmet' } } }}
        />
      );
    });
    expect(textsOf(tree)).toContain(`${FLOW_TEXT.sent}\nad: Ahmet`);
    expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  });
});
