import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  SafeAreaView,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { useCars } from '@/hooks/useCars';
import { searchMakes, getModelsForMake } from '@/utils/nhtsa';
import { CAR_COLORS } from '@/utils/carColors';
import type { Car, CarStatus, OwnershipDuration } from '@/types/database';
import AppLogoHeader from '@/components/AppLogoHeader';
import { useAllFamilyCars, type FamilyCar } from '@/hooks/useAllFamilyCars';
import { openVehicleSearch } from '@/utils/vehicleSearch';
import { shareInvite } from '@/utils/inviteLink';
import { colors, font, radius, space, MIN_TAP } from '@/theme/tokens';

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1885;
const MAX_MODEL_SUGGESTIONS = 6;

const STATUS_OPTIONS: { value: CarStatus; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'first', label: 'First Car', icon: 'numeric-1-circle' },
  { value: 'current', label: 'Currently Driving', icon: 'circle' },
  { value: 'memory', label: 'Memory', icon: 'image-multiple' },
  { value: 'dream', label: 'Dream Car', icon: 'star' },
];

const DURATION_OPTIONS: readonly (readonly [OwnershipDuration, string])[] = [
  ['under_2_years', 'Under 2 years'],
  ['under_5_years', '2–5 years'],
  ['five_plus_years', '5+ years'],
];

// This screen is mounted three different ways: as the bare "Add Car" tab
// (no route params — defaults to yourself), as a stack screen pushed from
// a member's carousel "+" button (params.member preselected), and as that
// same stack screen pushed from a car's "Edit" link (params.car also set,
// switching the whole screen into edit mode for that car).
type AddCarRouteProp = RouteProp<{ AddCarForMember: { member?: { id: string }; car?: Car } }, 'AddCarForMember'>;

/** The name the bottom-tab navigator gives this screen (RootNavigator). */
const TAB_ROUTE_NAME = 'Add Car';

/** The decade a year falls in, shown as a small hint under the Year
 * field. Deliberately NOT a separate stored field or input: deriving it
 * from Year means it can never disagree with what the person entered. */
function deriveEra(yearStr: string): string | null {
  const y = Number(yearStr);
  if (yearStr.length !== 4 || !Number.isInteger(y) || y < MIN_YEAR || y > CURRENT_YEAR + 1) return null;
  return `${Math.floor(y / 10) * 10}s`;
}

function formatOrdinal(value: number): string {
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th';
  return `${value}${suffix}`;
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
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
  const isTabMounted = (route.name as string) === TAB_ROUTE_NAME;

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
  // Open "More details" straight away when editing a car that already
  // has some, so nothing the person entered earlier looks lost.
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(
    Boolean(editingCar && (editingCar.color || editingCar.trim || editingCar.ownership_duration || editingCar.nickname || editingCar.fun_fact))
  );
  const [savedCar, setSavedCar] = useState<FamilyCar | null>(null);
  const [savedCarNumber, setSavedCarNumber] = useState(1);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const [nickname, setNickname] = useState(editingCar?.nickname ?? '');
  const [trim, setTrim] = useState(editingCar?.trim ?? '');
  const [make, setMake] = useState(editingCar?.make ?? '');
  const [makeSuggestions, setMakeSuggestions] = useState<string[]>([]);
  const [model, setModel] = useState(editingCar?.model ?? '');
  const [allModels, setAllModels] = useState<string[]>([]);
  const [modelFocused, setModelFocused] = useState(false);
  const [year, setYear] = useState(editingCar ? String(editingCar.year) : '');
  const [status, setStatus] = useState<CarStatus>(editingCar?.status ?? 'current');
  const [ownershipDuration, setOwnershipDuration] = useState<OwnershipDuration | null>(editingCar?.ownership_duration ?? null);
  const [color, setColor] = useState<string | null>(editingCar?.color ?? null);
  const [memories, setMemories] = useState(editingCar?.memories ?? '');
  const [funFact, setFunFact] = useState(editingCar?.fun_fact ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Validation and save errors render ON SCREEN. They used to go through
  // Alert.alert(), which shows nothing at all on React Native Web — so on
  // the web build a failed save looked like the button was simply dead.
  const [formError, setFormError] = useState<string | null>(null);

  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // Guards against a slow, older suggestions response overwriting a
  // newer one when someone types quickly.
  const makeRequestId = useRef(0);
  const modelRequestId = useRef(0);

  const era = deriveEra(year);
  const previewPhotoUri = photoUri ?? editingCar?.photo_url ?? null;
  const searchDetails = [year.trim(), make.trim(), model.trim(), color?.trim(), trim.trim()].filter(Boolean).join(' ');

  // Narrow the model list by what has been typed, so the list is useful
  // rather than always showing the first few models alphabetically.
  const modelSuggestions = useMemo(() => {
    if (!modelFocused) return [];
    const query = model.trim().toLowerCase();
    const matches = query ? allModels.filter((name) => name.toLowerCase().includes(query)) : allModels;
    // Nothing left to suggest once the field exactly matches an option.
    if (matches.length === 1 && matches[0].toLowerCase() === query) return [];
    return matches.slice(0, MAX_MODEL_SUGGESTIONS);
  }, [allModels, model, modelFocused]);

  const showError = (message: string) => {
    setFormError(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const onMakeChange = async (text: string) => {
    setFormError(null);
    setMake(text);
    setModel('');
    setAllModels([]);
    const requestId = ++makeRequestId.current;
    const results = text.trim().length > 0 ? await searchMakes(text) : [];
    if (requestId === makeRequestId.current) setMakeSuggestions(results);
  };

  const onModelFocus = async () => {
    setModelFocused(true);
    if (!make.trim() || !era) return;
    const requestId = ++modelRequestId.current;
    const models = await getModelsForMake(make.trim(), Number(year));
    if (requestId === modelRequestId.current) setAllModels(models);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError('Photo access is turned off. Allow photo library access for this app in your device settings, then try again.');
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
      showError(`Couldn’t open image search: ${describeError(err)}`);
    }
  };

  const reset = () => {
    setNickname('');
    setTrim('');
    setMake('');
    setModel('');
    setYear('');
    setStatus('current');
    setOwnershipDuration(null);
    setColor(null);
    setMemories('');
    setFunFact('');
    setPhotoUri(null);
    setMakeSuggestions([]);
    setAllModels([]);
    setModelFocused(false);
    setMoreDetailsOpen(false);
    setFormError(null);
    setInviteNotice(null);
  };

  /** Leaves this screen for wherever "back" means in the current mount.
   * As a tab there is no stack to pop, so go to the Family Tree tab; and
   * clear the form first so returning to the tab starts fresh instead of
   * re-showing the last car's success screen. */
  const leave = () => {
    if (isTabMounted) {
      setSavedCar(null);
      reset();
      navigation.navigate('Tree' as never);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setFormError(null);
    if (!year.trim() || !make.trim() || !model.trim()) {
      showError('Year, make and model are needed to save the car.');
      return;
    }
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < MIN_YEAR || yearNum > CURRENT_YEAR + 1) {
      showError(`Enter a four-digit year between ${MIN_YEAR} and ${CURRENT_YEAR + 1}.`);
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
        ownership_duration: ownershipDuration ?? undefined,
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
        leave();
      } else {
        const addedCar = await addCar(carDetails, photoUri ?? undefined);
        setSavedCarNumber(familyCars.length + 1);
        setSavedCar({ ...(addedCar as Car), member_display_name: selectedMember?.display_name ?? 'Family', photos: [] });
      }
    } catch (err) {
      showError(`Couldn’t save the car: ${describeError(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleInviteFamily = async () => {
    if (!family?.invite_token) {
      setInviteNotice('Your family invite is not ready yet — try again from the Family Tree tab.');
      return;
    }
    try {
      const result = await shareInvite(family.invite_token);
      if (result === 'copied') setInviteNotice('Invite link copied — paste it into a text or email.');
    } catch (err) {
      setInviteNotice(`Couldn’t share the invite: ${describeError(err)}`);
    }
  };

  if (savedCar) {
    return (
      <SafeAreaView style={styles.successScreen}>
        <View style={styles.successInner}>
          <AppLogoHeader compact />
          <Text style={styles.successTitle} accessibilityRole="header">
            Your family’s {formatOrdinal(savedCarNumber)} car has a home.
          </Text>
          <Text style={styles.successCar}>
            {savedCar.year} {savedCar.make} {savedCar.model}
          </Text>
          <Text style={styles.successDriver}>Connected to {savedCar.member_display_name}</Text>

          {/* Order is deliberate: inviting family is what grows the tree,
              so it is the one filled button. The for-sale search is an
              outbound link and sits last, as a quiet text link. */}
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => void handleInviteFamily()}>
            <MaterialCommunityIcons name="account-multiple-plus" size={18} color={colors.white} />
            <Text style={styles.primaryButtonText}>Invite family to add theirs</Text>
          </Pressable>
          {inviteNotice ? <Text style={styles.inviteNotice} accessibilityRole="alert">{inviteNotice}</Text> : null}
          <Pressable
            accessibilityRole="button"
            style={styles.secondaryButton}
            onPress={() => {
              setSavedCar(null);
              reset();
            }}
          >
            <Text style={styles.secondaryButtonText}>Add another car</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.textButton} onPress={leave}>
            <Text style={styles.textButtonLabel}>{isTabMounted ? 'View family tree' : 'Done'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            style={styles.textButton}
            onPress={() => void openVehicleSearch(savedCar.make, savedCar.model, savedCar.year, savedCar.trim, savedCar.color)}
          >
            <Text style={styles.saleLink}>Miss it? See ones like it for sale</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!effectiveMemberId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.frame}>
          <View style={styles.headerBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" style={styles.closeButton} hitSlop={6} onPress={leave}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
              {isEditMode ? 'Edit car' : 'Add a family car'}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Save car" style={styles.saveChip} onPress={() => void handleSave()} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveChipText}>Save</Text>}
            </Pressable>
          </View>

          <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {formError ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            {members.length > 1 ? (
              <>
                <Text style={[styles.label, styles.firstLabel]}>Whose car is it?</Text>
                <View style={styles.chipRow}>
                  {members.map((m) => (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: m.id === effectiveMemberId }}
                      onPress={() => setSelectedMemberId(m.id)}
                      style={[styles.chip, m.id === effectiveMemberId && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, m.id === effectiveMemberId && styles.chipTextSelected]}>{m.display_name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {/* Year + Make share a row; Model gets its own full-width row.
                Three fields across left ~100px each on a phone, too
                narrow for names like "Mercedes-Benz" or "Grand Cherokee". */}
            <View style={[styles.fieldRow, members.length <= 1 && styles.firstLabel]}>
              <View style={styles.yearField}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  accessibilityLabel="Car year"
                  style={styles.input}
                  value={year}
                  onChangeText={(text) => {
                    setFormError(null);
                    setYear(text.replace(/[^0-9]/g, ''));
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="1998"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.label}>Make</Text>
                <TextInput
                  accessibilityLabel="Car make"
                  style={styles.input}
                  value={make}
                  onChangeText={(text) => void onMakeChange(text)}
                  placeholder="Ford"
                  placeholderTextColor={colors.placeholder}
                  autoCorrect={false}
                />
              </View>
            </View>
            {era ? <Text style={styles.hint}>A {era} car</Text> : null}
            {makeSuggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                {makeSuggestions.map((m) => (
                  <Pressable
                    key={m}
                    accessibilityRole="button"
                    style={styles.suggestionRow}
                    onPress={() => {
                      makeRequestId.current += 1;
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
              accessibilityLabel="Car model"
              style={styles.input}
              value={model}
              onChangeText={(text) => {
                setFormError(null);
                setModel(text);
              }}
              onFocus={() => void onModelFocus()}
              placeholder="Mustang"
              placeholderTextColor={colors.placeholder}
              autoCorrect={false}
            />
            {modelSuggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                {modelSuggestions.map((m) => (
                  <Pressable
                    key={m}
                    accessibilityRole="button"
                    style={styles.suggestionRow}
                    onPress={() => {
                      setModel(m);
                      setModelFocused(false);
                    }}
                  >
                    <Text style={styles.suggestion}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.label}>What is this car to you?</Text>
            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === opt.value }}
                  onPress={() => setStatus(opt.value)}
                  style={[styles.chip, styles.chipWithIcon, status === opt.value && styles.chipSelected]}
                >
                  <MaterialCommunityIcons name={opt.icon} size={16} color={status === opt.value ? colors.white : colors.muted} />
                  <Text style={[styles.chipText, status === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Photo (optional)</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={previewPhotoUri ? 'Change photo' : 'Add a photo'}
              style={[styles.photoFrame, !previewPhotoUri && styles.photoEmpty]}
              onPress={() => void pickPhoto()}
            >
              {previewPhotoUri ? (
                <>
                  <Image source={{ uri: previewPhotoUri }} style={styles.photoImage} resizeMode="contain" />
                  <View style={styles.changePhotoChip}>
                    <MaterialCommunityIcons name="camera" size={14} color={colors.white} />
                    <Text style={styles.changePhotoText}>Change photo</Text>
                  </View>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="image-plus" size={30} color={colors.primary} />
                  <Text style={styles.photoEmptyText}>Add a photo</Text>
                </>
              )}
            </Pressable>
            <Pressable accessibilityRole="link" style={styles.findPhotoLink} onPress={() => void handleSearchForMyCar()}>
              <MaterialCommunityIcons name="magnify" size={16} color={colors.accent} />
              <Text style={styles.findPhotoText}>No photo? Find one online</Text>
            </Pressable>
            <Text style={styles.hint}>Opens an image search in your browser. Save a picture you like, then add it here.</Text>

            {/* The story is the heart of the app, so it is always visible
                rather than tucked under "More details". */}
            <Text style={styles.label}>The story (optional)</Text>
            <TextInput
              accessibilityLabel="Car story"
              style={[styles.input, styles.storyInput]}
              value={memories}
              onChangeText={setMemories}
              placeholder="Dad’s first new car. It took us on every summer road trip."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: moreDetailsOpen }}
              style={styles.moreDetailsToggle}
              onPress={() => setMoreDetailsOpen((open) => !open)}
            >
              <Text style={styles.moreDetailsText}>{moreDetailsOpen ? 'Hide extra details' : 'Add color, trim, nickname…'}</Text>
              <MaterialCommunityIcons name={moreDetailsOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} />
            </Pressable>
            {moreDetailsOpen && (
              <>
                <Text style={[styles.label, styles.firstLabel]}>Color{color ? ` — ${color}` : ''}</Text>
                <View style={styles.colorRow}>
                  {CAR_COLORS.map((c) => (
                    <Pressable
                      key={c.name}
                      onPress={() => setColor(color === c.name ? null : c.name)}
                      accessibilityRole="button"
                      accessibilityLabel={c.name}
                      accessibilityState={{ selected: color === c.name }}
                      hitSlop={4}
                      style={[styles.swatch, { backgroundColor: c.hex }, color === c.name && styles.swatchSelected]}
                    />
                  ))}
                </View>

                <Text style={styles.label}>Trim</Text>
                <TextInput
                  accessibilityLabel="Car trim"
                  style={styles.input}
                  value={trim}
                  onChangeText={setTrim}
                  placeholder="e.g. Sport, Touring, Limited"
                  placeholderTextColor={colors.placeholder}
                />

                <Text style={styles.label}>How long was it in the family?</Text>
                <View style={styles.chipRow}>
                  {DURATION_OPTIONS.map(([value, label]) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: ownershipDuration === value }}
                      onPress={() => setOwnershipDuration(value)}
                      style={[styles.chip, ownershipDuration === value && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, ownershipDuration === value && styles.chipTextSelected]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Nickname</Text>
                <TextInput
                  accessibilityLabel="Car nickname"
                  style={styles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="e.g. Old Betsy"
                  placeholderTextColor={colors.placeholder}
                />

                <Text style={styles.label}>Fun fact</Text>
                <TextInput
                  accessibilityLabel="Fun fact about this car"
                  style={styles.input}
                  value={funFact}
                  onChangeText={setFunFact}
                  placeholder="A quirky detail about this car"
                  placeholderTextColor={colors.placeholder}
                />
              </>
            )}

            {/* A second, full-width Save at the end of the form: after
                scrolling a long form, people look down for the button,
                not back up to the header. */}
            <Pressable accessibilityRole="button" style={[styles.primaryButton, styles.bottomSave]} onPress={() => void handleSave()} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{isEditMode ? 'Save changes' : 'Save car'}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  safe: { flex: 1, backgroundColor: colors.background },
  // maxWidth keeps the form phone-shaped on desktop web / tablets.
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: font.heading, fontWeight: '800', color: colors.ink },
  saveChip: {
    minWidth: 68,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  saveChipText: { color: colors.white, fontWeight: '700', fontSize: font.label },

  container: { padding: space.xl, paddingBottom: space.xxl * 2 },
  label: { fontSize: font.small, fontWeight: '700', color: colors.text, marginTop: space.xl, marginBottom: space.sm },
  firstLabel: { marginTop: 0 },
  hint: { fontSize: font.tiny, color: colors.muted, marginTop: space.sm, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: font.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    minHeight: MIN_TAP + 4,
  },
  storyInput: { minHeight: 110 },
  fieldRow: { flexDirection: 'row', gap: space.md },
  yearField: { width: 104 },

  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  errorText: { color: colors.danger, fontSize: font.label, lineHeight: 20 },

  suggestionBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: space.sm,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  suggestionRow: { minHeight: MIN_TAP, justifyContent: 'center', paddingHorizontal: space.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
  suggestion: { fontSize: font.body, color: colors.ink },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipWithIcon: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.label, color: colors.text, fontWeight: '600' },
  chipTextSelected: { color: colors.white },

  photoFrame: {
    width: '100%',
    height: 190,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmpty: { backgroundColor: colors.surface, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, gap: space.sm },
  photoEmptyText: { color: colors.primary, fontSize: font.label, fontWeight: '700' },
  photoImage: { width: '100%', height: '100%' },
  changePhotoChip: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  changePhotoText: { color: colors.white, fontSize: font.tiny, fontWeight: '700' },
  findPhotoLink: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: MIN_TAP, marginTop: space.xs },
  findPhotoText: { color: colors.accent, fontWeight: '700', fontSize: font.label },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.borderStrong },
  swatchSelected: { borderWidth: 3, borderColor: colors.primary },

  moreDetailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: space.xl,
    minHeight: MIN_TAP + 8,
  },
  moreDetailsText: { color: colors.primary, fontSize: font.label, fontWeight: '700' },

  primaryButton: {
    alignSelf: 'stretch',
    minHeight: MIN_TAP + 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  primaryButtonText: { color: colors.white, fontSize: font.body, fontWeight: '700' },
  bottomSave: { marginTop: space.xxl },

  successScreen: { flex: 1, backgroundColor: colors.background },
  successInner: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  successTitle: { fontFamily: font.brandFamily, fontSize: font.display, fontWeight: '800', textAlign: 'center', color: colors.ink, marginTop: space.lg },
  successCar: { fontSize: font.heading, fontWeight: '700', color: colors.primary, marginTop: space.lg, textAlign: 'center' },
  successDriver: { fontSize: font.label, color: colors.muted, marginTop: space.xs, marginBottom: space.xxl },
  inviteNotice: { color: colors.success, fontSize: font.small, fontWeight: '600', marginTop: space.md, textAlign: 'center', lineHeight: 18 },
  secondaryButton: {
    alignSelf: 'stretch',
    minHeight: MIN_TAP + 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    marginTop: space.md,
  },
  secondaryButtonText: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
  textButton: { minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  textButtonLabel: { color: colors.text, fontSize: font.label, fontWeight: '600' },
  saleLink: { color: colors.accent, fontSize: font.small, fontWeight: '600' },
});
