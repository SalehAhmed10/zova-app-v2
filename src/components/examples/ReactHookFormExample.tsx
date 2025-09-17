import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm, Controller } from 'react-hook-form';

interface FormData {
  name: string;
  email: string;
  age: string;
  bio: string;
}

interface ReactHookFormExampleProps {
  onSubmit?: (data: FormData) => void;
  loading?: boolean;
}

export function ReactHookFormExample({
  onSubmit,
  loading = false
}: ReactHookFormExampleProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      email: '',
      age: '',
      bio: '',
    },
    mode: 'onChange', // Validate on change for better UX
  });

  const onSubmitForm = (data: FormData) => {
    console.log('Form submitted:', data);
    onSubmit?.(data);
  };

  const handleReset = () => {
    reset();
  };

  return (
    <Card className="mx-4">
      <CardHeader>
        <CardTitle>React Hook Form Example</CardTitle>
      </CardHeader>
      <CardContent className="gap-4">
        {/* Name Field */}
        <View>
          <Text variant="small" className="mb-2 font-medium">
            Full Name *
          </Text>
          <Controller
            control={control}
            rules={{
              required: 'Name is required',
              minLength: {
                value: 2,
                message: 'Name must be at least 2 characters',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder="Enter your full name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                className={errors.name ? 'border-destructive' : ''}
              />
            )}
            name="name"
          />
          {errors.name && (
            <Text variant="small" className="text-destructive mt-1">
              {errors.name.message}
            </Text>
          )}
        </View>

        {/* Email Field */}
        <View>
          <Text variant="small" className="mb-2 font-medium">
            Email Address *
          </Text>
          <Controller
            control={control}
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder="Enter your email"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                className={errors.email ? 'border-destructive' : ''}
              />
            )}
            name="email"
          />
          {errors.email && (
            <Text variant="small" className="text-destructive mt-1">
              {errors.email.message}
            </Text>
          )}
        </View>

        {/* Age Field */}
        <View>
          <Text variant="small" className="mb-2 font-medium">
            Age
          </Text>
          <Controller
            control={control}
            rules={{
              pattern: {
                value: /^[0-9]+$/,
                message: 'Age must be a number',
              },
              min: {
                value: 13,
                message: 'Must be at least 13 years old',
              },
              max: {
                value: 120,
                message: 'Age must be realistic',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder="Enter your age"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType="numeric"
                className={errors.age ? 'border-destructive' : ''}
              />
            )}
            name="age"
          />
          {errors.age && (
            <Text variant="small" className="text-destructive mt-1">
              {errors.age.message}
            </Text>
          )}
        </View>

        {/* Bio Field */}
        <View>
          <Text variant="small" className="mb-2 font-medium">
            Bio
          </Text>
          <Controller
            control={control}
            rules={{
              maxLength: {
                value: 500,
                message: 'Bio must be less than 500 characters',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder="Tell us about yourself..."
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                className={errors.bio ? 'border-destructive' : ''}
                style={{ minHeight: 80 }}
              />
            )}
            name="bio"
          />
          {errors.bio && (
            <Text variant="small" className="text-destructive mt-1">
              {errors.bio.message}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-4">
          <Button
            variant="outline"
            onPress={handleReset}
            className="flex-1"
            disabled={loading}
          >
            <Text>Reset</Text>
          </Button>
          <Button
            onPress={handleSubmit(onSubmitForm)}
            className="flex-1"
            disabled={!isValid || loading}
          >
            <Text>{loading ? 'Submitting...' : 'Submit'}</Text>
          </Button>
        </View>

        {/* Form Status */}
        <View className="mt-4 p-3 bg-muted rounded-lg">
          <Text variant="small" className="text-center">
            Form is {isValid ? 'valid' : 'invalid'}
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}

// Custom hook for form management
export function useFormExample() {
  const [submittedData, setSubmittedData] = React.useState<FormData | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSubmittedData(data);
      console.log('Form submitted successfully:', data);
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    submittedData,
    loading,
    handleSubmit,
    reset: () => setSubmittedData(null),
  };
}