import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useFamily } from '@/hooks/useFamily';

type Mode = 'choose' | 'create' | 'join';

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { createFamily, joinFamily } = useFamily();
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Alert.alert() is a silent no-op on React Native Web — on web it renders
  // nothing at all, so a caught error would fail invisibly. Track errors in
  // state and render them on screen instead, on every platform.
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    setFormError(null);
    if (!familyName.trim() || !name.trim()) {
      setFormError('Enter both a family name and your name.');
      return;
    }
    setSubmitting(true);
    try {
      await createFamily(familyName.trim(), name.trim());
      onComplete();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    setFormError(null);
    if (!inviteCode.trim() || !name.trim()) {
      setFormError('Enter the invite code and your name.');
      return;
    }
    setSubmitting(true);
    try {
      await joinFamily(inviteCode.trim(), name.trim());
      onComplete();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const goToMode = (next: Mode) => {
    setFormError(null);
    setMode(next);
  };

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>My Family of Cars</Text>
        <Text style={styles.subtitle}>Every car your family has ever owned, in one place.</Text>
        <Pressable style={styles.primaryButton} onPress={() => goToMode('create')}>
          <Text style={styles.primaryButtonText}>Start a new family</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => goToMode('join')}>
          <Text style={styles.secondaryButtonText}>Join with an invite code</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (mode === 'create') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Start your family</Text>
        <TextInput
          style={styles.input}
          placeholder="Family name (e.g. The Keegans)"
          value={familyName}
          onChangeText={setFamilyName}
        />
        <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
        {formError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={handleCreate} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create</Text>}
        </Pressable>
        <Pressable onPress={() => goToMode('choose')}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Join a family</Text>
      <TextInput
        style={styles.input}
        placeholder="Invite code"
        autoCapitalize="none"
        value={inviteCode}
        onChangeText={setInviteCode}
      />
      <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
      {formError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      ) : null}
      <Pressable style={styles.primaryButton} onPress={handleJoin} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Join</Text>}
      </Pressable>
      <Pressable onPress={() => goToMode('choose')}>
        <Text style={styles.backLink}>Back</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { padding: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#1D4ED8', fontSize: 15, fontWeight: '500' },
  backLink: { textAlign: 'center', color: '#888', marginTop: 12 },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: '#B91C1C', fontSize: 14, lineHeight: 20 },
});
