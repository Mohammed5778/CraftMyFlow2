
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import { CommunityPost, SavedConversation, PurchaseRecord } from '../types';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDBpYxSx0MYQ6c_RRSOLvqEEWkKOMq5Zg0", // This is a public demo key
    authDomain: "sign-b2acd.firebaseapp.com",
    databaseURL: "https://sign-b2acd-default-rtdb.firebaseio.com",
    projectId: "sign-b2acd",
    storageBucket: "sign-b2acd.appspot.com",
    messagingSenderId: "1039449385751",
    appId: "1:1039449385751:web:e63d9b04d5698595922552",
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const database = firebase.database();

// --- UTILS ---
const generateLicenseKey = () => {
    const segments = [
        Math.random().toString(36).substring(2, 7),
        Math.random().toString(36).substring(2, 7),
        Math.random().toString(36).substring(2, 7),
        Math.random().toString(36).substring(2, 7)
    ];
    return segments.join('-').toUpperCase();
};


// --- COMMUNITY POSTS ---
export const addCommunityPost = (postData: Omit<CommunityPost, 'id' | 'createdAt'>) => {
    const postWithTimestamp = {
        ...postData,
        createdAt: new Date().toISOString(),
    };
    return database.ref('communityPosts').push(postWithTimestamp);
};

export const getCommunityPosts = (callback: (posts: CommunityPost[]) => void) => {
    const postsRef = database.ref('communityPosts');
    postsRef.on('value', (snapshot) => {
        const posts: CommunityPost[] = [];
        snapshot.forEach((childSnapshot) => {
            posts.push({
                id: childSnapshot.key!,
                ...childSnapshot.val(),
            });
        });
        callback(posts.reverse()); // Show newest first
    });
    return () => postsRef.off('value');
};

export const approveCommunityPost = (postId: string) => {
    return database.ref(`communityPosts/${postId}`).update({ isApproved: true });
};


// --- USER DASHBOARD ---

export const saveConversation = (userId: string, conversationData: Omit<SavedConversation, 'id' | 'createdAt' | 'userId'>) => {
    const dataWithTimestamp = {
        ...conversationData,
        userId,
        createdAt: new Date().toISOString(),
    };
    return database.ref(`users/${userId}/conversations`).push(dataWithTimestamp);
};

export const getUserConversations = (userId: string, callback: (posts: SavedConversation[]) => void) => {
    const conversationsRef = database.ref(`users/${userId}/conversations`);
    conversationsRef.on('value', (snapshot) => {
        const conversations: SavedConversation[] = [];
        snapshot.forEach((childSnapshot) => {
            conversations.push({
                id: childSnapshot.key!,
                ...childSnapshot.val(),
            });
        });
        callback(conversations.reverse());
    });
    return () => conversationsRef.off('value');
};

export const addPurchase = (userId: string, post: CommunityPost) => {
    const purchaseData: Omit<PurchaseRecord, 'id'> = {
        userId,
        postId: post.id,
        postTitle: post.title,
        price: post.isPaid ? post.price : 0,
        purchasedAt: new Date().toISOString(),
        licenseKey: post.isPaid ? generateLicenseKey() : undefined,
    };
    return database.ref(`users/${userId}/purchases/${post.id}`).set(purchaseData);
};

export const getUserPurchases = (userId: string, callback: (purchases: PurchaseRecord[]) => void) => {
    const purchasesRef = database.ref(`users/${userId}/purchases`);
    purchasesRef.on('value', (snapshot) => {
        const purchases: PurchaseRecord[] = [];
        snapshot.forEach((childSnapshot) => {
            purchases.push({
                id: childSnapshot.key!,
                ...childSnapshot.val(),
            });
        });
        callback(purchases.reverse());
    });
    return () => purchasesRef.off('value');
};
