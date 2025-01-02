// Firebase configuration
const config = {
    apiKey: "AIzaSyCWW3nXMPfc7HOV3xfeny-xJwG9PHZxPts",
    authDomain: "jitsi-auth-45ceb.firebaseapp.com",
    projectId: "jitsi-auth-45ceb",
    storageBucket: "jitsi-auth-45ceb.appspot.com",
    messagingSenderId: "686054457256",
    appId: "1:686054457256:web:c76227b3291d570468a79d",
};

firebase.initializeApp(config);

const DOMAIN = window.location.hostname;

const DEEP_LINKING = {
    electron: {
        scheme: 'jitsi-meet'
    },
    android: {
        scheme: 'org.jitsi.meet',
        package: 'org.jitsi.meet'
    },
    ios: {
        scheme: 'org.jitsi.meet'
    }
}
