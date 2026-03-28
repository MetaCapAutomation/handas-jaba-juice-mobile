import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotForm) => {
    // TODO: Supabase auth reset
    console.log('Reset password for:', data.email);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="bg-primary-700 px-6 pt-16 pb-8">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-primary-200 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Reset Password</Text>
        <Text className="text-primary-200 mt-1">We'll send you a reset link</Text>
      </View>

      <View className="flex-1 px-6 pt-8">
        <View className="mb-6">
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

        <TouchableOpacity
          className="bg-primary-700 rounded-xl py-4 items-center"
          onPress={handleSubmit(onSubmit)}
        >
          <Text className="text-white font-bold text-base">Send Reset Link</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
