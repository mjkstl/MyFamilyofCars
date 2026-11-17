import { Alert, Linking, Platform } from 'react-native';

export async function openVehicleSearch(make: string, model: string, year: number, trim?: string | null, color?: string | null) {
  const details = [year, make, model, trim, color].filter(Boolean).join(' ');
  // Regular "All" results, not Google Shopping: Shopping mostly showed
  // parts and accessories, while "All" leads with car listings
  // (Autotrader, Cars.com, CarGurus…). Reported 2026-11-17.
  const url = `https://www.google.com/search?q=${encodeURIComponent(`${details} for sale`)}`;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      await Linking.openURL(url);
    }
  } catch (error) {
    Alert.alert('Couldn’t open vehicle search', error instanceof Error ? error.message : String(error));
  }
}
