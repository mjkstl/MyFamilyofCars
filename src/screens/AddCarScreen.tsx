import React, { useMemo, useState } from 'react';
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
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { useCars } from '@/hooks/useCars';
import { searchMakes, getModelsForMake } from '@/utils/nhtsa';
import { CAR_COLORS } from '@/utils/carColors';
import type { Car } from '@/types/database';

const CURRENT_YEAR = new Date().getFullYear();

// This screen is mounted three different ways: as the bare "Add Car" tab
// (no route params — defaults to yourself), as a stack screen pushed from
// a member's carousel "+" button (params.member preselected), and as that
// same stack screen pushed from a car's "Edit" link (params.car also set,
// switching the whole screen into edit mode for that car).
type AddCarRouteProp = RouteProp<{ AddCarForMember: { member?: { id: string }; car?: Car } }, 'AddCarForMember'>;

export default function AddCarScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddCarRouteProp>();
  const { family, currentMember } = useFamily();
  const { members } = useMembers(family?.id);

  const editingCar = route.params?.car ?? null;
  const isEditMode = !!editingCar;

  const preselectedMemberId = route.params?.member?.id;
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(
    preselectedMemberId ?? currentMember?.id
  );
  const effectiveMemberId = selectedMemberId ?? preselectedMemberId ?? currentMember?.id;
  const selectedMember = useMemo(
    () => members.find((m) => m.id === effectiveMemberId),
    [members, effectiveMemberId]
  );

  const { addCar, updateCar } = useCars(effectiveMemberId);

  const [make, setMake] = useState(editingCar?.make ?? '');
  const [makeSuggestions, setMakeSuggestions] = useState<string[]>([]);
  const [model, setModel] = useState(editingCar?.model ?? '');
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [year, setYear] = useState(editingCar ? String(editingCar.year) : String(CURRENT_YEAR));
  const [color, setColor] = useState<string | null>(editingCar?.color ?? null);
  const [nickname, setNickname] = useState(editingCar?.nickname ?? '');
  const [memories, setMemories] = useState(editingCar?.memories ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewPhotoUri = photoUri ?? editingCar?.photo_url ?? null;

  const onMakeChange = async (text: string) => {
    setMake(text);
    setModel('');
    if (text.trim().length > 0) {
      const results = await searchMakes(text);
      setMakeSuggestions(results);
    } else {
      setMakeSuggestions([]);
    }
  };

  const onModelFocus = async () => {
    if (!make || !year) return;
    const models = await getModelsForMake(make, Number(year));
    setModelSuggestions(models);
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

  // No phone photo on hand? Open a Google Images search for this exact
  // car so the person can find a picture themselves, save it to their
  // phone, and upload it with the button above. Deliberately NOT an
  // automated stock-photo API right now — that's on hold pending a
  // pricing decision, so this is the zero-cost, zero-dependency stand-in.
  const handleSearchForMyCar = () => {
    if (!make.trim() || !model.trim()) {
      Alert.alert('A couple details first', 'Enter make and model, then we can search for photos.');
      return;
    }
    const query = encodeURIComponent(`${year} ${make} ${model}`.trim());
    Linking.openURL(`https://www.google.com/search?tbm=isch&q=${query}`);
  };

  const reset = () => {
    setMake('');
    setModel('');
    setYear(String(CURRENT_YEAR));
    setColor(null);
    setNickname('');
    setMemories('');
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
      const carDetails = {
        make: make.trim(),
        model: model.trim(),
        year: yearNum,
        color: color ?? undefined,
        nickname: nickname.trim() || undefined,
        memories: memories.trim() || undefined,
      };

      if (isEditMode && editingCar) {
        const reassigned = effectiveMemberId && effectiveMemberId !== editingCar.member_id;
        await updateCar(
          editingCar.id,
          { ...carDetails, ...(reassigned ? { member_id: effectiveMemberId } : {}) },
          photoUri ?? undefined
        );
        const savedMsg = reassigned
          ? `${yearNum} ${make} ${model} has been updated and moved to ${selectedMember?.display_name}.`
          : `${yearNum} ${make} ${model} has been updated.`;
        Alert.alert('Saved', savedMsg);
      } else {
        await addCar(carDetails, photoUri ?? undefined);
        const forName = selectedMember?.display_name ?? 'the tree';
        Alert.alert('Added!', `${yearNum} ${make} ${model} is now in ${forName}'s carousel.`);
        reset();
      }

      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Couldn\u2019t save', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!effectiveMemberId) {
    return (
      <View style={styles.center}>
        <Text>Loading your profile…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{isEditMode ? 'Edit car' : 'Add a car'}</Text>

        {members.length > 1 && (
          <>
            <Text style={styles.label}>{isEditMode ? 'Reassign to' : 'Whose car is this?'}</Text>
            <View style={styles.memberRow}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedMemberId(m.id)}
                  style={[styles.memberChip, m.id === effectiveMemberId && styles.memberChipSelected]}
                >
                  <Text
                    style={[
                      styles.memberChipText,
                      m.id === effectiveMemberId && styles.memberChipTextSelected,
                    ]}
                  >
                    {m.display_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Year</Text>
        <TextInput
          style={styles.input}
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
          maxLength={4}
        />

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

        <Text style={styles.label}>Color{color ? ` — ${color}` : ''}</Text>
        <View style={styles.colorRow}>
          {CAR_COLORS.map((c) => (
            <Pressable
              key={c.name}
              onPress={() => setColor(c.name)}
              accessibilityLabel={c.name}
              style={[
                styles.swatch,
                { backgroundColor: c.hex },
                c.hex === '#FFFFFF' && styles.swatchOutline,
                color === c.name && styles.swatchSelected,
              ]}
            />
          ))}
        </View>

        <Text style={styles.label}>Nickname (optional)</Text>
        <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="e.g. Old Blue" />

        <Text style={styles.label}>Photo</Text>
        {previewPhotoUri ? (
          <Image source={{ uri: previewPhotoUri }} style={styles.photoPreview} />
        ) : (
          <View style={[styles.photoPreview, styles.photoFallback]}>
            <Text style={styles.photoFallbackText}>No photo yet</Text>
          </View>
        )}
        <View style={styles.photoActionsRow}>
          <Pressable style={styles.photoActionButton} onPress={pickPhoto}>
            <Text style={styles.photoActionText}>{photoUri ? 'Change photo' : 'Choose from phone'}</Text>
          </Pressable>
          <Pressable
            style={[styles.photoActionButton, styles.photoActionButtonSecondary]}
            onPress={handleSearchForMyCar}
          >
            <Text style={[styles.photoActionText, styles.photoActionTextSecondary]}>
              Don't have a photo? Search for my car
            </Text>
          </Pressable>
        </View>
        <Text style={styles.searchHint}>
          Opens a Google Images search in your browser — save a photo you like, then use "Choose from phone" above to add it.
        </Text>

        <Text style={styles.label}>Memories (optional)</Text>
        <TextInput
          style={[styles.input, styles.memoriesInput]}
          value={memories}
          onChangeText={setMemories}
          placeholder="Road trips, first drives, funny stories..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{isEditMode ? 'Save changes' : 'Save car'}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, gap: 4 },
  heading: { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  suggestionBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 4, maxHeight: 180 },
  suggestion: { padding: 10, fontSize: 15, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  memberChipSelected: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  memberChipText: { fontSize: 14, color: '#333', fontWeight: '500' },
  memberChipTextSelected: { color: '#fff' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#ddd' },
  swatchOutline: { borderWidth: 1.5, borderColor: '#bbb' },
  swatchSelected: { borderWidth: 3, borderColor: '#1D4ED8' },
  photoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f2' },
  photoFallbackText: { color: '#999' },
  photoPreview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#eee' },
  photoActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  photoActionButton: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    alignItems: 'center',
  },
  photoActionButtonSecondary: { borderColor: '#ddd' },
  photoActionText: { color: '#1D4ED8', fontWeight: '600', fontSize: 13 },
  photoActionTextSecondary: { color: '#555', fontWeight: '500' },
  searchHint: { fontSize: 11, color: '#999', marginTop: 6, fontStyle: 'italic' },
  memoriesInput: { minHeight: 90 },
  saveButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
