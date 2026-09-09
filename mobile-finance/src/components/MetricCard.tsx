import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MetricCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'emerald' | 'blue' | 'rose' | 'amber' | 'slate';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  amount,
  subtitle,
  icon,
  variant = 'emerald',
}) => {
  const getTheme = () => {
    switch (variant) {
      case 'emerald':
        return {
          bg: '#064E3B',
          border: '#059669',
          amountColor: '#34D399',
          iconBg: 'rgba(16, 185, 129, 0.15)',
        };
      case 'blue':
        return {
          bg: '#1E3A8A',
          border: '#3B82F6',
          amountColor: '#60A5FA',
          iconBg: 'rgba(59, 130, 246, 0.15)',
        };
      case 'rose':
        return {
          bg: '#881337',
          border: '#E11D48',
          amountColor: '#FB7185',
          iconBg: 'rgba(244, 63, 94, 0.15)',
        };
      case 'amber':
        return {
          bg: '#78350F',
          border: '#D97706',
          amountColor: '#FBBF24',
          iconBg: 'rgba(245, 158, 11, 0.15)',
        };
      default:
        return {
          bg: '#1E293B',
          border: '#334155',
          amountColor: '#F8FAFC',
          iconBg: 'rgba(148, 163, 184, 0.15)',
        };
    }
  };

  const theme = getTheme();
  const formatted = `Rp ${Math.round(amount || 0).toLocaleString('id-ID')}`;

  return (
    <View style={[styles.card, { backgroundColor: '#1E293B', borderColor: theme.border }]}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.iconWrapper, { backgroundColor: theme.iconBg }]}>
          {icon}
        </View>
      </View>
      <Text style={[styles.amount, { color: theme.amountColor }]}>{formatted}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
