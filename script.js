// ==========================================
// TREES APP - MAIN LOGIC SCRIPT
// ==========================================

// 1. Firebase Configuration (আপনার দেওয়া কনফিগারেশন)
const firebaseConfig = {
    apiKey: "AIzaSyC1eNeuHbJbBCGxkMnpPEGJqNgtqFzTFuw",
    authDomain: "earnings-by-boshir.firebaseapp.com",
    databaseURL: "https://earnings-by-boshir-default-rtdb.firebaseio.com",
    projectId: "earnings-by-boshir",
    storageBucket: "earnings-by-boshir.firebasestorage.app",
    messagingSenderId: "376974811547",
    appId: "1:376974811547:web:13d7b928108c59b068013e",
    measurementId: "G-GL6N1EK5NC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 2. App Variables & Constants
const tg = window.Telegram.WebApp;
tg.expand(); // টেলিগ্রামে অ্যাপটি ফুল স্ক্রিন হবে

// আপনার লিংকসমূহ
const TG_CHANNEL_LINK = "https://t.me/freeerningbyboshir";
// IMPORTANT: Monetag ডাইরেক্ট লিংকটি নিচে বসান (Special Task এর জন্য)
const MONETAG_DIRECT_LINK = "https://monetag.com"; // <-- এখানে আপনার আসল ডাইরেক্ট লিংক দিন

let userId = "browser_test_user"; // ব্রাউজারে টেস্ট করার জন্য ডিফল্ট আইডি
let userData = {
    balance: 0,
    energy: 1000,
    maxEnergy: 1000,
    videoTaskCount: 15,
    lastVideoReset: Date.now(),
    referrals: 0,
    joinedTg: false,
    name: "User"
};

// 3. Initialization Function (অ্যাপ চালু হলে যা হবে)
async function initApp() {
    // টেলিগ্রাম থেকে ইউজার আইডি নেওয়া
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userId = tg.initDataUnsafe.user.id.toString();
        userData.name = tg.initDataUnsafe.user.first_name;
    }
    document.getElementById('username').innerText = userData.name;

    // রেফারেল চেক করা
    const startParam = tg.initDataUnsafe.start_param;

    // ডাটাবেস থেকে ইউজারের তথ্য আনা
    const userRef = db.ref('users/' + userId);
    userRef.on('value', async (snapshot) => {
        if (snapshot.exists()) {
            // পুরাতন ইউজার হলে ডাটা আপডেট করো
            const data = snapshot.val();
            // সেফটি চেক: যদি কোনো ডাটা মিসিং থাকে
            userData.balance = data.balance || 0;
            userData.energy = data.energy !== undefined ? data.energy : 1000;
            userData.videoTaskCount = data.videoTaskCount !== undefined ? data.videoTaskCount : 15;
            userData.referrals = data.referrals || 0;
            userData.joinedTg = data.joinedTg || false;
            userData.lastVideoReset = data.lastVideoReset || Date.now();
            updateUI();
        } else {
            // নতুন ইউজার রেজিস্ট্রেশন
            if (startParam && startParam !== userId) {
                // রেফারকারীকে বোনাস দাও (200 কয়েন)
                const referrerRef = db.ref('users/' + startParam);
                referrerRef.once('value', s => {
                    if (s.exists()) {
                        let rData = s.val();
                        rData.balance = (rData.balance || 0) + 200;
                        rData.referrals = (rData.referrals || 0) + 1;
                        referrerRef.update({
                            balance: rData.balance,
                            referrals: rData.referrals
                        });
                    }
                });
            }
            // নতুন ইউজারকে সেভ করো
            userData.referralId = userId;
            await userRef.set(userData);
            updateUI();
        }
    });

    // আইপি এড্রেস বের করা (IP Fetch)
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        document.getElementById('ip-address').innerText = "IP: " + data.ip;
        db.ref('users/' + userId).update({ ip: data.ip });
    } catch (e) {
        console.log("IP fetch failed");
        document.getElementById('ip-address').innerText = "IP: Could not fetch";
    }

    // ব্যাকগ্রাউন্ড লুপ (এনার্জি রিফিল এবং ভিডিও টাস্ক রিসেট)
    setInterval(() => {
        // এনার্জি রিফিল: প্রতি মিনিটে ১০ করে
        if (userData.energy < userData.maxEnergy) {
            userData.energy = Math.min(userData.maxEnergy, userData.energy + 10);
            // ডাটাবেসে আপডেট (ব্যান্ডউইথ বাঁচাতে শুধু এনার্জি)
            db.ref('users/' + userId + '/energy').set(userData.energy);
            updateUI();
        }
        
        // ভিডিও টাস্ক রিসেট: প্রতি ৪ ঘণ্টায়
        const now = Date.now();
        if (now - userData.lastVideoReset > 4 * 60 * 60 * 1000) {
            userData.videoTaskCount = 15;
            userData.lastVideoReset = now;
            db.ref('users/' + userId).update({ 
                videoTaskCount: 15,
                lastVideoReset: now 
            });
            updateUI();
        }
    }, 60000); // প্রতি ৬০ সেকেন্ডে (১ মিনিট) চলবে
}

// 4. UI আপডেট ফাংশন (স্ক্রিনে তথ্য দেখানো)
function updateUI() {
    // ব্যালেন্স এনিমেশন
    const balanceEl = document.getElementById('balance');
    const currentBalance = parseInt(balanceEl.innerText);
    if (currentBalance !== userData.balance) {
        animateValue(balanceEl, currentBalance, userData.balance, 500);
    }

    document.getElementById('energy-text').innerText = `${Math.floor(userData.energy)}/1000`;
    const energyPercentage = (userData.energy / 1000) * 100;
    document.getElementById('energy-fill').style.width = `${energyPercentage}%`;
    
    document.getElementById('video-count').innerText = userData.videoTaskCount;
    document.getElementById('ref-count').innerText = userData.referrals;
    
    const joinBtn = document.getElementById('join-tg-btn');
    if(userData.joinedTg) {
        joinBtn.innerText = "Completed ✓";
        joinBtn.disabled = true;
        joinBtn.style.background = "#444";
    }
}

// ব্যালেন্স বাড়ার সুন্দর এনিমেশন
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerText = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// 5. নেভিগেশন (পেজ পরিবর্তন)
function switchPage(pageId, element) {
    // সব পেজ লুকানো
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // সিলেক্ট করা পেজ দেখানো
    document.getElementById(pageId).classList.add('active');
    
    // নেভিগেশন আইকন আপডেট
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    element.classList.add('active');

    // হ্যাপটিক ফিডব্যাক (টেলিগ্রামে ভাইব্রেশন হবে)
    if(tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

// 6. হোম পেজ: ট্যাপ লজিক
let tapDebounce;
document.getElementById('tap-tree').addEventListener('click', (e) => {
    if (userData.energy >= 1) {
        // হ্যাপটিক ফিডব্যাক
        if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

        // লজিক আপডেট
        userData.balance += 1;
        userData.energy -= 1;
        
        // UI তে ট্যাপ এনিমেশন (+1 দেখানো)
        const tapText = document.createElement('div');
        tapText.innerText = "+1";
        tapText.className = 'tap-effect';
        // যেখানে ক্লিক করেছে সেখানে দেখানো
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position within the element.
        const y = e.clientY - rect.top;  // y position within the element.
        tapText.style.left = `${e.clientX - 20}px`;
        tapText.style.top = `${e.clientY - 40}px`;
        document.body.appendChild(tapText);
        setTimeout(() => tapText.remove(), 1000);

        updateUI();

        // ডাটাবেসে সেভ (ব্যান্ডউইথ বাঁচাতে ডিবাউন্স ব্যবহার করা হয়েছে)
        clearTimeout(tapDebounce);
        tapDebounce = setTimeout(() => {
            db.ref('users/' + userId).update({ 
                balance: userData.balance,
                energy: userData.energy
            });
        }, 500); // প্রতি ৫০০ms পর পর সেভ হবে যদি ট্যাপ থামানো হয়
    }
});

// 7. টাস্ক লজিক

// লোডিং মডাল দেখানো
function showLoading(text, duration, callback) {
    const modal = document.getElementById('loading-modal');
    document.getElementById('loading-text').innerText = text;
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.display = 'none';
        if (callback) callback();
    }, duration);
}

// ভিডিও টাস্ক (Monetag SDK)
function startVideoTask() {
    if (userData.videoTaskCount > 0) {
        // Monetag SDK কল করা (এখানে placeholder দেওয়া হলো, আসল SDK কাজ করবে)
        // সাধারণ নিয়ম: SDK অ্যাড দেখাবে এবং অ্যাড শেষ হলে একটি ফাংশন কল করবে।
        // যেহেতু আমরা ক্লায়েন্ট সাইডে আছি, আমরা একটি টাইমার দিয়ে সিমুলেট করছি।
        
        if (typeof show_10518617 === 'function') {
             // আসল Monetag ফাংশন কল করার চেষ্টা
             try {
                 show_10518617().then(() => {
                    // অ্যাড দেখা শেষ হলে এই কোড রান হবে (যদি SDK সাপোর্ট করে)
                    completeVideoTask();
                 });
             } catch(e) {
                 // যদি SDK লোড না হয়, ম্যানুয়াল টাইমার
                 runManualVideoTimer();
             }
        } else {
             // SDK না পেলে ম্যানুয়াল টাইমার
             runManualVideoTimer();
        }
        
    } else {
        tg.showAlert("Daily limit reached! Come back later.");
    }
}

function runManualVideoTimer() {
    alert("Video loading... Please wait 15 seconds.");
    showLoading("Watching Ad...", 15000, () => {
        completeVideoTask();
    });
}

function completeVideoTask() {
    userData.balance += 20;
    userData.videoTaskCount -= 1;
    db.ref('users/' + userId).update({
        balance: userData.balance,
        videoTaskCount: userData.videoTaskCount
    });
    if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    tg.showAlert("You earned 20 coins!");
    updateUI();
}

// স্পেশাল টাস্ক (Direct Link)
function doSpecialTask() {
    window.open(MONETAG_DIRECT_LINK, "_blank");
    
    showLoading("Verifying Task Completion...", 12000, () => {
        // এখানে আমরা ধরে নিচ্ছি ইউজার টাস্ক কমপ্লিট করেছে
        userData.balance += 50;
        db.ref('users/' + userId).update({ balance: userData.balance });
        if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        tg.showAlert("Special task bonus: 50 coins added!");
        updateUI();
    });
}

// টেলিগ্রাম জয়েন টাস্ক
function joinTelegramTask() {
    if (userData.joinedTg) return;
    window.open(TG_CHANNEL_LINK, "_blank");
    showLoading("Checking Membership...", 8000, () => {
        userData.joinedTg = true;
        userData.balance += 50;
        db.ref('users/' + userId).update({ 
            joinedTg: true,
            balance: userData.balance
        });
        if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        updateUI();
    });
}

// রেফারেল লিংক কপি
function copyReferral() {
    // দ্রষ্টব্য: 'YOUR_BOT_NAME' এর জায়গায় আপনার আসল বটের ইউজারনেম দিতে হবে
    const link = `https://t.me/YOUR_BOT_USERNAME_HERE/trees?startapp=${userId}`;
    
    // টেলিগ্রামের নিজস্ব ক্লিপবোর্ড মেথড ব্যবহার করা ভালো
    if(tg.readTextFromClipboard) {
        navigator.clipboard.writeText(link).then(() => {
             tg.showAlert("Referral link copied! Share it to earn 200 coins per friend.");
        });
    } else {
        // ফেইলসেফ
        const textArea = document.createElement("textarea");
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("Copy");
        textArea.remove();
        alert("Link copied: " + link);
    }
}

// 8. গেমস লজিক (সহজ দুইটি গেম)
function openGame(type) {
    if (type === 'number') {
        // সংখ্যা অনুমান গেম
        const secret = Math.floor(Math.random() * 5) + 1;
        tg.showPrompt("Guess a number between 1 and 5:", (guess) => {
            if (guess && parseInt(guess) === secret) {
                userData.balance += 20;
                db.ref('users/' + userId).update({ balance: userData.balance });
                tg.HapticFeedback.notificationOccurred('success');
                tg.showAlert(`Correct! The number was ${secret}. You won 20 coins!`);
            } else if (guess) {
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert(`Wrong! The number was ${secret}. Try again.`);
            }
            updateUI();
        });
    } else if (type === 'color') {
        // কালার ম্যাচ গেম
        const colors = ['Red', 'Blue', 'Green'];
        const target = colors[Math.floor(Math.random() * colors.length)];
        tg.showPrompt(`Quickly type the color: ${target}`, (pick) => {
            if (pick && pick.toLowerCase() === target.toLowerCase()) {
                 userData.balance += 20;
                 db.ref('users/' + userId).update({ balance: userData.balance });
                 tg.HapticFeedback.notificationOccurred('success');
                 tg.showAlert("Correct! You won 20 coins.");
            } else if (pick) {
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert("Wrong color or too slow!");
            }
            updateUI();
        });
    }
}

// 9. উইথড্র লজিক
function submitWithdraw() {
    const uidInput = document.getElementById('binance-uid');
    const uid = uidInput.value;
    const msg = document.getElementById('withdraw-msg');

    if (uid.length < 5) {
        msg.innerText = "❌ Please enter a valid Binance UID.";
        msg.style.color = "red";
        if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    
    if (userData.balance < 1000) { // মিনিমাম উইথড্র লিমিট (উদাহরণস্বরূপ ১০০০)
         msg.innerText = "❌ Minimum withdraw is 1000 coins.";
         msg.style.color = "orange";
         return;
    }
    
    // ডাটাবেসে উইথড্র রিকোয়েস্ট সেভ করা
    db.ref('withdrawals/' + userId).push({
        uid: uid,
        amount: userData.balance,
        time: Date.now(),
        status: 'pending'
    });
    
    // ইউজার ডাটা আপডেট
    db.ref('users/' + userId).update({ 
        binanceUID: uid,
        balance: 0 // ব্যালেন্স কেটে নেওয়া হলো
    });

    userData.balance = 0;
    updateUI();
    uidInput.value = "";
    msg.innerText = "✅ Withdrawal request sent successfully!";
    msg.style.color = "var(--primary)";
    if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

// অ্যাপ চালু করো
initApp();
