import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * "Remember me" — when on, Firebase + app data persist (stay signed in across days).
 * When off, session-only: closing the app / browser (native: full quit) returns to login.
 */
export default function RememberMeRow({ value, onValueChange, disabled = false, containerStyle }) {
  const toggle = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <View style={[styles.centerWrap, containerStyle]}>
      <TouchableOpacity
        style={styles.row}
        onPress={toggle}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value, disabled }}
        hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
      >
        <View
          style={[styles.checkbox, value && styles.checkboxOn, disabled && styles.checkboxDisabled]}
        >
          {value ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.label}>שמור אותי מחובר</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#FFD1E3',
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#FFD1E3',
    borderColor: '#FFD1E3',
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkmark: {
    color: '#4E0D66',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    marginStart: 10,
  },
});
