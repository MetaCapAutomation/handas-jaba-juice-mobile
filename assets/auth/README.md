# Auth Screen Illustrations

Place the following PNG files in this folder:

| File | Screen | Recommended size | Description |
|------|--------|-----------------|-------------|
| `signin-illustration.png` | Sign In | 280×200 px | People with shopping cart |
| `forgot-illustration.png` | Forgot Password | 280×200 px | People carrying groceries |
| `signup-illustration.png` | Sign Up | 280×200 px | Vegetables / fresh produce |

## Activating the illustrations

In each auth screen file, find the `illustrationPlaceholder` View and replace it with:

```jsx
<Image
  source={require('@/assets/auth/signin-illustration.png')}  // change filename per screen
  style={styles.illustration}
  resizeMode="contain"
/>
```

Also add `Image` to the React Native import at the top of the file.
