import React from 'react';
import { Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { LEGAL, SUPPORT_EMAIL, SUPPORT_EMAIL_IS_PLACEHOLDER, supportMailto } from '@/config/legal';
import { colors, font, radius, space, MIN_TAP } from '@/theme/tokens';

/**
 * Settings — RELEASE-GATE TRACK, Phase 4 ("shell").
 *
 * What is real today: support, legal links, the family member list, and
 * a data-deletion REQUEST (by email). What later phases replace:
 *   Phase 5 — "Account" becomes email sign-in / "Secure your family"
 *   Phase 6 — the deletion request becomes true in-app deletion
 *   Phase 7 — "Family members" gains Remove member
 * Nothing here pretends to do something it does not: every row either
 * works now or states plainly what the app does today.
 */
async function open(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && !url.startsWith('mailto:')) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await Linking.openURL(url).catch(() => undefined);
}

function Row({
  icon,
  label,
  detail,
  onPress,
  danger = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  detail?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const tint = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
    >
      <MaterialCommunityIcons name={icon} size={20} color={tint} />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} /> : null}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { family, currentMember } = useFamily();
  const { members } = useMembers(family?.id);
  const version = Constants.expoConfig?.version ?? '';

  const deletionBody =
    `Please delete my data from ${LEGAL.appName}.\n\n` +
    `Family: ${family?.name ?? ''}\nMy name in the app: ${currentMember?.display_name ?? ''}\n` +
    `Reference: ${currentMember?.id ?? ''}\n\n` +
    'Delete (choose one):\n[ ] Only my own entry and cars\n[ ] The whole family and everything in it (I created it)\n';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {SUPPORT_EMAIL_IS_PLACEHOLDER ? (
          <View style={styles.warning} accessibilityRole="alert">
            <Text style={styles.warningText}>
              Setup incomplete: no support email is set yet (src/config/legal.ts). Support and deletion requests will not reach anyone until it is.
            </Text>
          </View>
        ) : null}

        <Section title="Account">
          <Row
            icon="account-circle-outline"
            label={currentMember?.display_name ?? 'You'}
            detail="Signed in on this device only. There is no email or password yet, so removing the app or clearing its data removes your access to this family."
          />
        </Section>

        <Section title="Family members">
          {members.map((m) => (
            <Row key={m.id} icon="account-outline" label={m.display_name} detail={m.relationship ?? undefined} />
          ))}
          <Row
            icon="account-remove-outline"
            label="Ask us to remove a member"
            detail="Opens an email to support"
            onPress={() => void open(supportMailto(`Remove a member — ${family?.name ?? ''}`, `Family: ${family?.name ?? ''}\nMember to remove:\nReason:\n`))}
          />
        </Section>

        <Section title="Privacy & data">
          <Row
            icon="shield-lock-outline"
            label="Your family is private"
            detail="Only people who join with your invite can see it. Photos can be opened by anyone who has a photo's direct link."
          />
          <Row icon="file-document-outline" label="Privacy Policy" onPress={() => void open(LEGAL.privacyUrl)} />
          <Row
            icon="trash-can-outline"
            label="Request deletion of my data"
            detail="Opens an email to support. We aim to finish within 30 days."
            danger
            onPress={() => void open(supportMailto(`Data deletion request — ${LEGAL.appName}`, deletionBody))}
          />
        </Section>

        <Section title="Help">
          <Row icon="lifebuoy" label="Support" detail={SUPPORT_EMAIL_IS_PLACEHOLDER ? undefined : SUPPORT_EMAIL} onPress={() => void open(LEGAL.supportUrl)} />
          <Row
            icon="flag-outline"
            label="Report content"
            detail="Opens an email to support"
            onPress={() => void open(supportMailto(`Content report — ${family?.name ?? ''}`, 'What did you see, and where?\n\nCategory: inappropriate / harassment / copyright or privacy / other\n'))}
          />
          <Row icon="file-certificate-outline" label="Terms of Use and community standards" onPress={() => void open(LEGAL.termsUrl)} />
        </Section>

        <Text style={styles.version}>{LEGAL.appName}{version ? ` · version ${version}` : ''}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: space.lg, paddingBottom: space.xxl * 2 },
  warning: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  warningText: { color: colors.danger, fontSize: font.small, lineHeight: 19 },
  section: { marginBottom: space.xl },
  sectionTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: {
    minHeight: MIN_TAP + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceAlt,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: font.body, color: colors.ink, fontWeight: '600' },
  rowDetail: { fontSize: font.small, color: colors.muted, marginTop: 2, lineHeight: 18 },
  version: { textAlign: 'center', color: colors.faint, fontSize: font.tiny },
});
