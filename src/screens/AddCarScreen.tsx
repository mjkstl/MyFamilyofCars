import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useFamily } from '@/hooks/useFamily';
import { useCars } from '@/hooks/useCars';
import { searchMakes, getModelsForMake } from '@/utils/nhtsa';

const CURRENT_YEAR = new Date().getFullYear();
const COLORS = ['#DC2626', '#2563EB', '#16A34A', '#EAB308', '#000000', '#FFFFFF', '#71717A', '#EA580C'];

export default function AddCarScreen() {
  const { currentMember } = useFamily();
  const { addCar } = useCars(currentMember?.id);

  const [make, setMake] = useState('');
  const [makeSuggestions, setMakeSuggestions] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [color, setColor] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onMakeChange = async (text: string) => {
    setMake(text);
    setMakeSuggestions(await searchMakes(text));
  };

  const onModelFocus = async () => {
    if (!make || !year) return;
    setModelSuggestions(await getModelsForMake(make, Number(year)));
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add a car photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const reset = () => {
    setMake('');
    setModel('');
    setYear(String(CURRENT_YEAR));
    setColor(null);
    setNickname('');
    setPhotoUri(null);
    setMakeSuggestions([]);
    setModelSuggestions([]);
  };

  const handleSave = async () => {
    if (!make.trim() || !model.trim() || !year.trim()) {
      Alert.alert('Missing info', 'Make, model, and year are required.');
      return;
    }
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < 1885 || yearNum > CURRENT_YEAR + 1) {
      Alert.alert('Check the year', 'Enter a valid model year.');
      return;
    }

    setSaving(true);
    try {
      await addCar(
        {
          make: make.trim(),
          model: model.trim(),
          year: yearNum,
          color: color ?? undefined,
          nickname: nickname.trim() || undefined,
        },
        photoUri ?? undefined
      );
      Alert.alert('Added!', `${yearNum} ${make} ${model} is now in the tree.`);
      reset();
    } catch (err) {
      Alert.alert('Couldn\u2019t save', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!currentMember) {
    return (
      <View style={styles.center}>
        <Text>Loading your profile\u2026</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Add a car</Text>

        <Text style={styles.label}>Make</Text>
        <TextInput style={styles.input} value={make} onChangeText={onMakeChange} placeholder="e.g. Honda" />
        {makeSuggestions.length > 0 && (
          <View style={styles.suggestionBox}>
            {makeSuggestions.map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMake(m);
                  setMakeSuggestions([]);
                }}
              >
                <Text style={styles.suggestion}>{m}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>Year</Text>
        <TextInput
          style={styles.input}
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
          maxLength={4}
        />

        <Text style={styles.label}>Model</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          onFocus={onModelFocus}
          placeholder="e.g. Civic"
        />
        {modelSuggestions.length > 0 && (
          <View style={styles.suggestionBox}>
            {modelSuggestions.slice(0, 8).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setModel(m);
                  setModelSuggestions([]);
                }}
              >
                <Text style={styles.suggestion}>{m}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchSelected]}
            />
          ))}
        </View>

        <Text style={styles.label}>Nickname (optional)</Text>
        <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="e.g. Old Blue" />

        <Text style={styles.label}>Photo</Text>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <Pressable style={styles.photoPicker} onPress={pickPhoto}>
            <Text style={styles.photoPickerText}>Choose a photo</Text>
          </Pressable>
        )}
        {photoUri && (
          <Pressable onPress={pickPhoto}>
            <Text style={styles.changePhoto}>Change photo</Text>
          </Pressable>
        )}

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save car</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 60 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  suggestionBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  suggestion: { padding: 10, fontSize: 15, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#ddd' },
  swatchSelected: { borderWidth: 3, borderColor: '#1D4ED8' },
  photoPicker: {
    height: 140,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#bbb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerText: { color: '#888' },
  photoPreview: { width: '100%', height: 180, borderRadius: 12 },
  changePhoto: { color: '#1D4ED8', textAlign: 'center', marginTop: 8 },
  saveButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
