import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFamily } from '@/hooks/useFamily';
import { useAllFamilyCars } from '@/hooks/useAllFamilyCars';
import CollectionPhotoGallery from '@/components/CollectionPhotoGallery';
import KeepsakeInterestModal from '@/components/KeepsakeInterestModal';
import { trackEvent } from '@/services/analytics';

export default function PrintPreviewScreen() {
  const { family } = useFamily();
  const { cars, loading } = useAllFamilyCars(family?.id);
  const [interestOpen, setInterestOpen] = useState(false);

  useEffect(() => {
    if (family?.id) void trackEvent('print_preview_opened', {}, family.id);
  }, [family?.id]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.body.dataset.printPreview = 'true';
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body[data-print-preview="true"] * { visibility: hidden; }
        body[data-print-preview="true"] #print-document,
        body[data-print-preview="true"] #print-document * { visibility: visible; }
        body[data-print-preview="true"] #print-document { position: absolute; left: 0; top: 0; width: 100%; }
        body[data-print-preview="true"] #print-controls { display: none !important; }
        body[data-print-preview="true"] .print-page { break-after: page; page-break-after: always; }
        body[data-print-preview="true"] .print-page:last-child { break-after: auto; page-break-after: auto; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      delete document.body.dataset.printPreview;
      style.remove();
    };
  }, []);

  const print = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.print();
    else Alert.alert('Print preview', 'Browser printing is available when you open this keepsake on the web.');
  };

  if (loading) return <View style={styles.center}><Text>Preparing your keepsake…</Text></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.outer}>
        <View nativeID="print-controls" style={styles.controls}>
          <Pressable style={styles.printButton} accessibilityRole="button" onPress={print}>
            <Text style={styles.printButtonText}>Print this collection</Text>
          </Pressable>
          <Text style={styles.controlHint}>Your browser’s print dialog controls paper size and destination.</Text>
          <Text style={styles.keepsakeCopy}>Turn your family’s cars and stories into a printed book.</Text>
          <Pressable style={styles.interestButton} accessibilityRole="button" onPress={() => { setInterestOpen(true); void trackEvent('keepsake_interest_opened', {}, family?.id); }}>
            <Text style={styles.interestButtonText}>Tell me when keepsakes are ready</Text>
          </Pressable>
        </View>
        <View nativeID="print-document" style={styles.document}>
          <View style={[styles.printPage, styles.cover]}>
            <Text style={styles.kicker}>A family keepsake</Text>
            <Text style={styles.coverTitle}>{family?.name ?? 'Our Family'}</Text>
            <Text style={styles.coverSubtitle}>Family Garage Story</Text>
            <Text style={styles.coverIntro}>The cars that carried your family through everyday drives, big adventures, and the years in between.</Text>
          </View>
          {cars.length > 3 && (
            <View style={[styles.printPage, styles.indexPage]}>
              <Text style={styles.pageTitle}>Inside this collection</Text>
              {cars.map((car, index) => <Text key={car.id} style={styles.indexRow}>{index + 1}. {car.year} {car.make} {car.model} — {car.member_display_name}</Text>)}
            </View>
          )}
          {cars.map((car) => (
            <View key={car.id} style={styles.printPage}>
              <CollectionPhotoGallery photos={car.photos} fallbackUrl={car.photo_url} height={300} />
              <Text style={styles.carTitle}>{car.year} {car.make} {car.model}</Text>
              {car.nickname ? <Text style={styles.carNickname}>“{car.nickname}”</Text> : null}
              <Text style={styles.carPerson}>Connected to {car.member_display_name}</Text>
              <Text style={styles.carStatus}>{car.status === 'first' ? 'First Car' : car.status === 'current' ? 'Currently Driving' : car.status === 'memory' ? 'Memory' : 'Dream Car'}</Text>
              <Text style={styles.storyHeading}>The story</Text>
              <Text style={styles.story}>{car.memories || 'This car is waiting for its story.'}</Text>
              {car.color ? <Text style={styles.detail}>Color: {car.color}</Text> : null}
            </View>
          ))}
        </View>
      </ScrollView>
      <KeepsakeInterestModal visible={interestOpen} familyId={family?.id} onClose={() => setInterestOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E2E8F0' },
  outer: { padding: 18, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { width: '100%', maxWidth: 760, marginBottom: 16 },
  printButton: { alignSelf: 'flex-start', backgroundColor: '#1D4ED8', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  printButtonText: { color: '#fff', fontWeight: '800' },
  controlHint: { color: '#475569', fontSize: 12, marginTop: 8 },
  keepsakeCopy: { color: '#475569', fontSize: 13, marginTop: 10 },
  interestButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1D4ED8', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginTop: 9 },
  interestButtonText: { color: '#1D4ED8', fontWeight: '800' },
  document: { width: '100%', maxWidth: 760, backgroundColor: '#fff' },
  printPage: { minHeight: 700, padding: 44, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  cover: { justifyContent: 'center', backgroundColor: '#F8FAFC' },
  kicker: { color: '#0F766E', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  coverTitle: { color: '#0F172A', fontSize: 42, fontWeight: '900', marginTop: 15 },
  coverSubtitle: { color: '#334155', fontSize: 24, marginTop: 8 },
  coverIntro: { color: '#475569', fontSize: 16, lineHeight: 24, maxWidth: 480, marginTop: 28 },
  indexPage: { minHeight: 400 },
  pageTitle: { color: '#0F172A', fontSize: 28, fontWeight: '900', marginBottom: 20 },
  indexRow: { color: '#334155', fontSize: 15, marginBottom: 10 },
  carPhoto: { width: '100%', height: 300, borderRadius: 12, backgroundColor: '#E2E8F0' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  carTitle: { color: '#0F172A', fontSize: 28, fontWeight: '900', marginTop: 22 },
  carNickname: { color: '#64748B', fontSize: 17, fontStyle: 'italic', marginTop: 4 },
  carPerson: { color: '#1D4ED8', fontWeight: '800', marginTop: 16 },
  carStatus: { color: '#334155', marginTop: 8 },
  storyHeading: { color: '#0F172A', fontSize: 15, fontWeight: '900', marginTop: 28, textTransform: 'uppercase' },
  story: { color: '#334155', fontSize: 16, lineHeight: 25, marginTop: 8 },
  detail: { color: '#475569', marginTop: 18 },
});
