import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFamily } from '@/hooks/useFamily';
import AppLogoHeader from '@/components/AppLogoHeader';

type Mode = 'choose' | 'create' | 'join';

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { createFamily, joinFamily } = useFamily();
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Alert.alert() is a silent no-op on React Native Web — it renders
  // nothing at all there, so a caught error would fail invisibly. Track
  // errors in state and render them on screen instead, on every platform.
  const [formError, setFormError] = useState<string | null>(null);

  const goToMode = (next: Mode) => {
    setFormError(null);
    setMode(next);
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!familyName.trim() || !name.trim()) {
      setFormError('Enter both a family name and your name.');
      return;
    }
    setSubmitting(true);
    try {
      await createFamily(familyName.trim(), name.trim(), avatarUri);
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

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container}>
        <AppLogoHeader compact />
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
        <AppLogoHeader compact />
        <Text style={styles.title}>Start your family</Text>

        <Pressable style={styles.avatarPicker} onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>Add your photo{'\n'}(optional)</Text>
          )}
        </Pressable>

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
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#EEF4FF' },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 20 },
  avatarPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEF2FF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#4338CA', fontSize: 11, textAlign: 'center', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#D5DEEF', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#FFFFFF' },
  primaryButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { padding: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#1D4ED8', fontWeight: '500', fontSize: 15 },
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
