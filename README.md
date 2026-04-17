# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Stripe checkout (Supabase Edge Functions)

To enable in-app upgrades, deploy the `create-checkout-session` function and set the required env vars.

1. Deploy the function:

   ```bash
   supabase functions deploy create-checkout-session
   ```

2. Set function secrets (run once):

   ```bash
   supabase secrets set STRIPE_SECRET_KEY=... STRIPE_PRICE_PRO=... STRIPE_PRICE_PREMIUM=...
   supabase secrets set SUCCESS_URL=trinketmobile://membership?checkout=success
   supabase secrets set CANCEL_URL=trinketmobile://membership?checkout=cancel
   ```

3. Redeploy if you change any function code:

   ```bash
   supabase functions deploy create-checkout-session
   ```

## Stripe customer portal (Supabase Edge Function)

Deploy the customer portal function to allow users to manage billing.

1. Deploy the function:

   ```bash
   supabase functions deploy create-customer-portal
   ```

2. Set portal return URL (optional):

   ```bash
   supabase secrets set PORTAL_RETURN_URL=trinketmobile://membership?portal=return
   ```

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
