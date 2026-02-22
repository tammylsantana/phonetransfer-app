/* ===========================
   PhoneTransfer — Super Premium Edition
   Multi-carrier, bidirectional, premium UX
   =========================== */

(function () {
    'use strict';

    // ---- Haptic Motion — Ripple + Vibration ----
    function addRipple(e) {
        const target = e.currentTarget;
        if (navigator.vibrate) navigator.vibrate(8);
        const ripple = document.createElement('span');
        ripple.className = 'tap-ripple';
        const rect = target.getBoundingClientRect();
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        target.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    }

    function bindRipples() {
        const selectors = '.carrier-option, .direction-option, .btn, .btn-begin, .checklist-item, .faq-question, .troubleshoot-toggle, .step-dot, .theme-toggle';
        document.querySelectorAll(selectors).forEach(el => {
            el.addEventListener('click', addRipple);
        });
    }


    // ---- Onboarding + Auth + Paywall Flow ----
    const OB_KEY = 'phonetransfer_onboarded';
    const SUB_KEY = 'phonetransfer_subscribed';
    const AUTH_KEY = 'phonetransfer_auth';

    // ---- Stripe Payment Link (web sales) ----
    // Replace this with your actual Stripe Payment Link URL
    const STRIPE_PAYMENT_LINK = 'STRIPE_LINK_PLACEHOLDER';

    async function initFlow() {
        // Initialize Supabase auth
        if (window.PhoneTransferAuth) {
            window.PhoneTransferAuth.init();
        }

        // Check if returning from Stripe payment
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('purchased') === 'true') {
            localStorage.setItem(SUB_KEY, JSON.stringify({
                plan: 'lifetime',
                subscribedAt: new Date().toISOString(),
                status: 'active',
                source: 'stripe'
            }));
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }

        const onboarded = localStorage.getItem(OB_KEY);
        const subscribed = localStorage.getItem(SUB_KEY);
        const signedIn = await checkAuthStatus();

        if (!onboarded) {
            showOnboarding();
        } else if (!signedIn) {
            hideOnboarding();
            showAuthScreen();
        } else if (!subscribed) {
            hideOnboarding();
            hideAuthScreen();
            showPaywall();
        } else {
            hideOnboarding();
            hideAuthScreen();
            hidePaywall();
            showMainApp();
        }

        // Wire up auth buttons
        const appleBtn = document.getElementById('appleSignInBtn');
        const skipBtn = document.getElementById('authSkipBtn');
        if (appleBtn) {
            appleBtn.addEventListener('click', handleAppleSignIn);
        }
        if (skipBtn) {
            skipBtn.addEventListener('click', handleAuthSkip);
        }
    }

    async function checkAuthStatus() {
        if (window.PhoneTransferAuth) {
            return await window.PhoneTransferAuth.isSignedIn();
        }
        return !!localStorage.getItem(AUTH_KEY);
    }

    function showAuthScreen() {
        const el = document.getElementById('authScreen');
        if (el) el.classList.remove('hidden');
    }

    function hideAuthScreen() {
        const el = document.getElementById('authScreen');
        if (el) el.classList.add('hidden');
    }

    async function handleAppleSignIn() {
        const btn = document.getElementById('appleSignInBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Signing in...';
        }

        if (window.PhoneTransferAuth) {
            const { user, error } = await window.PhoneTransferAuth.signInWithApple();
            if (error) {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<svg width="20" height="24" viewBox="0 0 20 24" fill="white"><path d="M15.07 12.95c-.03-2.76 2.25-4.08 2.35-4.15-1.28-1.87-3.27-2.13-3.98-2.16-1.69-.17-3.31 1-4.17 1-0.86 0-2.18-.98-3.59-.95-1.85.03-3.55 1.07-4.5 2.73-1.92 3.33-.49 8.26 1.38 10.96 0.92 1.32 2.01 2.81 3.45 2.76 1.38-.06 1.9-.89 3.57-.89 1.66 0 2.13.89 3.58.86 1.49-.02 2.43-1.35 3.34-2.68 1.05-1.54 1.48-3.03 1.51-3.11-.03-.01-2.9-1.11-2.94-4.37zM12.32 4.9c.76-.92 1.28-2.2 1.14-3.47-1.1.04-2.44.73-3.23 1.65-.71.82-1.33 2.13-1.16 3.39 1.23.09 2.48-.62 3.25-1.57z"/></svg> Sign in with Apple';
                }
                alert('Sign in failed. Please try again.');
                return;
            }
            // Link user to RevenueCat
            await window.PhoneTransferAuth.linkToRevenueCat();
        } else {
            // Dev fallback
            localStorage.setItem(AUTH_KEY, JSON.stringify({
                id: 'dev-user-' + Date.now(),
                provider: 'dev',
                signedInAt: new Date().toISOString()
            }));
        }

        hideAuthScreen();
        const subscribed = localStorage.getItem(SUB_KEY);
        if (!subscribed) {
            showPaywall();
        } else {
            showMainApp();
        }
    }

    function handleAuthSkip() {
        // Allow skipping in dev/browser mode
        localStorage.setItem(AUTH_KEY, JSON.stringify({
            id: 'skipped-' + Date.now(),
            provider: 'skip',
            signedInAt: new Date().toISOString()
        }));
        hideAuthScreen();
        const subscribed = localStorage.getItem(SUB_KEY);
        if (!subscribed) {
            showPaywall();
        } else {
            showMainApp();
        }
    }

    // ---- Onboarding ----
    let obSlide = 0;
    const OB_TOTAL = 3;

    function showOnboarding() {
        const screen = document.getElementById('onboardingScreen');
        const track = document.getElementById('obTrack');
        const nextBtn = document.getElementById('obNextBtn');
        const skipBtn = document.getElementById('obSkip');

        screen.classList.remove('hidden');

        function goToObSlide(i) {
            obSlide = i;
            track.style.transform = `translateX(-${i * 100}%)`;
            document.querySelectorAll('.ob-dot').forEach((d, idx) => {
                d.classList.toggle('active', idx === i);
            });
            if (i === OB_TOTAL - 1) {
                nextBtn.innerHTML = 'Get Started <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            }
        }

        nextBtn.addEventListener('click', () => {
            if (obSlide < OB_TOTAL - 1) {
                goToObSlide(obSlide + 1);
            } else {
                finishOnboarding();
            }
        });

        skipBtn.addEventListener('click', finishOnboarding);

        // Dot clicks
        document.querySelectorAll('.ob-dot').forEach(dot => {
            dot.addEventListener('click', () => goToObSlide(parseInt(dot.dataset.dot)));
        });

        // Swipe
        let obTouchStart = 0;
        screen.addEventListener('touchstart', (e) => { obTouchStart = e.changedTouches[0].screenX; }, { passive: true });
        screen.addEventListener('touchend', (e) => {
            const diff = obTouchStart - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 60) {
                if (diff > 0 && obSlide < OB_TOTAL - 1) goToObSlide(obSlide + 1);
                else if (diff < 0 && obSlide > 0) goToObSlide(obSlide - 1);
            }
        }, { passive: true });
    }

    async function finishOnboarding() {
        localStorage.setItem(OB_KEY, '1');
        hideOnboarding();
        const signedIn = await checkAuthStatus();
        if (!signedIn) {
            showAuthScreen();
        } else {
            const subscribed = localStorage.getItem(SUB_KEY);
            if (!subscribed) {
                showPaywall();
            } else {
                showMainApp();
            }
        }
    }

    function hideOnboarding() {
        const el = document.getElementById('onboardingScreen');
        if (el) el.classList.add('hidden');
    }

    // ---- Paywall ----
    function showPaywall() {
        const screen = document.getElementById('paywallScreen');
        screen.classList.remove('hidden');

        // Subscribe
        document.getElementById('pwSubscribeBtn').addEventListener('click', () => {
            handleSubscribe();
        });

        // Restore
        document.getElementById('pwRestoreBtn').addEventListener('click', handleRestore);
    }

    function hidePaywall() {
        const el = document.getElementById('paywallScreen');
        if (el) el.classList.add('hidden');
    }

    async function handleSubscribe() {
        /* RevenueCat Integration — Real SDK */
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative) {
            try {
                const { Purchases } = await import('@revenuecat/purchases-capacitor');
                await Purchases.configure({ apiKey: 'kyu8sn53p4' });
                const offerings = await Purchases.getOfferings();

                if (offerings.current && offerings.current.availablePackages.length > 0) {
                    const pkg = offerings.current.availablePackages[0]; // lifetime package
                    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

                    if (customerInfo.entitlements.active['pro']) {
                        localStorage.setItem(SUB_KEY, JSON.stringify({
                            plan: 'lifetime',
                            subscribedAt: new Date().toISOString(),
                            status: 'active'
                        }));
                        hidePaywall();
                        showMainApp();
                    }
                } else {
                    alert('No offerings available. Please try again later.');
                }
            } catch (e) {
                if (e.userCancelled) {
                    // User cancelled, do nothing
                } else {
                    console.error('RevenueCat purchase error:', e);
                    alert('Purchase failed. Please try again.');
                }
            }
        } else {
            // Browser/web mode — redirect to Stripe
            if (STRIPE_PAYMENT_LINK && STRIPE_PAYMENT_LINK !== 'STRIPE_LINK_PLACEHOLDER') {
                window.location.href = STRIPE_PAYMENT_LINK;
            } else {
                // Dev fallback — simulate purchase
                localStorage.setItem(SUB_KEY, JSON.stringify({
                    plan: 'lifetime',
                    subscribedAt: new Date().toISOString(),
                    status: 'active'
                }));
                hidePaywall();
                showMainApp();
            }
        }
    }

    async function handleRestore() {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative) {
            try {
                const { Purchases } = await import('@revenuecat/purchases-capacitor');
                await Purchases.configure({ apiKey: 'kyu8sn53p4' });
                const { customerInfo } = await Purchases.restorePurchases();

                if (customerInfo.entitlements.active['pro']) {
                    localStorage.setItem(SUB_KEY, JSON.stringify({
                        plan: 'lifetime',
                        subscribedAt: new Date().toISOString(),
                        status: 'active'
                    }));
                    hidePaywall();
                    showMainApp();
                } else {
                    alert('No previous purchases found.');
                }
            } catch (e) {
                console.error('RevenueCat restore error:', e);
                alert('Restore failed. Please try again.');
            }
        } else {
            // Browser/dev mode
            const existing = localStorage.getItem(SUB_KEY);
            if (existing) {
                hidePaywall();
                showMainApp();
            } else {
                alert('No previous purchases found. Please subscribe to continue.');
            }
        }
    }

    function showMainApp() {
        const el = document.getElementById('mainApp');
        if (el) el.classList.remove('hidden');
        initSetup();
    }

    // ---- State ----
    let config = {
        direction: null,
        fromCarrier: null,
        toCarrier: null,
    };
    let currentStep = 0;
    let totalSteps = 0;
    let allCheckboxes = [];
    let milestoneShown = { 25: false, 50: false, 75: false };

    // ---- Carrier porting info ----
    const CARRIER_INFO = {
        'T-Mobile': { phone: '611 or 1-800-937-8997', pinInstructions: 'Open the T-Mobile app, go to Account, then Profile settings, and request a Number Transfer PIN. It\'s valid for 7 days.', accountInstructions: 'Open the T-Mobile app, tap Account, and look for your account number. Or dial 611 and ask.' },
        'AT&T': { phone: '611 or 1-800-331-0500', pinInstructions: 'Visit att.com/transferpin or call 611 to request a transfer PIN.', accountInstructions: 'Log in to att.com, go to Profile, then Account info to find your account number.' },
        'Verizon': { phone: '611 or 1-800-922-0204', pinInstructions: 'Log in to My Verizon, go to Account, then Account PIN. You can also call 611.', accountInstructions: 'Log in to My Verizon or the My Verizon app. Your account number is under Account, then Account overview.' },
        'US Cellular': { phone: '611 or 1-888-944-9400', pinInstructions: 'Call 611 or visit a US Cellular store to request a transfer PIN.', accountInstructions: 'Log in to My Account at uscellular.com or call 611 to get your account number.' },
        'Mint Mobile': { phone: '611 or 1-800-683-7392', pinInstructions: 'Log in to your Mint Mobile account online. Go to Account, then Transfer PIN to generate one.', accountInstructions: 'Log in to mintmobile.com or the Mint Mobile app. Your account number is under Account settings.' },
        'Cricket': { phone: '611 or 1-800-274-2538', pinInstructions: 'Call 611 or visit cricketwireless.com to request a transfer PIN.', accountInstructions: 'Log in to myCricket app or cricketwireless.com. Your account number is in Account details.' },
        'Metro by T-Mobile': { phone: '611 or 1-888-863-8768', pinInstructions: 'Call 611 and request a port-out PIN, or visit a Metro store.', accountInstructions: 'Call 611 or visit a Metro by T-Mobile store to get your account number.' },
        'Boost Mobile': { phone: '611 or 1-866-402-7366', pinInstructions: 'Call 611 or log in to your Boost account online to get your transfer PIN.', accountInstructions: 'Your Boost Mobile phone number is typically your account number. Call 611 to confirm.' },
        'Visible': { phone: 'Chat support at visible.com', pinInstructions: 'Contact Visible support via chat at visible.com to request a transfer PIN.', accountInstructions: 'Log in at visible.com. Your account number is in your Account settings.' },
        'Google Fi': { phone: '1-844-825-5234', pinInstructions: 'Go to fi.google.com/account, click Manage plan, then Transfer your number to see your PIN.', accountInstructions: 'Go to fi.google.com/account. Your account number is listed under your plan details.' },
        'Xfinity Mobile': { phone: '1-888-936-4968', pinInstructions: 'Log in to your Xfinity account and go to the transfer PIN section, or call support.', accountInstructions: 'Log in at xfinity.com/mobile. Your account number is in your Account settings.' },
        'Spectrum Mobile': { phone: '1-833-224-6603', pinInstructions: 'Call Spectrum Mobile support to request a transfer PIN.', accountInstructions: 'Log in to your Spectrum account or call support to get your account number.' },
        'Same Carrier': null,
    };

    // ---- Troubleshooting data per step ----
    const TROUBLESHOOT = {
        transfer_android: [
            { q: 'The "Move to iOS" code isn\'t showing up', a: 'Make sure your iPhone is on the "Apps & Data" screen. If you already passed it, you may need to factory reset the iPhone and start setup again. Both phones must be on the same Wi-Fi network.' },
            { q: 'Transfer keeps failing or disconnecting', a: 'Turn off mobile data on your Android. Disable any VPN apps. Make sure both phones stay on and unlocked during the entire transfer. Move closer to your Wi-Fi router.' },
            { q: 'Transfer is taking forever', a: 'Large photo/video libraries can take 30+ minutes. Don\'t touch either phone during transfer. If it\'s truly stuck for over an hour, try restarting both phones and attempting again.' },
        ],
        transfer_iphone: [
            { q: 'Google Photos backup is stuck', a: 'Make sure you\'re on Wi-Fi and plugged in. Go to Google Photos settings and check if backup is turned on. Try clearing the app cache.' },
            { q: 'iMessage texts aren\'t going through on Android', a: 'You MUST deregister iMessage. Go to Settings > Messages > turn off iMessage on your iPhone. Then visit selfsolve.apple.com/deregister-imessage.' },
            { q: 'Cable transfer not working', a: 'Make sure you\'re using the correct cable (USB-C to Lightning or USB-C to USB-C). Try a different cable. Some Android phones need you to select "File Transfer" mode in the USB notification.' },
        ],
        carrier: [
            { q: 'My number hasn\'t ported yet', a: 'Porting can take anywhere from a few minutes to 24 hours. If it\'s been over 24 hours, contact your new carrier\'s support. Make sure you entered the correct account number and PIN.' },
            { q: 'I lost service on both phones', a: 'This is normal during the porting process. It usually resolves within 15-30 minutes. If it persists, restart your new phone and contact your new carrier.' },
            { q: 'My old carrier says I have an outstanding balance', a: 'You may still owe your final bill to your old carrier. Porting your number doesn\'t automatically cancel your old account. Contact your old carrier to settle any remaining balance.' },
        ],
        apps: [
            { q: 'My paid apps didn\'t transfer', a: 'Unfortunately, paid apps must be repurchased on the new platform. App purchases don\'t transfer between Google Play and the App Store. Game saves may transfer if the app uses cloud saves.' },
            { q: 'WhatsApp chats won\'t transfer', a: 'Make sure both phones are on the latest version of WhatsApp. Use the official "Move Chats" feature: WhatsApp > Settings > Chats > Transfer chats. Both phones need to be connected to the same Wi-Fi.' },
        ],
        final: [
            { q: 'Some contacts are missing', a: 'Check if contacts are stored locally on the old phone vs. in your Google/iCloud account. You might need to export contacts as a .vcf file and import them manually.' },
            { q: 'Two-factor auth codes aren\'t working', a: 'If you used Google Authenticator, you need to transfer accounts within the app before switching. For other 2FA apps, look for a "Transfer" or "Export" option. You may need backup codes.' },
        ],
    };

    // ---- Sound effects (Web Audio) ----
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx;
    function playSound(type) {
        if (!audioCtx) try { audioCtx = new AudioCtx(); } catch (e) { return; }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.value = 0.08;
        if (type === 'check') {
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.start(); osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'milestone') {
            osc.frequency.value = 660;
            osc.type = 'sine';
            gain.gain.value = 0.06;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            osc.start();
            setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const g2 = audioCtx.createGain();
                osc2.connect(g2); g2.connect(audioCtx.destination);
                osc2.frequency.value = 880; osc2.type = 'sine';
                g2.gain.value = 0.06;
                g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                osc2.start(); osc2.stop(audioCtx.currentTime + 0.3);
            }, 150);
            osc.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'navigate') {
            osc.frequency.value = 500;
            osc.type = 'sine';
            gain.gain.value = 0.04;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            osc.start(); osc.stop(audioCtx.currentTime + 0.08);
        }
    }

    // ---- DOM Refs ----
    const setupScreen = document.getElementById('setupScreen');
    const wizardScreen = document.getElementById('wizardScreen');
    const stepNav = document.getElementById('stepNav');
    const beginBtn = document.getElementById('beginBtn');
    const backBtn = document.getElementById('backBtn');
    const nextBtn = document.getElementById('nextBtn');
    const confettiCanvas = document.getElementById('confetti-canvas');

    // ---- Setup Screen Logic ----
    function initSetup() {
        document.querySelectorAll('.direction-option').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('.direction-option').forEach(d => d.classList.remove('selected'));
                el.classList.add('selected');
                config.direction = el.dataset.direction;
                playSound('check');
                checkSetupReady();
            });
        });

        document.querySelectorAll('#fromCarrierGrid .carrier-option').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('#fromCarrierGrid .carrier-option').forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                config.fromCarrier = el.dataset.carrier;
                playSound('check');
                checkSetupReady();
            });
        });

        document.querySelectorAll('#toCarrierGrid .carrier-option').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('#toCarrierGrid .carrier-option').forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                config.toCarrier = el.dataset.carrier;
                playSound('check');
                checkSetupReady();
            });
        });

        beginBtn.addEventListener('click', startWizard);

        // Check for saved progress and show resume toast
        checkForResume();

        // Bind haptic ripples on setup screen elements
        bindRipples();
    }

    function checkSetupReady() {
        beginBtn.disabled = !(config.direction && config.fromCarrier && config.toCarrier);
    }

    // ---- Resume Toast ----
    function checkForResume() {
        try {
            const savedStep = localStorage.getItem('phonetransfer_step');
            const savedConfig = localStorage.getItem('phonetransfer_config');
            if (savedStep && savedConfig && parseInt(savedStep) > 0) {
                const cfg = JSON.parse(savedConfig);
                const toast = document.createElement('div');
                toast.className = 'resume-toast';
                toast.innerHTML = `
                    <div class="resume-toast-text">
                        <strong>Welcome back!</strong>
                        <span>You were on step ${parseInt(savedStep) + 1} — ${cfg.fromCarrier} to ${cfg.toCarrier}</span>
                    </div>
                    <button class="resume-toast-btn" id="resumeBtn">Resume</button>
                    <button class="resume-toast-dismiss" id="dismissToast">&times;</button>
                `;
                document.body.appendChild(toast);
                setTimeout(() => toast.classList.add('visible'), 100);

                document.getElementById('resumeBtn').addEventListener('click', () => {
                    config = cfg;
                    // Select the right options visually
                    document.querySelector(`.direction-option[data-direction="${cfg.direction}"]`)?.classList.add('selected');
                    document.querySelector(`#fromCarrierGrid .carrier-option[data-carrier="${cfg.fromCarrier}"]`)?.classList.add('selected');
                    document.querySelector(`#toCarrierGrid .carrier-option[data-carrier="${cfg.toCarrier}"]`)?.classList.add('selected');
                    toast.classList.remove('visible');
                    setTimeout(() => { toast.remove(); startWizard(); }, 400);
                });

                document.getElementById('dismissToast').addEventListener('click', () => {
                    toast.classList.remove('visible');
                    setTimeout(() => toast.remove(), 400);
                });

                // Auto-dismiss after 8s
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.classList.remove('visible');
                        setTimeout(() => toast.remove(), 400);
                    }
                }, 8000);
            }
        } catch (e) { }
    }

    // ---- Build Wizard Steps ----
    function startWizard() {
        // Save config
        try { localStorage.setItem('phonetransfer_config', JSON.stringify(config)); } catch (e) { }

        setupScreen.classList.add('hidden');
        wizardScreen.classList.remove('hidden');
        stepNav.classList.remove('hidden');

        const steps = buildSteps();
        totalSteps = steps.length;

        // Build step indicators
        const indicatorsEl = document.getElementById('stepIndicators');
        indicatorsEl.innerHTML = '';
        for (let i = 0; i < totalSteps; i++) {
            const dot = document.createElement('div');
            dot.className = 'step-dot' + (i === 0 ? ' active' : '');
            dot.dataset.step = i;
            dot.innerHTML = `<span>${i + 1}</span>`;
            dot.addEventListener('click', () => {
                if (i <= currentStep + 1) goToStep(i);
            });
            indicatorsEl.appendChild(dot);
        }

        // Build steps track
        const track = document.getElementById('stepsTrack');
        track.innerHTML = '';
        steps.forEach((html, i) => {
            const section = document.createElement('section');
            section.className = 'step' + (i === 0 ? ' active' : '');
            section.dataset.step = i;
            section.innerHTML = html;
            track.appendChild(section);
        });

        // Re-query checkboxes
        allCheckboxes = Array.from(document.querySelectorAll('.checklist-item input[type="checkbox"]'));
        allCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                playSound('check');
                saveProgress();
                updateProgressBar();
                updateTimeEstimate();
                checkMilestones();
                if (navigator.vibrate) navigator.vibrate(10);
            });
        });

        // Troubleshooting toggles
        document.querySelectorAll('.troubleshoot-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('open');
                const items = btn.nextElementSibling;
                items.classList.toggle('open');
            });
        });

        // FAQ toggles
        document.querySelectorAll('.faq-question').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('open');
                const answer = btn.nextElementSibling;
                answer.classList.toggle('open');
            });
        });

        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.addEventListener('click', resetAll);

        loadProgress();
        updateUI();
        updateTimeEstimate();

        // Bind haptic ripples on wizard elements
        bindRipples();

        // Bind nav
        nextBtn.addEventListener('click', goNext);
        backBtn.addEventListener('click', goBack);

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (setupScreen && !setupScreen.classList.contains('hidden')) return;
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goBack();
        });

        // Swipe
        let touchStartX = 0;
        document.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
        document.addEventListener('touchend', (e) => {
            const diff = touchStartX - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 60) { diff > 0 ? goNext() : goBack(); }
        }, { passive: true });
    }

    function buildTroubleshootHTML(key) {
        const items = TROUBLESHOOT[key];
        if (!items || items.length === 0) return '';
        const chevronSVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const plusSVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
        let html = `<div class="troubleshoot-section">
            <button class="troubleshoot-toggle">Need Help? ${chevronSVG}</button>
            <div class="troubleshoot-items">`;
        items.forEach(item => {
            html += `<div class="faq-card"><button class="faq-question">${item.q} ${plusSVG}</button><div class="faq-answer">${item.a}</div></div>`;
        });
        html += '</div></div>';
        return html;
    }

    function buildSteps() {
        const isAndroidToIphone = config.direction === 'android-to-iphone';
        const fromLabel = isAndroidToIphone ? 'Android' : 'iPhone';
        const toLabel = isAndroidToIphone ? 'iPhone' : 'Android';
        const fromCarrier = config.fromCarrier;
        const toCarrier = config.toCarrier;
        const sameCarrier = fromCarrier === 'Same Carrier' || toCarrier === 'Same Carrier' || fromCarrier === toCarrier;

        const steps = [];

        // Step 0: Welcome
        steps.push(`
            <div class="step-card welcome-card">
                <div class="step-icon-large">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="22" stroke="url(#wGrad)" stroke-width="2.5"/>
                        <path d="M20 16l12 8-12 8V16z" fill="url(#wGrad)"/>
                        <defs><linearGradient id="wGrad" x1="2" y1="2" x2="46" y2="46"><stop stop-color="#007AFF"/><stop offset="1" stop-color="#5856D6"/></linearGradient></defs>
                    </svg>
                </div>
                <h2>Welcome!</h2>
                <p class="step-subtitle">Let's move everything from your <strong>${fromLabel}</strong> to your new <strong>${toLabel}</strong>.</p>
                <div class="info-box">
                    <div class="info-row"><span class="label">From</span><span class="value">${fromLabel} &middot; ${sameCarrier ? fromCarrier : fromCarrier}</span></div>
                    <div class="info-row"><span class="label">To</span><span class="value">${toLabel} &middot; ${sameCarrier ? fromCarrier : toCarrier}</span></div>
                </div>
                <div class="time-estimate" id="timeEstimate">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M7 4v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                    <span id="timeEstimateText">Estimated time: ~45 min</span>
                </div>
                <div class="completion-ring-container">
                    <svg class="completion-ring" width="120" height="120" viewBox="0 0 120 120">
                        <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="120" y2="120"><stop stop-color="#007AFF"/><stop offset="1" stop-color="#34C759"/></linearGradient></defs>
                        <circle class="completion-ring-bg" cx="60" cy="60" r="52"/>
                        <circle class="completion-ring-fill" id="completionRingFill" cx="60" cy="60" r="52" stroke-dasharray="326.73" stroke-dashoffset="326.73"/>
                    </svg>
                    <div class="completion-ring-label">
                        <span class="completion-ring-percent" id="ringPercent">0%</span>
                        <span class="completion-ring-sub">complete</span>
                    </div>
                </div>
                <p class="step-description">This guide will walk you through every step — transferring your photos, contacts, messages, apps${sameCarrier ? '' : ', and even switching your carrier'}.</p>
                <div class="tip-box">
                    <div class="tip-icon-svg"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="#007AFF" stroke-width="1.5"/><path d="M9 5v4M9 12h.01" stroke="#007AFF" stroke-width="1.5" stroke-linecap="round"/></svg></div>
                    <p><strong>Tip:</strong> Keep both phones charged and connected to Wi-Fi throughout the process.</p>
                </div>
            </div>
        `);

        // Step 1: Before You Start
        const backupInstructions = isAndroidToIphone
            ? 'Go to <em>Settings &rarr; Google &rarr; Backup</em> and tap "Back up now".'
            : 'Go to <em>Settings &rarr; [Your Name] &rarr; iCloud &rarr; iCloud Backup</em> and tap "Back Up Now".';
        const accountNote = isAndroidToIphone
            ? 'Know your Google account password — you\'ll need it to sign in to Google apps on your iPhone.'
            : 'Know your Apple ID and password — you\'ll need it if you use iCloud or want to access purchases.';

        steps.push(`
            <div class="step-card">
                <div class="step-icon-large">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <rect x="10" y="4" width="28" height="40" rx="4" stroke="url(#pGrad)" stroke-width="2.5"/>
                        <line x1="16" y1="14" x2="32" y2="14" stroke="url(#pGrad)" stroke-width="2" stroke-linecap="round"/>
                        <line x1="16" y1="22" x2="28" y2="22" stroke="url(#pGrad)" stroke-width="2" stroke-linecap="round"/>
                        <line x1="16" y1="30" x2="24" y2="30" stroke="url(#pGrad)" stroke-width="2" stroke-linecap="round"/>
                        <defs><linearGradient id="pGrad" x1="10" y1="4" x2="38" y2="44"><stop stop-color="#FF9500"/><stop offset="1" stop-color="#FF3B30"/></linearGradient></defs>
                    </svg>
                </div>
                <h2>Before You Start</h2>
                <p class="step-subtitle">Get these things ready first so the transfer goes smoothly.</p>
                <div class="checklist" data-group="prep">
                    <label class="checklist-item"><input type="checkbox" data-key="prep-wifi"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Connect both phones to Wi-Fi</strong><p>Both phones need to be on the same Wi-Fi network.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="prep-charge"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Charge both phones above 50%</strong><p>Or keep them plugged in during the transfer.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="prep-backup"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Back up your ${fromLabel} phone</strong><p>${backupInstructions}</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="prep-account"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Know your account credentials</strong><p>${accountNote}</p></div></label>
                    ${!sameCarrier ? `<label class="checklist-item"><input type="checkbox" data-key="prep-carrier-info"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Get your ${fromCarrier} account info</strong><p>You'll need your <strong>account number</strong> and <strong>transfer PIN</strong>. ${CARRIER_INFO[fromCarrier]?.accountInstructions || 'Contact your carrier for details.'}</p></div></label>` : ''}
                    <label class="checklist-item"><input type="checkbox" data-key="prep-keep-active"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Don't deactivate your ${fromLabel} yet</strong><p>Keep your old phone active until the transfer${sameCarrier ? '' : ' and carrier switch'} is done.</p></div></label>
                </div>
            </div>
        `);

        // Step 2: Transfer Data
        const transferKey = isAndroidToIphone ? 'transfer_android' : 'transfer_iphone';
        let transferInstructions;
        if (isAndroidToIphone) {
            transferInstructions = `
                <label class="checklist-item"><input type="checkbox" data-key="transfer-install"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Install "Move to iOS" on your Android</strong><p>Open the Google Play Store and search for <em>"Move to iOS"</em>. Install it.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-setup"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Start setting up your iPhone</strong><p>Turn on your new iPhone. Follow setup until you reach <strong>"Apps & Data"</strong>. Tap <em>"Move Data from Android"</em>.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-code"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Enter the code</strong><p>Your iPhone will show a 6 or 10-digit code. Open "Move to iOS" on Android and enter it.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-select"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Choose what to transfer</strong><p>Select everything: <strong>Contacts, Messages, Photos, Videos, Calendar, Email, Bookmarks</strong>.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-wait"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Wait for the transfer to finish</strong><p>Can take 10–30 min. <strong>Don't touch either phone</strong> until both show it's done.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-finish"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Finish iPhone setup</strong><p>Complete the remaining setup (Apple ID, Face ID, etc.).</p></div></label>
            `;
        } else {
            transferInstructions = `
                <label class="checklist-item"><input type="checkbox" data-key="transfer-google"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Sign in to Google on Android</strong><p>During Android setup, sign in with your Google account. Contacts, calendar, and apps sync automatically.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-photos"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Transfer photos via Google Photos</strong><p>Install <em>Google Photos</em> on your iPhone if you haven't. Make sure all photos are backed up.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-contacts"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Sync contacts via Google</strong><p>On iPhone: <em>Settings &rarr; Contacts &rarr; Accounts &rarr; Google</em>, make sure Contacts is on.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-cable"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Use cable transfer (recommended)</strong><p>Connect both phones with a USB-C to Lightning cable and follow on-screen instructions.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-messages"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Disable iMessage on your iPhone</strong><p>Go to <em>Settings &rarr; Messages</em> and turn off iMessage. Also deregister at <em>selfsolve.apple.com/deregister-imessage</em>.</p></div></label>
                <label class="checklist-item"><input type="checkbox" data-key="transfer-finish"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Finish Android setup</strong><p>Complete the remaining setup steps on your Android.</p></div></label>
            `;
        }

        const transferApp = isAndroidToIphone ? '"Move to iOS"' : 'Google\'s transfer tool or cable';

        steps.push(`
            <div class="step-card">
                <div class="step-icon-large">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <rect x="4" y="10" width="16" height="28" rx="3" stroke="url(#tGrad)" stroke-width="2"/>
                        <rect x="28" y="10" width="16" height="28" rx="3" stroke="url(#tGrad)" stroke-width="2"/>
                        <path d="M20 20h8M20 24h8M20 28h8" stroke="url(#tGrad)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
                        <path d="M22 24l4-4M22 24l4 4" stroke="url(#tGrad)" stroke-width="1.5" stroke-linecap="round"/>
                        <defs><linearGradient id="tGrad" x1="4" y1="10" x2="44" y2="38"><stop stop-color="#34C759"/><stop offset="1" stop-color="#007AFF"/></linearGradient></defs>
                    </svg>
                </div>
                <h2>Transfer Your Data</h2>
                <p class="step-subtitle">Use ${transferApp} to move your stuff.</p>
                <div class="checklist" data-group="transfer">${transferInstructions}</div>
                ${buildTroubleshootHTML(transferKey)}
            </div>
        `);

        // Step 3: Carrier Switch (only if switching)
        if (!sameCarrier) {
            const fromInfo = CARRIER_INFO[fromCarrier];
            const toInfo = CARRIER_INFO[toCarrier];
            steps.push(`
                <div class="step-card">
                    <div class="step-icon-large">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <path d="M24 44V20" stroke="url(#cGrad)" stroke-width="2.5" stroke-linecap="round"/>
                            <path d="M24 20c0-8 8-14 8-14" stroke="url(#cGrad)" stroke-width="2.5" stroke-linecap="round"/>
                            <path d="M24 20c0-8-8-14-8-14" stroke="url(#cGrad)" stroke-width="2.5" stroke-linecap="round"/>
                            <circle cx="24" cy="14" r="4" fill="url(#cGrad)"/>
                            <defs><linearGradient id="cGrad" x1="8" y1="6" x2="40" y2="44"><stop stop-color="#5856D6"/><stop offset="1" stop-color="#AF52DE"/></linearGradient></defs>
                        </svg>
                    </div>
                    <h2>Switch to ${toCarrier}</h2>
                    <p class="step-subtitle">Port your number from ${fromCarrier} to ${toCarrier}.</p>
                    <div class="warning-box">
                        <div class="warning-icon-svg"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1L1 16h16L9 1z" stroke="#FF9500" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 7v4M9 13h.01" stroke="#FF9500" stroke-width="1.5" stroke-linecap="round"/></svg></div>
                        <p><strong>Important:</strong> Do NOT cancel your ${fromCarrier} service before porting. Your number transfers automatically.</p>
                    </div>
                    <div class="checklist" data-group="carrier">
                        <label class="checklist-item"><input type="checkbox" data-key="carrier-account"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Get your ${fromCarrier} account number</strong><p>${fromInfo?.accountInstructions || 'Contact ' + fromCarrier + ' support.'}</p></div></label>
                        <label class="checklist-item"><input type="checkbox" data-key="carrier-pin"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Get your ${fromCarrier} transfer PIN</strong><p>${fromInfo?.pinInstructions || 'Contact ' + fromCarrier + ' support.'}</p></div></label>
                        <label class="checklist-item"><input type="checkbox" data-key="carrier-activate"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Activate with ${toCarrier}</strong><p>Visit a ${toCarrier} store or call <strong>${toInfo?.phone || 'support'}</strong>. Provide your account number and PIN.</p></div></label>
                        <label class="checklist-item"><input type="checkbox" data-key="carrier-sim"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Set up your new SIM or eSIM</strong><p>${toCarrier} will activate a SIM card or eSIM on your phone.</p></div></label>
                        <label class="checklist-item"><input type="checkbox" data-key="carrier-verify"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Verify your number ported</strong><p>Make a test call and text. Porting takes <strong>minutes to a few hours</strong>.</p></div></label>
                    </div>
                    ${buildTroubleshootHTML('carrier')}
                </div>
            `);
        }

        // Step 4: Get Your Apps
        const appAlternatives = isAndroidToIphone ? `
            <div class="alt-row"><span class="alt-android">Google Messages</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">iMessage (built in)</span></div>
            <div class="alt-row"><span class="alt-android">Google Assistant</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Siri (built in)</span></div>
            <div class="alt-row"><span class="alt-android">Google Drive</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">iCloud / Google Drive app</span></div>
            <div class="alt-row"><span class="alt-android">Samsung Notes</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Apple Notes (built in)</span></div>
            <div class="alt-row"><span class="alt-android">Google Calendar</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Apple Calendar / Google Calendar</span></div>
            <div class="alt-row"><span class="alt-android">Google Wallet</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Apple Wallet (built in)</span></div>
            <div class="alt-row"><span class="alt-android">Samsung Health</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Apple Health (built in)</span></div>
        ` : `
            <div class="alt-row"><span class="alt-android">iMessage</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Google Messages (built in)</span></div>
            <div class="alt-row"><span class="alt-android">Siri</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Google Assistant (built in)</span></div>
            <div class="alt-row"><span class="alt-android">iCloud Drive</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Google Drive (built in)</span></div>
            <div class="alt-row"><span class="alt-android">Apple Notes</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Google Keep / Samsung Notes</span></div>
            <div class="alt-row"><span class="alt-android">Apple Calendar</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Google Calendar (built in)</span></div>
            <div class="alt-row"><span class="alt-android">Apple Wallet</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Google Wallet</span></div>
            <div class="alt-row"><span class="alt-android">Apple Health</span><span class="alt-arrow">&rarr;</span><span class="alt-ios">Samsung Health / Google Fit</span></div>
        `;

        steps.push(`
            <div class="step-card">
                <div class="step-icon-large">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <rect x="8" y="8" width="14" height="14" rx="4" fill="#007AFF" opacity="0.85"/>
                        <rect x="26" y="8" width="14" height="14" rx="4" fill="#34C759" opacity="0.85"/>
                        <rect x="8" y="26" width="14" height="14" rx="4" fill="#FF9500" opacity="0.85"/>
                        <rect x="26" y="26" width="14" height="14" rx="4" fill="#AF52DE" opacity="0.85"/>
                    </svg>
                </div>
                <h2>Get Your Apps</h2>
                <p class="step-subtitle">Most apps are available on both platforms.</p>
                <div class="tip-box">
                    <div class="tip-icon-svg"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="#34C759" stroke-width="1.5"/><path d="M6 9l2 2 4-4" stroke="#34C759" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                    <p><strong>Good news:</strong> Most popular apps are the same on both. Just download from ${isAndroidToIphone ? 'the App Store' : 'Google Play'} and sign in.</p>
                </div>
                <h3 class="section-title">Popular Apps — Same on Both</h3>
                <div class="app-grid">
                    <div class="app-chip">WhatsApp</div><div class="app-chip">Instagram</div><div class="app-chip">Facebook</div>
                    <div class="app-chip">TikTok</div><div class="app-chip">YouTube</div><div class="app-chip">Spotify</div>
                    <div class="app-chip">Netflix</div><div class="app-chip">Snapchat</div><div class="app-chip">X (Twitter)</div>
                    <div class="app-chip">Gmail</div><div class="app-chip">Google Maps</div><div class="app-chip">Google Photos</div>
                    <div class="app-chip">Uber</div><div class="app-chip">Cash App</div><div class="app-chip">Venmo</div>
                    <div class="app-chip">Telegram</div><div class="app-chip">Discord</div><div class="app-chip">Zoom</div>
                </div>
                <h3 class="section-title">Platform Alternatives</h3>
                <div class="app-alternatives">${appAlternatives}</div>
                <div class="checklist" data-group="apps">
                    <label class="checklist-item"><input type="checkbox" data-key="apps-downloaded"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Downloaded all your important apps</strong><p>Open ${isAndroidToIphone ? 'the App Store' : 'Google Play'} and install daily apps.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="apps-signed-in"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Signed in to all your apps</strong><p>Log in with your email/password for each app.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="apps-whatsapp"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Transfer WhatsApp chats (if applicable)</strong><p>WhatsApp > Settings > Chats > Transfer chats.</p></div></label>
                </div>
                ${buildTroubleshootHTML('apps')}
            </div>
        `);

        // Step 5: Final Checks
        steps.push(`
            <div class="step-card">
                <div class="step-icon-large">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="20" stroke="url(#fGrad)" stroke-width="2.5"/>
                        <path d="M15 24l6 6 12-12" stroke="url(#fGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        <defs><linearGradient id="fGrad" x1="4" y1="4" x2="44" y2="44"><stop stop-color="#34C759"/><stop offset="1" stop-color="#30D158"/></linearGradient></defs>
                    </svg>
                </div>
                <h2>Final Checks</h2>
                <p class="step-subtitle">Make sure everything made it to your new ${toLabel}.</p>
                <div class="checklist" data-group="final">
                    <label class="checklist-item"><input type="checkbox" data-key="final-contacts"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Contacts are all there</strong><p>Open Phone app and scroll through contacts.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="final-photos"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Photos and videos transferred</strong><p>Open Photos app and check your library.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="final-messages"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Messages are visible</strong><p>Open Messages and check text history.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="final-calls"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Phone calls work</strong><p>Make a test call to confirm${sameCarrier ? '' : ' on ' + toCarrier}.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="final-data"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Cellular data works</strong><p>Turn off Wi-Fi and try loading a webpage.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="final-email"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Email is set up</strong><p>Open email app and check messages load.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="final-2fa"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Two-factor auth apps moved</strong><p>Transfer 2FA accounts to new phone.</p></div></label>
                    <label class="checklist-item"><input type="checkbox" data-key="final-banking"><span class="checkbox-custom"></span><div class="checklist-content"><strong>Banking apps set up</strong><p>Download bank app and sign in.</p></div></label>
                </div>
                ${buildTroubleshootHTML('final')}
            </div>
        `);

        // Step 6: Done!
        steps.push(`
            <div class="step-card welcome-card done-card">
                <div class="step-icon-large">
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                        <circle cx="28" cy="28" r="26" fill="url(#dGrad)" opacity="0.1"/>
                        <circle cx="28" cy="28" r="22" stroke="url(#dGrad)" stroke-width="2.5"/>
                        <path d="M18 28l7 7 13-13" stroke="url(#dGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        <defs><linearGradient id="dGrad" x1="2" y1="2" x2="54" y2="54"><stop stop-color="#007AFF"/><stop offset="0.5" stop-color="#34C759"/><stop offset="1" stop-color="#5856D6"/></linearGradient></defs>
                    </svg>
                </div>
                <h2>You're All Set!</h2>
                <p class="step-subtitle">Your switch from ${fromLabel} to ${toLabel} is complete.</p>
                <div class="completion-summary" id="completionSummary">
                    <div class="summary-stat"><span class="stat-number" id="statChecked">0</span><span class="stat-label">Tasks Done</span></div>
                    <div class="summary-stat"><span class="stat-number" id="statTotal">0</span><span class="stat-label">Total Tasks</span></div>
                </div>
                <div class="tip-box" style="margin-top: 1.5rem;">
                    <div class="tip-icon-svg"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="3" stroke="#FF3B30" stroke-width="1.5"/><path d="M6 6l6 6M12 6l-6 6" stroke="#FF3B30" stroke-width="1.5" stroke-linecap="round"/></svg></div>
                    <p><strong>Don't forget:</strong> Factory reset your old phone to protect your personal data.</p>
                </div>
                <button class="btn btn-secondary" id="resetBtn">Start Over</button>
            </div>
        `);

        return steps;
    }

    // ---- Time Estimate ----
    function updateTimeEstimate() {
        const el = document.getElementById('timeEstimateText');
        const container = document.getElementById('timeEstimate');
        if (!el || !container) return;
        const total = allCheckboxes.length;
        const done = allCheckboxes.filter(cb => cb.checked).length;
        const remaining = total - done;
        const minutesPerTask = 2;
        const mins = remaining * minutesPerTask;
        if (remaining === 0) {
            el.textContent = 'All tasks complete!';
            container.classList.add('almost-done');
        } else if (mins <= 5) {
            el.textContent = `Almost done! ~${mins} min left`;
            container.classList.add('almost-done');
        } else {
            el.textContent = `Estimated time: ~${mins} min remaining`;
            container.classList.remove('almost-done');
        }
    }

    // ---- Milestone Celebrations ----
    function checkMilestones() {
        const total = allCheckboxes.length;
        const done = allCheckboxes.filter(cb => cb.checked).length;
        const percent = Math.round((done / total) * 100);

        [25, 50, 75].forEach(milestone => {
            if (percent >= milestone && !milestoneShown[milestone]) {
                milestoneShown[milestone] = true;
                showMilestone(milestone);
            }
        });
    }

    function showMilestone(percent) {
        playSound('milestone');
        const messages = { 25: 'Great start!', 50: 'Halfway there!', 75: 'Almost done!' };
        const overlay = document.createElement('div');
        overlay.className = 'milestone-overlay';
        overlay.innerHTML = `<div class="milestone-badge"><div class="milestone-percent">${percent}%</div><div class="milestone-text">${messages[percent]}</div></div>`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        // Spawn floating particles
        const symbols = ['*', '+', '~'];
        for (let i = 0; i < 6; i++) {
            const p = document.createElement('div');
            p.className = 'float-particle';
            p.textContent = symbols[i % symbols.length];
            p.style.left = (30 + Math.random() * 40) + '%';
            p.style.top = (40 + Math.random() * 20) + '%';
            p.style.animationDelay = (i * 0.1) + 's';
            p.style.color = ['#007AFF', '#34C759', '#FF9500', '#5856D6', '#FF2D55', '#5AC8FA'][i];
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 1500);
        }

        setTimeout(() => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }, 1800);
    }

    // ---- Navigation ----
    function goNext() { if (currentStep < totalSteps - 1) { playSound('navigate'); goToStep(currentStep + 1); } }
    function goBack() { if (currentStep > 0) { playSound('navigate'); goToStep(currentStep - 1); } }

    function goToStep(step) {
        if (step < 0 || step >= totalSteps) return;
        currentStep = step;
        updateUI();
        saveCurrentStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (step === totalSteps - 1) {
            updateCompletionSummary();
            setTimeout(startConfetti, 400);
        } else { stopConfetti(); }
    }

    // ---- UI Updates ----
    const stepLabels = ['Getting Started', 'Preparation', 'Data Transfer', 'Carrier Switch', 'App Setup', 'Final Checks', 'Complete'];

    function updateUI() {
        const track = document.getElementById('stepsTrack');
        track.style.transform = `translateX(-${currentStep * 100}%)`;
        document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i === currentStep));
        document.querySelectorAll('.step-dot').forEach((dot, i) => {
            dot.classList.remove('active', 'completed');
            if (i === currentStep) dot.classList.add('active');
            else if (i < currentStep) dot.classList.add('completed');
        });
        backBtn.disabled = currentStep === 0;
        nextBtn.style.display = currentStep === totalSteps - 1 ? 'none' : 'flex';

        // Pulse the next button when all checkboxes in current step are checked
        const currentStepEl = document.querySelector(`.step[data-step="${currentStep}"]`);
        if (currentStepEl) {
            const stepCBs = currentStepEl.querySelectorAll('input[type="checkbox"]');
            const allChecked = stepCBs.length > 0 && Array.from(stepCBs).every(cb => cb.checked);
            nextBtn.classList.toggle('pulse', allChecked);
        } else {
            nextBtn.classList.remove('pulse');
        }

        updateProgressBar();
        const progressLabel = document.getElementById('progressLabel');
        progressLabel.textContent = stepLabels[Math.min(currentStep, stepLabels.length - 1)] || `Step ${currentStep + 1}`;
    }

    function updateProgressBar() {
        const totalCheckboxes = allCheckboxes.length;
        const checkedCount = allCheckboxes.filter(cb => cb.checked).length;
        const stepProgress = currentStep / (totalSteps - 1);
        const checkProgress = totalCheckboxes > 0 ? checkedCount / totalCheckboxes : 0;
        const overall = Math.round((stepProgress * 0.4 + checkProgress * 0.6) * 100);
        document.getElementById('progressFill').style.width = `${overall}%`;
        document.getElementById('progressPercent').textContent = `${overall}%`;

        // Update completion ring
        const ring = document.getElementById('completionRingFill');
        const ringLabel = document.getElementById('ringPercent');
        if (ring && ringLabel) {
            const circumference = 2 * Math.PI * 52; // r=52
            const offset = circumference - (overall / 100) * circumference;
            ring.style.strokeDashoffset = offset;
            ringLabel.textContent = `${overall}%`;
        }
    }

    function updateCompletionSummary() {
        const checked = allCheckboxes.filter(cb => cb.checked).length;
        const el1 = document.getElementById('statChecked');
        const el2 = document.getElementById('statTotal');
        if (el1) el1.textContent = checked;
        if (el2) el2.textContent = allCheckboxes.length;
    }

    // ---- Persistence ----
    const STORAGE_KEY = 'phonetransfer_progress';
    const STEP_KEY = 'phonetransfer_step';

    function saveProgress() {
        const data = {};
        allCheckboxes.forEach(cb => { data[cb.dataset.key] = cb.checked; });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { }
    }

    function loadProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                allCheckboxes.forEach(cb => { if (data[cb.dataset.key]) cb.checked = true; });
                // Restore milestone state
                const total = allCheckboxes.length;
                const done = allCheckboxes.filter(cb => cb.checked).length;
                const percent = Math.round((done / total) * 100);
                [25, 50, 75].forEach(m => { if (percent >= m) milestoneShown[m] = true; });
            }
            const savedStep = localStorage.getItem(STEP_KEY);
            if (savedStep !== null) currentStep = parseInt(savedStep) || 0;
        } catch (e) { }
    }

    function saveCurrentStep() {
        try { localStorage.setItem(STEP_KEY, currentStep.toString()); } catch (e) { }
    }

    function resetAll() {
        allCheckboxes.forEach(cb => { cb.checked = false; });
        milestoneShown = { 25: false, 50: false, 75: false };
        try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STEP_KEY); localStorage.removeItem('phonetransfer_config'); } catch (e) { }
        setupScreen.classList.remove('hidden');
        wizardScreen.classList.add('hidden');
        stepNav.classList.add('hidden');
        currentStep = 0;
        document.querySelectorAll('.direction-option, .carrier-option').forEach(el => el.classList.remove('selected'));
        config = { direction: null, fromCarrier: null, toCarrier: null };
        beginBtn.disabled = true;
        stopConfetti();
    }

    // ---- Confetti ----
    let confettiAnimId = null;
    let confettiParticles = [];

    function startConfetti() {
        confettiCanvas.classList.add('active');
        const ctx = confettiCanvas.getContext('2d');
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        confettiParticles = [];
        const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#AF52DE', '#FF2D55', '#5AC8FA'];
        for (let i = 0; i < 120; i++) {
            confettiParticles.push({
                x: Math.random() * confettiCanvas.width,
                y: Math.random() * confettiCanvas.height - confettiCanvas.height,
                w: Math.random() * 10 + 5, h: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2,
                rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 12,
                opacity: 1
            });
        }
        playSound('milestone');
        function animate() {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            let alive = false;
            confettiParticles.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.rotation += p.rotationSpeed;
                p.vy += 0.05; p.vx *= 0.99;
                if (p.y > confettiCanvas.height * 0.7) p.opacity -= 0.01;
                if (p.opacity > 0 && p.y < confettiCanvas.height + 20) {
                    alive = true;
                    ctx.save(); ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.globalAlpha = Math.max(0, p.opacity);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                }
            });
            if (alive) confettiAnimId = requestAnimationFrame(animate);
            else stopConfetti();
        }
        animate();
    }

    function stopConfetti() {
        if (confettiAnimId) { cancelAnimationFrame(confettiAnimId); confettiAnimId = null; }
        confettiCanvas.classList.remove('active');
        const ctx = confettiCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }

    window.addEventListener('resize', () => {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    });

    // ---- Init ----
    document.addEventListener('DOMContentLoaded', initFlow);
})();
