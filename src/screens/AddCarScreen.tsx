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
  Share,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { useCars } from '@/hooks/useCars';
import { searchMakes, getModelsForMake } from '@/utils/nhtsa';
import { CAR_COLORS } from '@/utils/carColors';
import type { Car, CarStatus } from '@/types/database';
import AppLogoHeader from '@/components/AppLogoHeader';
import { useAllFamilyCars, type FamilyCar } from '@/hooks/useAllFamilyCars';

const CURRENT_YEAR = new Date().getFullYear();
const DECADES = [1980, 1990, 2000, 2010, 2020];

const STATUS_OPTIONS: { value: CarStatus; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'current', label: 'Currently Driving', icon: 'circle' },
  { value: 'memory', label: 'Memory', icon: 'image-multiple' },
  { value: 'dream', label: 'Dream Car', icon: 'star' },
];

// This screen is mounted three different ways: as the bare "Add Car" tab
// (no route params — defaults to yourself), as a stack screen pushed from
// a member's carousel "+" button (params.member preselected), and as that
// same stack screen pushed from a car's "Edit" link (params.car also set,
// switching the whole screen into edit mode for that car).
type AddCarRouteProp = RouteProp<{ AddCarForMember: { member?: { id: string }; car?: Car } }, 'AddCarForMember'>;

/** The decade a year falls in, purely for the "Era" display badge below —
 * this is deliberately NOT a separate stored field. Deriving it from Year
 * means it can never disagree with what the person actually entered, and
 * there's no extra input for them to keep in sync. */
function deriveEra(yearStr: string): number | null {
  const y = Number(yearStr);
  if (!Number.isInteger(y) || y < 1900) return null;
  return Math.floor(y / 10) * 10;
}

function formatOrdinal(value: number): string {
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th';
  return `${value}${suffix}`;
}

export default function AddCarScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddCarRouteProp>();
  const { family, currentMember } = useFamily();
  const { members, refresh: refreshMembers } = useMembers(family?.id);

  useFocusEffect(
    React.useCallback(() => {
      refreshMembers();
    }, [refreshMembers])
  );

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
  const { cars: familyCars } = useAllFamilyCars(family?.id);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [savedCar, setSavedCar] = useState<FamilyCar | null>(null);
  const [savedCarNumber, setSavedCarNumber] = useState(1);

  const [nickname, setNickname] = useState(editingCar?.nickname ?? '');
  const [trim, setTrim] = useState(editingCar?.trim ?? '');
  const [make, setMake] = useState(editingCar?.make ?? '');
  const [makeSuggestions, setMakeSuggestions] = useState<string[]>([]);
  const [model, setModel] = useState(editingCar?.model ?? '');
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [year, setYear] = useState(editingCar ? String(editingCar.year) : String(CURRENT_YEAR));
  const [status, setStatus] = useState<CarStatus>(editingCar?.status ?? 'current');
  const [color, setColor] = useState<string | null>(editingCar?.color ?? null);
  const [memories, setMemories] = useState(editingCar?.memories ?? '');
  const [funFact, setFunFact] = useState(editingCar?.fun_fact ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const era = deriveEra(year);
  const previewPhotoUri = photoUri ?? editingCar?.photo_url ?? null;
  const searchDetails = [year.trim(), make.trim(), model.trim(), color?.trim(), trim.trim()].filter(Boolean).join(' ');
  const searchLabel = searchDetails
    ? `Don't have a photo, Search for my car: ${searchDetails}`
    : "Don't have a photo, Search for my car";

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
  // automated stock-photo API — that's on hold pending a pricing
  // decision, so this is the zero-cost, zero-dependency stand-in.
  const handleSearchForMyCar = async () => {
    const query = encodeURIComponent(searchDetails || 'car');
    const url = `https://www.google.com/search?tbm=isch&q=${query}`;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        await Linking.openURL(url);
      }
    } catch (err) {
      Alert.alert('Couldn’t open image search', err instanceof Error ? err.message : String(err));
    }
  };

  const reset = () => {
    setNickname('');
    setTrim('');
    setMake('');
    setModel('');
    setYear(String(CURRENT_YEAR));
    setStatus('current');
    setColor(null);
    setMemories('');
    setFunFact('');
    setPhotoUri(null);
    setMakeSuggestions([]);
    setModelSuggestions([]);
  };

  const handleSave = async () => {
    if (!make.trim() || !model.trim() || !year.trim()) {
      Alert.alert('Missing info', 'Make, model, and year are required to save the car.');
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
        nickname: nickname.trim(),
        trim: trim.trim() || undefined,
        make: make.trim(),
        model: model.trim(),
        year: yearNum,
        status,
        color: color ?? undefined,
        memories: memories.trim() || undefined,
        fun_fact: funFact.trim() || undefined,
      };

      if (isEditMode && editingCar) {
        const reassigned = effectiveMemberId && effectiveMemberId !== editingCar.member_id;
        await updateCar(
          editingCar.id,
          { ...carDetails, ...(reassigned ? { member_id: effectiveMemberId } : {}) },
          photoUri ?? undefined
        );
      } else {
        const addedCar = await addCar(carDetails, photoUri ?? undefined);
        setSavedCarNumber(familyCars.length + 1);
        setSavedCar({ ...(addedCar as Car), member_display_name: selectedMember?.display_name ?? 'Family', photos: [] });
        setSaving(false);
        return;
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

  const handleInviteFamily = async () => {
    if (!family?.invite_code) return;
    try {
      await Share.share({
        message: `Join our family on My Family of Cars! Use invite code: ${family.invite_code}`,
      });
    } catch (err) {
      Alert.alert('Couldn’t share invite', err instanceof Error ? err.message : String(err));
    }
  };

  if (savedCar) {
    return (
      <SafeAreaView style={styles.successScreen}>
        <AppLogoHeader compact />
        <Text style={styles.successTitle}>Your family’s {formatOrdinal(savedCarNumber)} car has a home.</Text>
        <Text style={styles.successCar}>
          {savedCar.year} {savedCar.make} {savedCar.model}
        </Text>
        <Text style={styles.successDriver}>Connected to {savedCar.member_display_name}</Text>
        <Pressable style={styles.primarySuccessButton} onPress={handleInviteFamily}>
          <Text style={styles.primaryButtonText}>Invite family</Text>
        </Pressable>
        <Pressable style={styles.secondarySuccessButton} onPress={() => { setSavedCar(null); reset(); }}>
          <Text style={styles.secondaryButtonText}>Add another car</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>View Family Tree</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!effectiveMemberId) {
    return (
      <View style={styles.center}>
        <Text>Loading your profile…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel="Close"
          style={styles.closeButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : undefined)}
        >
          <MaterialCommunityIcons name="close" size={20} color="#374151" />
        </Pressable>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit a Family Car' : 'Add a Family Car'}</Text>
        <Pressable style={styles.saveChip} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
              <Text style={styles.saveChipText}>Save</Text>
            </>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Person this car is connected to</Text>
        <View style={styles.memberRow}>
          {members.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityState={{ selected: m.id === effectiveMemberId }}
              onPress={() => setSelectedMemberId(m.id)}
              style={[styles.memberChip, m.id === effectiveMemberId && styles.memberChipSelected]}
            >
              <Text style={[styles.memberChipText, m.id === effectiveMemberId && styles.memberChipTextSelected]}>
                {m.display_name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Year, Make and Model</Text>
        <View style={styles.sideBySideRow}>
          <View style={styles.sideBySideField}>
            <Text style={styles.label}>Year</Text>
            <TextInput
              accessibilityLabel="Car year"
              style={styles.input}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <View style={styles.sideBySideField}>
            <Text style={styles.label}>Make</Text>
            <TextInput accessibilityLabel="Car make" style={styles.input} value={make} onChangeText={onMakeChange} placeholder="Ford" />
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
          </View>
          <View style={styles.sideBySideField}>
            <Text style={styles.label}>Model</Text>
            <TextInput
              accessibilityLabel="Car model"
              style={styles.input}
              value={model}
              onChangeText={setModel}
              onFocus={onModelFocus}
              placeholder="Mustang"
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
          </View>
        </View>

        <Text style={styles.label}>Photo (optional)</Text>
        {previewPhotoUri ? (
          <Image source={{ uri: previewPhotoUri }} style={styles.photoPreview} />
        ) : (
          <Pressable style={[styles.photoPreview, styles.photoFallback]} onPress={pickPhoto}>
            <MaterialCommunityIcons name="image-outline" size={28} color="#9CA3AF" />
            <Text style={styles.photoFallbackText}>Add a photo</Text>
          </Pressable>
        )}
        <Pressable style={styles.searchPill} onPress={handleSearchForMyCar}>
          <MaterialCommunityIcons name="magnify" size={15} color="#B45309" />
          <Text style={styles.searchPillText}>{searchLabel}</Text>
        </Pressable>
        <Text style={styles.searchHint}>Opens a Google Images search in your browser — save a photo you like, then upload it above.</Text>

        <Text style={styles.label}>Car color{color ? ` — ${color}` : ''}</Text>
        <View style={styles.colorRow}>
          {CAR_COLORS.map((c) => (
            <Pressable
              key={c.name}
              onPress={() => setColor(c.name)}
              accessibilityLabel={c.name}
              style={[styles.swatch, { backgroundColor: c.hex }, c.hex === '#FFFFFF' && styles.swatchOutline, color === c.name && styles.swatchSelected]}
            />
          ))}
        </View>
        <Text style={styles.label}>Trim (optional)</Text>
        <TextInput
          accessibilityLabel="Car trim"
          style={styles.input}
          value={trim}
          onChangeText={setTrim}
          placeholder="e.g. Sport, Touring, Limited"
        />

        <Text style={styles.label}>Nickname (optional)</Text>
        <TextInput accessibilityLabel="Car nickname" style={styles.input} value={nickname} onChangeText={setNickname} placeholder="e.g. Old Betsy" />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: moreDetailsOpen }}
          style={styles.moreDetailsToggle}
          onPress={() => setMoreDetailsOpen((open) => !open)}
        >
          <Text style={styles.moreDetailsText}>{moreDetailsOpen ? 'Hide details' : 'More details'}</Text>
          <MaterialCommunityIcons name={moreDetailsOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#1D4ED8" />
        </Pressable>
        {moreDetailsOpen && (
          <>
            <Text style={styles.label}>The story</Text>
            <TextInput
              accessibilityLabel="Car story"
              style={[styles.input, styles.storyInput]}
              value={memories}
              onChangeText={setMemories}
              placeholder="Dad’s first new car. It took us on every summer road trip."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.label}>Era</Text>
            <View style={styles.eraRow}>
              {DECADES.map((d) => (
                <View key={d} style={[styles.eraChip, era === d && styles.eraChipActive]}>
                  <Text style={[styles.eraChipText, era === d && styles.eraChipTextActive]}>{d}s</Text>
                </View>
              ))}
            </View>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((opt) => (
                <Pressable key={opt.value} onPress={() => setStatus(opt.value)} style={[styles.statusPill, status === opt.value && styles.statusPillActive]}>
                  <MaterialCommunityIcons name={opt.icon} size={16} color={status === opt.value ? '#166534' : '#6B7280'} />
                  <Text style={[styles.statusPillText, status === opt.value && styles.statusPillTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Fun fact (optional)</Text>
            <TextInput style={styles.input} value={funFact} onChangeText={setFunFact} placeholder="A quirky detail about this car" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  form: { backgroundColor: '#F8FAFC' },
  successScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  successTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', color: '#0F172A', marginTop: 20 },
  successCar: { fontSize: 18, fontWeight: '700', color: '#1D4ED8', marginTop: 18, textAlign: 'center' },
  successDriver: { fontSize: 14, color: '#64748B', marginTop: 6, marginBottom: 24 },
  primarySuccessButton: { width: '100%', backgroundColor: '#1D4ED8', borderRadius: 10, padding: 16, alignItems: 'center' },
  secondarySuccessButton: { width: '100%', padding: 14, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButtonText: { color: '#1D4ED8', fontSize: 15, fontWeight: '600' },
  backLink: { color: '#64748B', marginTop: 14 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#F8FAFC',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  saveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 64,
    justifyContent: 'center',
  },
  saveChipText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  container: { padding: 20, gap: 4, backgroundColor: '#F8FAFC' },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 6 },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 18, marginBottom: 2 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  suggestionBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 4, maxHeight: 180 },
  suggestion: { padding: 10, fontSize: 15, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  sideBySideRow: { flexDirection: 'row', gap: 12 },
  sideBySideField: { flex: 1 },
  eraRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  eraChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  eraChipActive: { backgroundColor: '#16A34A' },
  eraChipText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  eraChipTextActive: { color: '#fff' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  statusPillActive: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  statusPillText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  statusPillTextActive: { color: '#166534' },
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
  photoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB' },
  photoFallbackText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
  photoPreview: { width: '100%', height: 140, borderRadius: 12, backgroundColor: '#eee' },
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
  photoActionText: { color: '#1D4ED8', fontWeight: '600', fontSize: 13 },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingVertical: 10,
    marginTop: 10,
  },
  searchPillText: { color: '#B45309', fontWeight: '600', fontSize: 13 },
  searchHint: { fontSize: 11, color: '#999', marginTop: 6, fontStyle: 'italic' },
  storyInput: { minHeight: 90 },
  moreDetailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 20,
    paddingVertical: 14,
  },
  moreDetailsText: { color: '#1D4ED8', fontSize: 15, fontWeight: '700' },
});
