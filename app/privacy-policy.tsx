import { ScrollView, View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const LAST_UPDATED = 'May 27, 2026';

type Section = {
  title: string;
  content: string | string[];
};

const SECTIONS: Section[] = [
  {
    title: '1. Introduction',
    content:
      'Handas Jaba Juice ("we", "our", or "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App") and related services.\n\nPlease read this policy carefully. By using the App you agree to the practices described below. If you do not agree, please discontinue use of the App.',
  },
  {
    title: '2. Information We Collect',
    content: [
      'Account Information — Name, email address, phone number, and a securely hashed password when you register.',
      'Profile Information — Your chosen profile photo and default delivery address.',
      'Location Information — With your explicit permission, your device location is used to set a delivery address. We do not track you in the background.',
      'Order & Transaction Information — Items ordered, quantities, delivery address, order status, and payment confirmation references.',
      'Payment Information — Payments are processed by Paystack (PCI-DSS compliant). We never store card numbers or CVVs — only a payment reference and confirmation status.',
      'Device & Technical Information — Device model, operating system version, app version, and push notification token (used exclusively for order status updates).',
      'Support Information — Messages, attachments, and other information you share when contacting our Help Centre.',
      'Usage Information — Anonymised data about how you interact with app features, used solely to improve the service.',
    ],
  },
  {
    title: '3. How We Use Your Information',
    content: [
      'Create and manage your account and authenticate your identity',
      'Process, fulfil, and communicate about your orders',
      'Send order status push notifications (e.g. paid, preparing, out for delivery, delivered)',
      'Respond to your customer support requests via the Help Centre',
      'Enable location-based features, such as address search and map-based delivery pin',
      'Personalise your in-app experience',
      'Detect, prevent, and respond to fraud, abuse, and security incidents',
      'Comply with applicable laws and regulations',
      'Analyse and improve the performance and features of the App',
    ],
  },
  {
    title: '4. Information Sharing & Disclosure',
    content:
      'We do not sell, rent, or trade your personal information to any third party for marketing purposes.\n\nWe may share your information in the following limited circumstances:\n\n• Delivery Fulfilment — Your name, phone number, and delivery address are shared with our delivery team solely to fulfil your order.\n\n• Service Providers — We work with trusted third-party vendors (Supabase, Paystack, Google) who process data on our behalf under strict data processing agreements.\n\n• Legal Obligations — We may disclose information when required by law, court order, or governmental authority, or to protect the rights, property, or safety of Handas Jaba Juice, our users, or the public.\n\n• Business Transfers — In the event of a merger, acquisition, or asset sale, user data may be transferred. We will provide notice before your data becomes subject to a different privacy policy.',
  },
  {
    title: '5. Third-Party Services',
    content:
      'Our App integrates with the following third-party services. Each operates under its own privacy policy:\n\n• Google Maps & Places API — Powers map display, location search, and address lookup.\nPolicy: policies.google.com/privacy\n\n• Paystack — Processes card payments securely.\nPolicy: paystack.com/privacy\n\n• Supabase — Provides database, authentication, and file storage infrastructure.\nPolicy: supabase.com/privacy\n\n• Expo & React Native — The development framework used to build the App.\nPolicy: expo.dev/privacy\n\nWe encourage you to review each provider\'s privacy policy to understand how they handle your data.',
  },
  {
    title: '6. Data Retention',
    content:
      'We retain your personal information for as long as your account is active or as needed to provide our services.\n\nIf you delete your account:\n• Your profile, personal details, and preferences are deleted within 30 days.\n• Order history and transaction records are retained for up to 7 years to comply with financial and tax regulations.\n• Certain data may be retained longer if required by applicable law.\n\nYou may request deletion of your data at any time (see Section 7).',
  },
  {
    title: '7. Your Rights & Choices',
    content: [
      'Access — Request a copy of the personal data we hold about you by contacting us.',
      'Correction — Update your profile information at any time in the App under Account Settings.',
      'Deletion — Delete your account and personal data via Settings → Delete Account. This action is permanent and cannot be undone.',
      'Data Portability — Request an export of your personal data in a machine-readable format.',
      'Push Notifications — Manage notification preferences in the App under Notification Settings, or via your device system settings.',
      'Location Access — Revoke location permission at any time through your device Settings. The App will still function, but address auto-detection will be unavailable.',
      'Marketing Communications — We do not currently send marketing emails. If this changes, we will provide an opt-out mechanism.',
    ],
  },
  {
    title: '8. Location Information',
    content:
      'Location access is entirely optional and only requested when you actively use the map or address-detection features. We request "While Using the App" permission only — we never access your location in the background.\n\nRaw GPS coordinates are used transiently to reverse-geocode a human-readable address and are not stored in our database. The resulting address string is saved to your profile only after you confirm it.',
  },
  {
    title: '9. Push Notifications',
    content:
      'With your device permission, we send push notifications for:\n\n• Order status updates (paid → preparing → out for delivery → delivered)\n• Staff responses to your Help Centre support tickets\n\nWe do not send promotional or marketing push notifications. You can disable push notifications at any time through your device system settings or via Settings → Notification Settings within the App.',
  },
  {
    title: '10. Children\'s Privacy',
    content:
      'Our App is not directed at or intended for children under the age of 13 (or 16 in certain jurisdictions). We do not knowingly collect personal information from minors. If you believe we have inadvertently collected such information, please contact us immediately at privacy@handasjabajuice.com and we will promptly delete it.',
  },
  {
    title: '11. Data Security',
    content:
      'We implement industry-standard security measures including:\n\n• Encrypted data transmission (HTTPS/TLS)\n• Secure password hashing (bcrypt via Supabase Auth)\n• Database-level row security (users can only access their own records)\n• Payment data handled exclusively by PCI-DSS compliant processors\n• Regular security reviews and access controls\n\nWhile we take every reasonable precaution, no system is completely immune to security risks. We cannot guarantee absolute security but are committed to promptly addressing any breach.',
  },
  {
    title: '12. International Data Transfers',
    content:
      'Your information may be stored and processed in countries other than Kenya, including locations where Supabase, Google, and Paystack operate their infrastructure. These transfers are conducted with appropriate safeguards to protect your privacy rights in accordance with applicable laws.',
  },
  {
    title: '13. Changes to This Policy',
    content:
      'We may update this Privacy Policy periodically to reflect changes in our practices or applicable law. We will notify you of material changes by:\n\n• Updating the "Last Updated" date at the top of this page\n• Sending a push notification or in-app message for significant changes\n\nYour continued use of the App after any changes constitutes acceptance of the updated policy. We encourage you to review this page periodically.',
  },
  {
    title: '14. Contact Us',
    content:
      'If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:\n\nHandas Jaba Juice\nEmail: privacy@handasjabajuice.com\nWebsite: handasjabajuice.com\n\nWe aim to respond to all privacy inquiries within 30 days. For account deletion or data export requests, please include your registered email address.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#5DC9A0" />
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Hero */}
        <View style={s.heroBanner}>
          <View style={s.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={38} color="#5DC9A0" />
          </View>
          <Text style={s.heroTitle}>Your Privacy Matters</Text>
          <Text style={s.heroSubtitle}>
            We are committed to protecting your personal information and being fully transparent about how we collect and use it.
          </Text>
          <View style={s.updatedBadge}>
            <Ionicons name="time-outline" size={13} color="#6B7280" />
            <Text style={s.updatedText}>Last updated: {LAST_UPDATED}</Text>
          </View>
        </View>

        {/* Quick summary chips */}
        <View style={s.summaryRow}>
          {[
            { icon: 'ban-outline' as const, label: 'No data sold' },
            { icon: 'lock-closed-outline' as const, label: 'Encrypted' },
            { icon: 'person-outline' as const, label: 'You control it' },
          ].map((chip) => (
            <View key={chip.label} style={s.summaryChip}>
              <Ionicons name={chip.icon} size={16} color="#5DC9A0" />
              <Text style={s.summaryChipText}>{chip.label}</Text>
            </View>
          ))}
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={s.section}>
            <View style={s.sectionTitleRow}>
              <View style={s.sectionDot} />
              <Text style={s.sectionTitle}>{section.title}</Text>
            </View>
            {typeof section.content === 'string' ? (
              <Text style={s.sectionBody}>{section.content}</Text>
            ) : (
              <View style={s.bulletList}>
                {(section.content as string[]).map((item, idx) => (
                  <View key={idx} style={s.bulletRow}>
                    <View style={s.bullet} />
                    <Text style={s.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerIconWrap}>
            <Ionicons name="leaf" size={20} color="#5DC9A0" />
          </View>
          <Text style={s.footerBrand}>Handas Jaba Juice</Text>
          <Text style={s.footerTagline}>Fresh. Natural. Delivered.</Text>
          <Text style={s.footerCopy}>© 2026 Handas Jaba Juice. All rights reserved.</Text>
          <Text style={s.footerEmail}>privacy@handasjabajuice.com</Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1B1F3B' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#5DC9A0',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  scrollContent: { paddingBottom: 20 },

  // Hero banner
  heroBanner: {
    backgroundColor: 'rgba(255,255,255,0.08)', margin: 16, borderRadius: 24,
    padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(93,201,160,0.3)',
  },
  heroIconWrap: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(93,201,160,0.2)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 3, borderColor: 'rgba(93,201,160,0.5)',
  },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: '#FFFFFF',
    marginBottom: 10, textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center',
    lineHeight: 22, marginBottom: 16,
  },
  updatedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  updatedText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  // Summary chips
  summaryRow: {
    flexDirection: 'row', justifyContent: 'center',
    paddingHorizontal: 16, marginBottom: 16, gap: 10,
  },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(93,201,160,0.15)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(93,201,160,0.4)',
  },
  summaryChipText: { fontSize: 12, fontWeight: '600', color: '#5DC9A0' },

  // Sections
  section: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#5DC9A0', marginRight: 10, flexShrink: 0,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  sectionBody: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 23 },

  bulletList: { gap: 11 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#5DC9A0', marginTop: 8, flexShrink: 0,
  },
  bulletText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },

  // Footer
  footer: {
    alignItems: 'center', paddingVertical: 28,
    marginHorizontal: 16, gap: 6,
  },
  footerIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(93,201,160,0.2)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  footerBrand: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  footerTagline: { fontSize: 13, color: '#5DC9A0', fontWeight: '600' },
  footerCopy: { fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 4 },
  footerEmail: { fontSize: 12, color: 'rgba(255,255,255,0.65)', textDecorationLine: 'underline' },
});
