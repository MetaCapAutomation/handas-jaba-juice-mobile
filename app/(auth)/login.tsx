import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    // TODO: Supabase auth integration
    console.log('Login:', data);
    router.replace('/(tabs)/home');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="bg-primary-700 px-6 pt-16 pb-12 items-center">
          <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-4">
            <Text className="text-4xl">🥤</Text>
          </View>
          <Text className="text-white text-3xl font-bold">Handas Jaba Juice</Text>
          <Text className="text-primary-200 mt-1 text-base">Fresh. Natural. Delicious.</Text>
        </View>

        {/* Form */}
        <View className="flex-1 px-6 pt-8">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Welcome back</Text>
          <Text className="text-gray-500 mb-8">Sign in to your account</Text>

          {/* Email */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 focus:border-primary-500"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && (
              <Text className="text-red-500 text-sm mt-1">{errors.email.message}</Text>
            )}
          </View>

          {/* Password */}
          <View className="mb-2">
            <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="••••••••"
                  secureTextEntry
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && (
              <Text className="text-red-500 text-sm mt-1">{errors.password.message}</Text>
            )}
          </View>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity className="self-end mb-6">
              <Text className="text-primary-600 text-sm font-medium">Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          {/* Login Button */}
          <TouchableOpacity
            className="bg-primary-700 rounded-xl py-4 items-center"
            onPress={handleSubmit(onSubmit)}
          >
            <Text className="text-white font-bold text-base">Sign In</Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-600">Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-primary-600 font-semibold">Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
