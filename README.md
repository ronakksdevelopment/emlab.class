# EMlab Classes — Version 1.0 Beta

A friendly, installable virtual classroom Progressive Web App by **English Mastery Lab**. EMlab Classes combines simple class creation, joining, and classroom controls inspired by Google Meet, Zoom, and Google Classroom, built with plain HTML, CSS, and JavaScript.

![EMlab Classes logo](assets/logo/logo-original.png)

---

## What this beta is, honestly

This is a **frontend only** project. There is no backend server and no real time connection between different devices or browsers.

- Profiles, classes, classrooms, chat messages, and files are stored **locally in your browser** using `localStorage` and in-memory state.
- Camera and microphone controls preview **your own device's** camera and mic. No audio or video is sent anywhere.
- Opening the same class code on two different devices will **not** show the same participants or messages, because there is no shared server yet.
- A clearly labeled **Local Demo** badge appears in the classroom to make this honest limitation visible to users.

The code is structured so a future version can add a WebRTC signaling server and backend without a redesign (see `js/classroom.js` for where real media connections would plug in).

---

## Project structure

```
emlab/
├── index.html
├── manifest.json
├── service-worker.js
├── README.md
├── css/
│   ├── variables.css
│   ├── base.css
│   ├── components.css
│   ├── screens.css
│   ├── classroom.css
│   └── responsive.css
├── js/
│   ├── storage.js       (localStorage wrapper)
│   ├── utils.js         (shared helpers: codes, clipboard, share, etc.)
│   ├── toast.js         (notifications)
│   ├── qr.js            (QR generation + camera/upload scanning)
│   ├── profile.js       (local profile + theme)
│   ├── onboarding.js     (first time walkthrough)
│   ├── classes.js       (create/join classes and classrooms)
│   ├── navigation.js    (screen routing)
│   ├── classroom.js     (live classroom: media, controls, host tools)
│   ├── chat.js          (classroom chat + file sharing)
│   ├── pwa.js           (install prompt + service worker registration)
│   └── app.js           (wires up all screens)
└── assets/
    ├── logo/logo-original.png
    └── icons/ (all generated PWA icon sizes + favicon)
```

---

## Step by step: GitHub repository setup

1. Create a new repository on GitHub, for example `emlab-classes`.
2. Download this project's ZIP and unzip it.
3. Initialize and push:
   ```bash
   cd emlab-classes
   git init
   git add .
   git commit -m "EMlab Classes v1.0 Beta"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/emlab-classes.git
   git push -u origin main
   ```

## Step by step: GitHub Pages deployment

1. In your repository, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
3. Choose branch `main` and folder `/ (root)`, then click **Save**.
4. Wait a minute, then your app will be live at:
   `https://YOUR_USERNAME.github.io/emlab-classes/`
5. Open that URL. The app should load, and the Install button should appear on supported browsers.

**Important:** because GitHub Pages serves the project from a subfolder path, all paths in this project are relative (`./css/...`, `./js/...`), so it works correctly under that subpath without edits.

---

## Installing the app (PWA)

### Android (Chrome)
1. Open the hosted URL in Chrome.
2. Tap the **Install** button inside the app, or open Chrome's menu and tap **Install app**.
3. Confirm. EMlab Classes now opens from your home screen like a native app.

### iPhone / iPad (Safari)
Safari does not support the automatic install prompt, so install manually:
1. Open the hosted URL in Safari.
2. Tap the **Share** icon, then scroll and tap **Add to Home Screen**.
3. Tap **Add**. The app icon now appears on your home screen.

### Windows / macOS (Chrome, Edge)
1. Open the hosted URL.
2. Click the install icon in the address bar, or use the in-app **Install** button.
3. Confirm. EMlab Classes opens in its own window.

### Browsers without install support
The app still works fully as a regular website. The in-app Install button shows manual instructions automatically when the native prompt is not available.

---

## Usage guidance

- **First launch:** a short walkthrough explains profile setup, creating classes, invitations, joining, QR scanning, and classroom controls. Replay it anytime from **Profile → Replay Walkthrough**.
- **Create a class:** tap **Create Class**, choose Instant or Permanent, set permissions, and you instantly get a 5 character code, QR code, and shareable link.
- **Join a class:** tap **Join Class** and choose a code, camera scan, QR image upload, or a pasted invitation link.
- **Classroom controls:** camera, mic, screen share, raise hand, reactions, chat, participants list, and host controls are in the bottom control bar and side panel.
- **Permanent classrooms:** manage members, announcements, resources, and permissions from the classroom dashboard.

---

## Technical notes

- No build step. Open `index.html` directly, or serve the folder with any static file server, or host it on GitHub Pages.
- Font Awesome and Google Fonts load from CDN; if a CDN is unreachable the app still functions with system fallback fonts and text labels remain fully legible.
- QR generation uses `qrcodejs`; QR scanning (camera and image upload) uses `jsQR`, both loaded from CDN.
- The service worker caches the app shell for offline use of the interface. Camera, microphone, and QR scanning still require an active browser session and permissions each time, as is standard for web apps.

---

## Final implementation checklist

- [x] Valid `manifest.json` with full icon set generated from the uploaded logo
- [x] Service worker with offline app shell caching
- [x] Install button using `beforeinstallprompt`, with manual instructions fallback for iOS and unsupported browsers
- [x] Profile creation with display name, username, optional photo, theme preference, stored locally
- [x] Instant class and permanent classroom creation with 5 character codes
- [x] QR code generation and shareable invitation links for every class
- [x] Four working join methods: code entry, camera QR scan, QR image upload, invitation link
- [x] Classroom interface with gallery/speaker view, participants list, and chat panel
- [x] Functional camera, microphone, screen share, raise hand, reactions, fullscreen, and picture in picture where supported
- [x] Host controls: permissions, locking, raised hands panel, device settings
- [x] Classroom chat with file sharing, downloads, and pinned message support
- [x] Permanent classroom dashboard with members, announcements, resources, and settings
- [x] Light and dark themes with system preference support
- [x] Mobile first responsive layout for phones, tablets, laptops, and desktops
- [x] Clearly labeled local demo mode with no false claims of real time multi device video or sync
- [x] Clean, documented, modular source code ready for GitHub Pages

---

**EMlab Classes** — by English Mastery Lab. Version 1.0 Beta.
