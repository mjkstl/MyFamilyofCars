import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import type { Member } from '@/types/database';

export default function MemberTile({ member, onPress }: { member: Member; onPress: () => void }) {
  const initials = member.display_name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Pressable style={styles.tile} onPress={onPress}>
      {member.avatar_url ? (
        <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {member.display_name}
      </Text>
      {member.relationship ? (
        <Text style={styles.relationship} numberOfLines={1}>
          {member.relationship}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: '47%', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 8 },
  avatarFallback: { backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '600' },
  relationship: { fontSize: 12, color: '#888' },
});
