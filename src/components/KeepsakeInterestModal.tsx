import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { HARDCOVER_FAMILY_BOOK } from '@/config/products';
import { trackEvent } from '@/services/analytics';

export default function KeepsakeInterestModal({
  visible,
  familyId,
  onClose,
}: {
  visible: boolean;
  familyId: string | undefined;
  onClose: () => void;
}) {
  const [format, setFormat] = useState('hardcover');
  const [copies, setCopies] = useState('');
  const [email, setEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!familyId) return;
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Email required', 'Enter a valid email so we can notify you when keepsakes are ready.');
      return;
    }
    if (!marketingOptIn) {
      Alert.alert('Please choose', 'Check the consent box so we can contact you about keepsakes.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('keepsake_interest').insert({
        family_id: familyId,
        product_id: HARDCOVER_FAMILY_BOOK.id,
        format,
        copies_requested: copies.trim() ? Number(copies) : null,
        email: normalizedEmail,
        marketing_opt_in: true,
      });
      if (error) throw error;
      await trackEvent('keepsake_interest_submitted', { product_id: HARDCOVER_FAMILY_BOOK.id, format, has_email: true, marketing_opt_in: true }, familyId);
      setSubmitted(true);
    } catch (error) {
      Alert.alert('Couldn’t save your interest', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {submitted ? (
            <>
              <Text style={styles.title}>Thanks</Text>
              <Text style={styles.body}>Thanks—we’ll let you know when keepsakes are ready.</Text>
              <Pressable style={styles.primary} onPress={onClose}><Text style={styles.primaryText}>Done</Text></Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>Create a keepsake</Text>
              <Text style={styles.body}>Turn your family’s cars and stories into a printed book.</Text>
              <Text style={styles.label}>Format</Text>
              <View style={styles.options}>
                <Pressable style={[styles.option, format === 'hardcover' && styles.optionActive]} onPress={() => setFormat('hardcover')}><Text style={format === 'hardcover' ? styles.optionTextActive : styles.optionText}>Hardcover family book</Text></Pressable>
                <Pressable style={[styles.option, format === 'poster' && styles.optionActive]} onPress={() => setFormat('poster')}><Text style={format === 'poster' ? styles.optionTextActive : styles.optionText}>Poster</Text></Pressable>
                <Pressable style={[styles.option, format === 'cards' && styles.optionActive]} onPress={() => setFormat('cards')}><Text style={format === 'cards' ? styles.optionTextActive : styles.optionText}>Individual car cards</Text></Pressable>
              </View>
              <TextInput accessibilityLabel="Optional number of copies" value={copies} onChangeText={setCopies} keyboardType="number-pad" placeholder="Number of copies (optional)" style={styles.input} />
              <TextInput accessibilityLabel="Email required for notification" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Email for availability updates" style={styles.input} />
              <Pressable style={styles.consent} onPress={() => setMarketingOptIn((value) => !value)}><Text style={styles.checkbox}>{marketingOptIn ? '☑' : '☐'}</Text><Text style={styles.consentText}>I agree to be contacted about keepsakes.</Text></Pressable>
              <Pressable style={styles.primary} onPress={submit} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Let me know</Text>}</Pressable>
              <Pressable onPress={onClose}><Text style={styles.cancel}>Not now</Text></Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 22 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '900' },
  body: { color: '#475569', lineHeight: 20, marginTop: 8 },
  label: { color: '#334155', fontWeight: '800', marginTop: 18, marginBottom: 8 },
  options: { gap: 7 },
  option: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, padding: 10 },
  optionActive: { borderColor: '#1D4ED8', backgroundColor: '#EFF6FF' },
  optionText: { color: '#334155' },
  optionTextActive: { color: '#1D4ED8', fontWeight: '800' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, padding: 11, marginTop: 10 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  checkbox: { fontSize: 19, color: '#1D4ED8' },
  consentText: { color: '#334155', flex: 1 },
  primary: { backgroundColor: '#1D4ED8', borderRadius: 9, padding: 13, alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#fff', fontWeight: '800' },
  cancel: { color: '#64748B', textAlign: 'center', marginTop: 14 },
});
