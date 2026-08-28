# lendy-cloud-functions

Firebase Cloud Functions (TypeScript) backend for the Lendy FlutterFlow app.

## Project structure

```
functions/
  src/index.ts   # function definitions
  package.json
  tsconfig.json
firebase.json
.firebaserc      # set your Firebase project ID here
```

## Local setup

```bash
npm install -g firebase-tools
cd functions
npm install
npm run build
```

Update `.firebaserc` with your actual Firebase project ID (the same project
your FlutterFlow app is linked to).

## Deploy

```bash
firebase login
firebase deploy --only functions
```

## Connecting from FlutterFlow

1. In FlutterFlow, go to **Settings & Integrations → Firebase** and make sure
   the app is linked to the **same Firebase project** as this repo's
   `.firebaserc`.
2. For the `ping` callable function, add a **Custom Action** in FlutterFlow
   and use the **Cloud Functions** integration, pointing it at the `ping`
   function name — FlutterFlow handles the Firebase Auth token automatically.
3. For the `health` HTTP function, use a plain **API Call** action pointed at
   the deployed URL (shown in the `firebase deploy` output or the Firebase
   console under Functions).
4. Redeploy (`firebase deploy --only functions`) whenever you add or change a
   function, then refresh the function list on the FlutterFlow side.
