/* ===========================
   PhoneTransfer — Auth Module
   Supabase + Apple Sign In
   =========================== */

const SUPABASE_URL = 'https://rweyquphulpwyvleczci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZGUiOiJ3ZXlxdXBodWxwd3l2bGVjemNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTY0MTEsImV4cCI6MjA4NjU5MjQxMX0.Tz9p_W5uB_P5v_m7_Uu26U69T3S7EwI_Is9-5_b0o_o';

let supabaseClient = null;

// ---- Init ----
function initSupabase() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[Auth] Supabase initialized');
        return supabaseClient;
    } else {
        console.warn('[Auth] Supabase JS not loaded — running in offline mode');
        return null;
    }
}

// ---- Get Current User ----
async function getUser() {
    if (!supabaseClient) return null;
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user;
    } catch (e) {
        console.warn('[Auth] getUser error:', e);
        return null;
    }
}

// ---- Get Session ----
async function getSession() {
    if (!supabaseClient) return null;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session;
    } catch (e) {
        console.warn('[Auth] getSession error:', e);
        return null;
    }
}

// ---- Sign In with Apple ----
// Uses native Sign in with Apple on iOS (via Capacitor plugin),
// then passes the ID token directly to Supabase.
// This approach does NOT require an Apple client secret in Supabase dashboard.
async function signInWithApple() {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

    if (isNative && supabaseClient) {
        // ---- Native iOS: use Apple's native sign in dialog ----
        try {
            const { SignInWithApple } = await import('@nicepkg/capacitor-sign-in-with-apple');
            const result = await SignInWithApple.authorize({
                clientId: 'app.phonetransfer.PhoneTransfer',
                redirectURI: SUPABASE_URL + '/auth/v1/callback',
                scopes: 'email name',
            });

            // Pass the identity token to Supabase
            const { data, error } = await supabaseClient.auth.signInWithIdToken({
                provider: 'apple',
                token: result.response.identityToken,
                nonce: result.response.nonce || undefined,
            });

            if (error) {
                console.error('[Auth] Supabase SIWA error:', error);
                return { user: null, error };
            }

            console.log('[Auth] Signed in via native Apple:', data.user?.id);
            return { user: data.user, error: null };
        } catch (e) {
            console.error('[Auth] Native Apple Sign In error:', e);
            // Fall back to OAuth if native fails
            return signInWithAppleOAuth();
        }
    } else if (supabaseClient) {
        // ---- Web: use Supabase OAuth redirect ----
        return signInWithAppleOAuth();
    } else {
        // ---- Dev fallback: simulate sign in ----
        console.warn('[Auth] Supabase not initialized — simulating sign in');
        localStorage.setItem('phonetransfer_auth', JSON.stringify({
            id: 'dev-user-' + Date.now(),
            email: 'dev@test.com',
            provider: 'dev',
            signedInAt: new Date().toISOString()
        }));
        return { user: { id: 'dev-user' }, error: null };
    }
}

// ---- Sign In with Apple (OAuth fallback for web) ----
async function signInWithAppleOAuth() {
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: window.location.origin + '/index.html',
                skipBrowserRedirect: false
            }
        });

        if (error) {
            console.error('[Auth] Apple OAuth error:', error);
            return { user: null, error };
        }

        return { user: data, error: null };
    } catch (e) {
        console.error('[Auth] Apple OAuth exception:', e);
        return { user: null, error: e };
    }
}

// ---- Sign Out ----
async function signOut() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    localStorage.removeItem('phonetransfer_auth');
    console.log('[Auth] Signed out');
}

// ---- Check if Signed In ----
async function isSignedIn() {
    // Check Supabase session first
    const session = await getSession();
    if (session) return true;

    // Fallback to localStorage (dev mode)
    const localAuth = localStorage.getItem('phonetransfer_auth');
    return !!localAuth;
}

// ---- Listen for Auth Changes ----
function onAuthStateChange(callback) {
    if (!supabaseClient) return;
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('[Auth] State changed:', event);
        callback(event, session);
    });
}

// ---- Link User to RevenueCat ----
async function linkToRevenueCat() {
    const user = await getUser();
    if (!user) return;

    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    if (isNative) {
        try {
            const { Purchases } = await import('@revenuecat/purchases-capacitor');
            await Purchases.logIn({ appUserID: user.id });
            console.log('[Auth] Linked user to RevenueCat:', user.id);
        } catch (e) {
            console.warn('[Auth] RevenueCat link error:', e);
        }
    }
}

// ---- Export ----
window.PhoneTransferAuth = {
    init: initSupabase,
    signInWithApple,
    signOut,
    getUser,
    getSession,
    isSignedIn,
    onAuthStateChange,
    linkToRevenueCat,
};
