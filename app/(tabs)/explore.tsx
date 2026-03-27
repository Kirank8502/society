import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getAllUsers, UserProfile } from '../services/firestoreService';

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const users = await getAllUsers();
        setProfiles(users);
      } catch (error) {
        console.error('Error loading profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return profiles;
    }

    return profiles.filter((profile) => {
      return (
        profile.fullName.toLowerCase().includes(query) ||
        profile.profession.toLowerCase().includes(query) ||
        profile.location.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, profiles]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.usersBadge}>
            <MaterialIcons name="groups" size={24} color="#3b5998" />
          </View>
          <View style={styles.heroTextWrap}>
            <ThemedText style={styles.title}>Member Directory</ThemedText>
            <ThemedText style={styles.subtitle}>
              Find friends and connect with people in your community.
            </ThemedText>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, job, or city..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.cardsWrap}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b5998" />
          </View>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile) => (
            <View key={profile.id} style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <ThemedText style={styles.avatarText}>{profile.fullName.charAt(0)}</ThemedText>
              </View>

              <ThemedText style={styles.profileName}>{profile.fullName}</ThemedText>
              <ThemedText style={styles.profileProfession}>{profile.profession}</ThemedText>

              <View style={styles.locationPill}>
                <MaterialIcons name="location-on" size={14} color="#6b7280" />
                <ThemedText style={styles.locationText}>{profile.location}</ThemedText>
              </View>

              <Pressable style={styles.addFriendButton}>
                <MaterialIcons name="person-add" size={16} color="#1f2937" />
                <ThemedText style={styles.addFriendText}>Add Friend</ThemedText>
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="groups" size={44} color="#d1d5db" />
            <ThemedText style={styles.emptyTitle}>No Members Found</ThemedText>
            <ThemedText style={styles.emptySubtitle}>Try adjusting your search criteria.</ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 14,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  usersBadge: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#e8f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  searchWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  searchInput: {
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingLeft: 40,
    paddingRight: 12,
    color: '#111827',
    fontSize: 15,
  },
  cardsWrap: {
    gap: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  avatarWrap: {
    width: 66,
    height: 66,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f0ff',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarText: {
    color: '#3b5998',
    fontWeight: '700',
    fontSize: 24,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  profileProfession: {
    fontSize: 14,
    color: '#3b5998',
    fontWeight: '600',
  },
  locationPill: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  addFriendButton: {
    marginTop: 8,
    width: '100%',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f2f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addFriendText: {
    color: '#1f2937',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySubtitle: {
    color: '#6b7280',
    fontSize: 14,
  },
});
