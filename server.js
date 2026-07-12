const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const admin = require('firebase-admin');

// Firebase Admin Initialize (आपको अपनी Service Account Key फाइल यहाँ डालनी होगी)
// डैशबोर्ड से 'serviceAccountKey.json' डाउनलोड करके सर्वर फोल्डर में रखें
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://my-ai-chatter-default-rtdb.europe-west1.firebasedatabase.app"
});

const app = express();
const PORT = process.env.PORT || 50600;

// S-PROJECTS STRICT CORS SECURITY
app.use(cors({ 
    origin: [
        'https://my-ai-chater.s-projects.site', 
        'http://localhost:50600',
        'https://my-ai-chatter11.netlify.app' // <-- नया Netlify डोमेन यहाँ ऐड कर दिया है
    ] 
}));
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY || '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',
    baseURL: 'https://integrate.api.nvidia.com/v1',
});

// Middleware to verify Firebase Auth Token
const verifyFirebaseToken = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(403).json({ error: 'Unauthorized: No token provided' });

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // यूज़र की आईडी यहाँ सेव हो जाएगी
        next();
    } catch (error) {
        res.status(403).json({ error: 'Unauthorized: Invalid Firebase Token' });
    }
};

app.post('/api/chat', verifyFirebaseToken, async (req, res) => {
    try {
        const { userMessage } = req.body;
        const userId = req.user.uid; // Firebase से मिला UID

        const completion = await openai.chat.completions.create({
            model: "meta/llama-3.3-70b-instruct",
            messages: [{ "role": "user", "content": userMessage }],
            temperature: 0.2,
            max_tokens: 1024
        });

        res.json({ success: true, reply: completion.choices[0].message.content, forUser: userId });
    } catch (error) {
        res.status(500).json({ error: 'AI Error' });
    }
});

app.listen(PORT, () => console.log(`Secure Server Running on ${PORT}`));
