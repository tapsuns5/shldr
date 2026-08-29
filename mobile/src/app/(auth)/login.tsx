import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { signIn, useSession } from '@/lib/auth-client';

export default function LoginScreen() {
  const theme = useTheme();
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Redirect href="/home" />;
  }

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signIn.email({ email, password });
      if (signInError) {
        setError(signInError.message ?? 'Could not sign in. Check your email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          SHLDR
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Sign in to see your trips
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          mode="outlined"
          style={styles.input}
        />

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button mode="contained" onPress={handleSignIn} loading={loading} disabled={loading}>
          Sign in
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 4 },
  title: { fontWeight: '700', marginBottom: 4 },
  subtitle: { marginBottom: 24 },
  input: { marginBottom: 12 },
});
