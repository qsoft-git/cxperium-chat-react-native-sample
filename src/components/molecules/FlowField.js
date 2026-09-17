import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  FLOW_TEXT,
  dataSource,
  fromIsoDate,
  resolveBool,
  resolveText,
  toIsoDate,
} from '../../services/flowEngine';

/**
 * MOLECULE
 * EN: One input of a form screen — label, control, helper text and error.
 *     The control depends on the Flow component type:
 *       TextInput / TextArea      → TextInput (multiline for TextArea)
 *       Dropdown                  → a tappable field that unfolds its options
 *       RadioButtonsGroup         → one row per option, single choice
 *       CheckboxGroup / Chips     → one row per option, multiple choice
 *       OptIn                     → Switch
 *       DatePicker / Calendar     → a text field taking YYYY-MM-DD
 *     It owns no value: `value` comes in, `onChange(name, value)` goes out.
 * TR: Form ekranının tek bir girdisi — etiket, kontrol, yardım metni ve hata.
 *     Kontrol, Flow bileşen tipine göre değişir:
 *       TextInput / TextArea      → TextInput (TextArea için çok satırlı)
 *       Dropdown                  → dokununca seçeneklerini açan alan
 *       RadioButtonsGroup         → seçenek başına bir satır, tek seçim
 *       CheckboxGroup / Chips     → seçenek başına bir satır, çoklu seçim
 *       OptIn                     → Switch
 *       DatePicker / Calendar     → YYYY-MM-DD alan metin kutusu
 *     Kendi değeri yoktur: `value` girer, `onChange(name, value)` çıkar.
 */
export default function FlowField({ node, ctx, value, error, onChange }) {
  const enabled = resolveBool(node.enabled, ctx, true);
  const required = resolveBool(node.required, ctx, false);
  const label = typeof node.label === 'string' ? resolveText(node.label, ctx) : resolveText(node.title, ctx);
  const helper = resolveText(node['helper-text'], ctx);
  const description = resolveText(node.description, ctx);

  const change = (next) => onChange(node.name, next);

  let control;
  switch (node.type) {
    case 'TextInput':
    case 'TextArea':
      control = <TextControl node={node} value={value} enabled={enabled} onChange={change} />;
      break;
    case 'Dropdown':
      control = <DropdownControl node={node} ctx={ctx} value={value} enabled={enabled} onChange={change} />;
      break;
    case 'RadioButtonsGroup':
      control = <OptionsControl node={node} ctx={ctx} value={value} enabled={enabled} multiple={false} onChange={change} />;
      break;
    case 'CheckboxGroup':
    case 'ChipsSelector':
      control = <OptionsControl node={node} ctx={ctx} value={value} enabled={enabled} multiple onChange={change} />;
      break;
    case 'OptIn':
      // EN: OptIn draws its own label next to the switch; skip the one above.
      // TR: OptIn etiketini anahtarın yanına kendisi çizer; üsttekini atla.
      return (
        <View style={styles.field}>
          <View style={styles.optIn}>
            <Switch value={Boolean(value)} disabled={!enabled} onValueChange={change} />
            <Text style={styles.optInLabel}>
              {label}
              {required ? ' *' : ''}
            </Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      );
    case 'DatePicker':
    case 'CalendarPicker':
      control = <DateControl node={node} value={value} enabled={enabled} onChange={change} />;
      break;
    default:
      control = null;
  }

  return (
    <View style={styles.field}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      {description ? <Text style={styles.helper}>{description}</Text> : null}
      {control}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function TextControl({ node, value, enabled, onChange }) {
  const multiline = node.type === 'TextArea';
  const inputType = String(node['input-type'] || 'text');
  const keyboardType =
    { number: 'numeric', passcode: 'number-pad', email: 'email-address', phone: 'phone-pad' }[inputType] ?? 'default';
  const max = node['max-chars'] || node['max-length'];

  return (
    <TextInput
      style={[styles.input, multiline && styles.textArea, !enabled && styles.disabled]}
      value={value == null ? '' : String(value)}
      onChangeText={onChange}
      editable={enabled}
      multiline={multiline}
      keyboardType={keyboardType}
      secureTextEntry={inputType === 'password' || inputType === 'passcode'}
      autoCapitalize={inputType === 'email' ? 'none' : 'sentences'}
      maxLength={max ? Number(max) : undefined}
      placeholderTextColor="#a1a1aa"
    />
  );
}

function DropdownControl({ node, ctx, value, enabled, onChange }) {
  const [open, setOpen] = useState(false);
  const options = dataSource(node, ctx);
  const selected = options.find((option) => String(option.id) === String(value));

  return (
    <View>
      <TouchableOpacity
        style={[styles.input, styles.dropdown, !enabled && styles.disabled]}
        disabled={!enabled}
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
      >
        <Text style={selected ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {selected ? resolveText(selected.title, ctx) : FLOW_TEXT.select}
        </Text>
        <Text style={styles.dropdownArrow}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.optionList}>
          {options.map((option) => (
            <OptionRow
              key={String(option.id)}
              title={resolveText(option.title, ctx)}
              description={resolveText(option.description, ctx)}
              selected={String(option.id) === String(value)}
              disabled={!enabled || option.enabled === false}
              onPress={() => {
                onChange(option.id);
                setOpen(false);
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function OptionsControl({ node, ctx, value, enabled, multiple, onChange }) {
  const options = dataSource(node, ctx);
  const selected = multiple ? (Array.isArray(value) ? value.map(String) : []) : value == null ? null : String(value);
  const max = Number(node['max-selected-items']) || 0;

  function toggle(option) {
    if (!multiple) {
      onChange(option.id);
      return;
    }
    const current = Array.isArray(value) ? value.slice() : [];
    const index = current.map(String).indexOf(String(option.id));
    if (index >= 0) current.splice(index, 1);
    else if (!max || current.length < max) current.push(option.id);
    else return;
    onChange(current);
  }

  return (
    <View style={styles.optionList}>
      {options.map((option) => (
        <OptionRow
          key={String(option.id)}
          title={resolveText(option.title, ctx)}
          description={resolveText(option.description, ctx)}
          selected={multiple ? selected.indexOf(String(option.id)) >= 0 : selected === String(option.id)}
          disabled={!enabled || option.enabled === false}
          multiple={multiple}
          onPress={() => toggle(option)}
        />
      ))}
    </View>
  );
}

function OptionRow({ title, description, selected, disabled, multiple, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, disabled }}
    >
      <Text style={styles.optionMark}>{selected ? (multiple ? '☑' : '◉') : multiple ? '☐' : '○'}</Text>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        {description ? <Text style={styles.helper}>{description}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function DateControl({ node, value, enabled, onChange }) {
  // EN: The stored value follows Meta (DatePicker = ms timestamp string,
  //     CalendarPicker = YYYY-MM-DD); the user always types YYYY-MM-DD.
  //     Until the text is a full date we keep the raw text so typing works.
  // TR: Saklanan değer Meta'yı izler (DatePicker = ms zaman damgası metni,
  //     CalendarPicker = YYYY-MM-DD); kullanıcı hep YYYY-MM-DD yazar. Metin
  //     tam bir tarih olana kadar ham metin tutulur ki yazmak mümkün olsun.
  const [draft, setDraft] = useState(toIsoDate(value));

  function handleChange(text) {
    setDraft(text);
    onChange(/^\d{4}-\d{2}-\d{2}$/.test(text) ? fromIsoDate(text, node.type) : text || undefined);
  }

  return (
    <TextInput
      style={[styles.input, !enabled && styles.disabled]}
      value={draft}
      onChangeText={handleChange}
      editable={enabled}
      placeholder="YYYY-MM-DD"
      placeholderTextColor="#a1a1aa"
      keyboardType="numbers-and-punctuation"
      maxLength={10}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 6,
  },
  helper: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    color: '#b91c1c',
    marginTop: 4,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#fafafa',
    color: '#18181b',
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  disabled: {
    opacity: 0.5,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    color: '#18181b',
    fontSize: 15,
  },
  dropdownPlaceholder: {
    color: '#a1a1aa',
    fontSize: 15,
  },
  dropdownArrow: {
    color: '#71717a',
    fontSize: 14,
  },
  optionList: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  optionSelected: {
    backgroundColor: '#f5f3ff',
  },
  optionMark: {
    width: 24,
    fontSize: 16,
    color: '#7c3aed',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    color: '#18181b',
  },
  optIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optInLabel: {
    flex: 1,
    fontSize: 14,
    color: '#18181b',
  },
});
