import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    // TODO: Supabase auth integration
    console.log('Register:', data);
    router.replace('/(tabs)/home');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="bg-primary-700 px-6 pt-16 pb-8 items-center">
          <Text className="text-white text-2xl font-bold">Create Account</Text>
          <Text className="text-primary-200 mt-1">Join the Jaba Juice family</Text>
        </View>

        {/* Form */}
        <View className="flex-1 px-6 pt-6">
          {/* Full Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Full Name</Text>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="John Doe"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.fullName && <Text className="text-red-500 text-sm mt-1">{errors.fullName.message}</Text>}
          </View>

          {/* Email */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && <Text className="text-red-500 text-sm mt-1">{errors.email.message}</Text>}
          </View>

          {/* Phone */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Phone Number</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholder="+254 7XX XXX XXX"
                  keyboardType="phone-pad"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.phone && <Text className="text-red-500 text-sm mt-1">{errors.phone.message}</Text>}
          </View>

          {/* Password */}
          <View className="mb-4">
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
            {errors.password && <Text className="text-red-500 text-sm mt-1">{errors.password.message}</Text>}
          </View>

          {/* Confirm Password */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-1">Confirm Password</Text>
            <Controller
              control={control}
              name="confirmPassword"
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
            {errors.confirmPassword && <Text className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</Text>}
          </View>

          {/* Register Button */}
          <TouchableOpacity
            className="bg-primary-700 rounded-xl py-4 items-center"
            onPress={handleSubmit(onSubmit)}
          >
            <Text className="text-white font-bold text-base">Create Account</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View className="flex-row justify-center mt-6 mb-8">
            <Text className="text-gray-600">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary-600 font-semibold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
