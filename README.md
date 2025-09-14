# Expo Router, Tailwind CSS & React Native Reusables

A complete Expo app setup with [Expo Router](https://docs.expo.dev/router/introduction/), [Nativewind](https://www.nativewind.dev/v4/overview/) styling, and [React Native Reusables](https://www.react-native-reusables.com/) UI components.

## 🚀 Features

- **Expo Router**: File-based routing system
- **NativeWind**: Tailwind CSS for React Native
- **React Native Reusables**: shadcn/ui-inspired component library
- **TypeScript**: Full type safety
- **Dark Mode**: Built-in theme switching
- **Responsive Design**: Mobile-first approach

## 📦 Components Included

- Button
- Card
- Input
- Text
- And more from React Native Reusables

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (for testing)

### Installation

```sh
# Clone or create the project
npx create-expo-app -e with-router-tailwind

# Install dependencies
npm install

# Install React Native Reusables
npm install @react-native-reusables/cli
```

### Configuration

The project is pre-configured with:

- **Path Aliases**: `@/*` for easy imports
- **Theme System**: CSS variables for consistent theming
- **Tailwind Config**: Extended colors and animations
- **TypeScript**: Path resolution configured

## 🚀 Running the App

```sh
# Start the development server
npx expo start

# Or specify a port
npx expo start --port 8082
```

## 📱 Testing Components

The app includes a demo page showcasing:
- Button component with press handlers
- Card component with header, content, and footer
- Input component for user interaction
- Responsive layout with NativeWind classes

## 🎨 Adding New Components

```sh
# Add any component from React Native Reusables
npx @react-native-reusables/cli add [component-name]

# Examples:
npx @react-native-reusables/cli add button
npx @react-native-reusables/cli add card
npx @react-native-reusables/cli add input
```

## 🔧 Configuration Files

- `src/global.css`: Global styles and CSS variables
- `tailwind.config.js`: Tailwind configuration
- `lib/theme.ts`: Theme constants for navigation
- `components.json`: React Native Reusables configuration
- `tsconfig.json`: TypeScript configuration with path aliases

## � Project Structure

```
src/
├── app/
│   ├── _layout.tsx    # Root layout with theme provider
│   └── index.tsx      # Main page with component demos
├── components/
│   └── ui/            # React Native Reusables components
├── global.css         # Global styles
└── lib/
    ├── theme.ts       # Theme configuration
    ├── utils.ts       # Utility functions
    └── useColorScheme.ts # Color scheme hook
```

## 🚀 Deploy

Deploy on all platforms with Expo Application Services (EAS).

- Deploy the website: `npx eas-cli deploy` — [Learn more](https://docs.expo.dev/eas/hosting/get-started/)
- Deploy on iOS and Android using: `npx eas-cli build` — [Learn more](https://expo.dev/eas)

## 📚 Resources

- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [NativeWind Documentation](https://www.nativewind.dev/v4/overview/)
- [React Native Reusables Documentation](https://www.react-native-reusables.com/)
- [Expo Documentation](https://docs.expo.dev/)
