import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Linking,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCurrentUser } from '../services/authService';
import {
	BusinessListing,
	createBusinessListing,
	getBusinessListings,
} from '../services/firestoreService';

const phoneNumberPattern = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

const isPhoneNumber = (value: string) => {
	return phoneNumberPattern.test(value.trim()) && /\d/.test(value);
};

const openPhoneNumber = async (value: string) => {
	const sanitizedValue = value.replace(/[^\d+]/g, '');
	if (!sanitizedValue) {
		return;
	}

	const phoneUrl = `tel:${sanitizedValue}`;
	const canOpen = await Linking.canOpenURL(phoneUrl);
	if (!canOpen) {
		Alert.alert('Unable to Call', 'This device cannot open the phone app for that number.');
		return;
	}

	await Linking.openURL(phoneUrl);
};

export default function BusinessScreen() {
	const [ads, setAds] = useState<BusinessListing[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [formData, setFormData] = useState({
		businessName: '',
		description: '',
		contactInfo: '',
	});

	useEffect(() => {
		const loadBusinesses = async () => {
			try {
				const businesses = await getBusinessListings();
				setAds(businesses);
			} catch (error) {
				console.error('Error loading businesses:', error);
			} finally {
				setLoading(false);
			}
		};

		loadBusinesses();
	}, []);

	const isFormValid = useMemo(() => {
		return (
			formData.businessName.trim().length > 0 &&
			formData.description.trim().length > 0 &&
			formData.contactInfo.trim().length > 0 &&
			!submitting
		);
	}, [formData, submitting]);

	const handleSubmit = async () => {
		if (!isFormValid) {
			return;
		}

		const user = getCurrentUser();
		if (!user) {
			Alert.alert('Error', 'You must be logged in to list a business.');
			return;
		}

		setSubmitting(true);
		try {
			const newAd = await createBusinessListing(
				formData.businessName.trim(),
				formData.description.trim(),
				formData.contactInfo.trim(),
				user.uid,
				user.email || 'unknown@community.com'
			);

			setAds((previousAds) => [newAd, ...previousAds]);
			setShowForm(false);
			setFormData({ businessName: '', description: '', contactInfo: '' });
			Alert.alert('Success', 'Business listed successfully!');
		} catch (error) {
			Alert.alert('Error', 'Failed to list business. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<View style={styles.headerCard}>
				<View style={styles.headerInfoWrap}>
					<View style={styles.storeBadge}>
						<MaterialIcons name="storefront" size={24} color="#3b5998" />
					</View>
					<View style={styles.headerTextWrap}>
						<ThemedText style={styles.headerTitle}>Community Businesses</ThemedText>
						<ThemedText style={styles.headerSubtitle}>
							Support your people. Discover and advertise businesses.
						</ThemedText>
					</View>
				</View>

			<Pressable
				style={[styles.primaryButton, loading ? styles.primaryButtonDisabled : undefined]}
				onPress={() => setShowForm((previous) => !previous)}
				disabled={loading}>
					<MaterialIcons name="add" size={18} color="#ffffff" />
					<ThemedText style={styles.primaryButtonText}>List Your Business</ThemedText>
				</Pressable>
			</View>

		{loading ? (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#3b5998" />
			</View>
		) : showForm ? (
				<View style={styles.formCard}>
					<ThemedText style={styles.formTitle}>Create Business Advertisement</ThemedText>

					<View style={styles.fieldWrap}>
						<ThemedText style={styles.fieldLabel}>Business Name</ThemedText>
						<TextInput
							value={formData.businessName}
							onChangeText={(value) => setFormData((previous) => ({ ...previous, businessName: value }))}
							placeholder="e.g. Sharma Traders"
							placeholderTextColor="#9ca3af"
							style={styles.input}
						/>
					</View>

					<View style={styles.fieldWrap}>
						<ThemedText style={styles.fieldLabel}>Description</ThemedText>
						<TextInput
							value={formData.description}
							onChangeText={(value) => setFormData((previous) => ({ ...previous, description: value }))}
							placeholder="What does your business offer? Describe your services..."
							placeholderTextColor="#9ca3af"
							multiline
							textAlignVertical="top"
							style={[styles.input, styles.textArea]}
						/>
					</View>

					<View style={styles.fieldWrap}>
						<ThemedText style={styles.fieldLabel}>Contact Information</ThemedText>
						<TextInput
							value={formData.contactInfo}
							onChangeText={(value) => setFormData((previous) => ({ ...previous, contactInfo: value }))}
							placeholder="Phone number, website, or address"
							placeholderTextColor="#9ca3af"
							style={styles.input}
						/>
					</View>

					<View style={styles.formActions}>
						<Pressable style={styles.secondaryButton} onPress={() => setShowForm(false)}>
							<ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
						</Pressable>
						<Pressable
							style={[styles.primaryButton, !isFormValid ? styles.primaryButtonDisabled : undefined]}
							onPress={handleSubmit}
							disabled={!isFormValid}>
						{submitting ? (
							<ActivityIndicator color="#ffffff" />
						) : (
							<ThemedText style={styles.primaryButtonText}>Publish Listing</ThemedText>
						)}
						</Pressable>
					</View>
				</View>
			) : null}

			<View style={styles.cardsWrap}>
				{ads.map((ad) => (
					<View key={ad.id} style={styles.adCard}>
						<View style={styles.adTopRow}>
							<View style={styles.adTitleWrap}>
								<ThemedText style={styles.adTitle}>{ad.businessName}</ThemedText>
								<ThemedText style={styles.adAuthor}>BY {ad.authorEmail}</ThemedText>
							</View>
							<View style={styles.adIconWrap}>
								<MaterialIcons name="business-center" size={18} color="#6b7280" />
							</View>
						</View>

						<ThemedText style={styles.adDescription}>{ad.description}</ThemedText>

						{isPhoneNumber(ad.contactInfo) ? (
							<Pressable
								style={styles.contactPill}
								onPress={() => openPhoneNumber(ad.contactInfo)}>
								<MaterialIcons name="phone" size={14} color="#9ca3af" />
								<ThemedText style={styles.contactText}>{ad.contactInfo}</ThemedText>
							</Pressable>
						) : (
							<View style={styles.contactPill}>
								<MaterialIcons name="phone" size={14} color="#9ca3af" />
								<ThemedText style={styles.contactText}>{ad.contactInfo}</ThemedText>
							</View>
						)}
					</View>
				))}

				{ads.length === 0 ? (
					<View style={styles.emptyCard}>
						<MaterialIcons name="business-center" size={42} color="#d1d5db" />
						<ThemedText style={styles.emptyTitle}>No Businesses Listed</ThemedText>
						<ThemedText style={styles.emptySubtitle}>
							Be the first to promote your business to the community!
						</ThemedText>
					</View>
				) : null}
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
		gap: 12,
		paddingBottom: 24,
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
	},
	headerCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
		gap: 14,
	},
	headerInfoWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	storeBadge: {
		width: 44,
		height: 44,
		borderRadius: 999,
		backgroundColor: '#e8f0ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTextWrap: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: '700',
		color: '#111827',
	},
	headerSubtitle: {
		fontSize: 14,
		color: '#6b7280',
		marginTop: 2,
		lineHeight: 20,
	},
	primaryButton: {
		height: 42,
		borderRadius: 8,
		backgroundColor: '#3b5998',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingHorizontal: 12,
	},
	primaryButtonDisabled: {
		opacity: 0.5,
	},
	primaryButtonText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 14,
	},
	formCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
		gap: 12,
	},
	formTitle: {
		fontSize: 18,
		color: '#1f2937',
		fontWeight: '700',
		marginBottom: 2,
	},
	fieldWrap: {
		gap: 6,
	},
	fieldLabel: {
		color: '#374151',
		fontWeight: '600',
		fontSize: 13,
	},
	input: {
		height: 44,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 10,
		backgroundColor: '#f9fafb',
		paddingHorizontal: 12,
		color: '#111827',
		fontSize: 14,
	},
	textArea: {
		minHeight: 100,
		paddingTop: 10,
		paddingBottom: 10,
	},
	formActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 8,
		marginTop: 6,
	},
	secondaryButton: {
		height: 42,
		paddingHorizontal: 14,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#d1d5db',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	secondaryButtonText: {
		color: '#374151',
		fontWeight: '600',
		fontSize: 14,
	},
	cardsWrap: {
		gap: 10,
	},
	adCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 14,
		gap: 10,
	},
	adTopRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 8,
	},
	adTitleWrap: {
		flex: 1,
		gap: 2,
	},
	adTitle: {
		color: '#3b5998',
		fontSize: 18,
		fontWeight: '700',
	},
	adAuthor: {
		color: '#9ca3af',
		fontSize: 11,
		fontWeight: '600',
	},
	adIconWrap: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f9fafb',
		borderWidth: 1,
		borderColor: '#f3f4f6',
	},
	adDescription: {
		color: '#374151',
		fontSize: 14,
		lineHeight: 20,
	},
	contactPill: {
		marginTop: 2,
		backgroundColor: '#f9fafb',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#f3f4f6',
		paddingHorizontal: 10,
		paddingVertical: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	contactText: {
		color: '#374151',
		fontSize: 14,
		flex: 1,
	},
	emptyCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 30,
		paddingHorizontal: 16,
		gap: 6,
	},
	emptyTitle: {
		color: '#111827',
		fontSize: 18,
		fontWeight: '700',
	},
	emptySubtitle: {
		color: '#6b7280',
		fontSize: 14,
		textAlign: 'center',
	},
});
