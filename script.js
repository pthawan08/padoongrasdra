/* --- ตัวแปรและการตั้งค่า --- */
let currentStep = 1;
let photos = [];
let stream = null;
let currentLayout = 'strip3'; // ค่าเริ่มต้น
let shotsNeeded = 3; // ค่าเริ่มต้น

// การตั้งค่า Layout (จำนวนรูป และชื่อ Class CSS)
const layouts = {
    'strip2': { count: 2, class: 'grid-strip2' },
    'strip3': { count: 3, class: 'grid-strip3' },
    'strip4': { count: 4, class: 'grid-strip4' },
    'grid2x2': { count: 4, class: 'grid-2x2' }
};

// คำอวยพรตามสี
const blessings = {
    black: "🖤 อำนาจ บารมี มั่นคงดั่งภูผา",
    white: "🤍 จิตใจผ่องใส พบเจอแต่กัลยาณมิตร",
    gold: "💛 มั่งคั่ง ร่ำรวย ทองกองเต็มบ้าน",
    red: "❤️ รักรุ่ง งานพุ่ง เฮงตลอดปี!"
};

/* --- 1. ส่วนการทำงานหลัก (Flow) --- */

// ฟังก์ชันเลือก Layout แล้วเริ่มกล้อง
function selectLayout(type) {
    currentLayout = type;
    shotsNeeded = layouts[type].count; // อัปเดตจำนวนรูปที่จะถ่าย
    startCamera();
}

// เปิดกล้อง
async function startCamera() {
    switchStep(2);
    try {
        // บังคับสัดส่วน 4:3 เพื่อคุณภาพที่ดีที่สุดสำหรับตู้สติกเกอร์
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", aspectRatio: 4/3 }, 
            audio: false 
        });
        document.getElementById('video').srcObject = stream;
        
        // เริ่มกระบวนการนับถอยหลังถ่ายรูป
        startCountdownSequence();
    } catch (e) { 
        alert("ไม่สามารถเปิดกล้องได้: " + e.message); 
        location.reload();
    }
}

// ลูปการนับถอยหลังและถ่ายรูปตามจำนวนที่ตั้งไว้
async function startCountdownSequence() {
    photos = []; // เคลียร์รูปเก่า
    const statusText = document.getElementById('status-text');
    const countdownEl = document.getElementById('countdown');

    for (let i = 1; i <= shotsNeeded; i++) {
        statusText.innerText = `รูปที่ ${i} / ${shotsNeeded}`;
        
        // นับถอยหลัง 3..2..1
        await new Promise(resolve => {
            let c = 3;
            countdownEl.innerText = c;
            countdownEl.style.display = 'block';
            
            const timer = setInterval(() => {
                c--;
                if(c > 0) {
                    countdownEl.innerText = c;
                } else {
                    clearInterval(timer);
                    countdownEl.innerText = "📸"; // แชะ!
                    resolve();
                }
            }, 1000);
        });

        // ถ่ายรูป
        capture();
        
        // ซ่อนตัวนับเพื่อโชว์ผลแวบๆ
        countdownEl.style.display = 'none';
        
        // พักแป๊บนึงก่อนถ่ายรูปต่อไป (0.8 วินาที)
        if (i < shotsNeeded) {
            await new Promise(r => setTimeout(r, 800));
        }
    }
    
    // จบการถ่าย ปิดกล้อง
    if(stream) stream.getTracks().forEach(t => t.stop());
    setupPreview();
    switchStep(3);
}

// ฟังก์ชันจับภาพจากวิดีโอ
function capture() {
    const video = document.getElementById('video');
    const cvs = document.createElement('canvas');
    // ตั้งขนาด Canvas ตามขนาดจริงของวิดีโอ
    cvs.width = video.videoWidth; 
    cvs.height = video.videoHeight;
    const ctx = cvs.getContext('2d');
    
    // กลับด้านกระจก (Mirror)
    ctx.translate(cvs.width, 0); 
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cvs.width, cvs.height);
    
    // เก็บรูปเป็น Base64
    photos.push(cvs.toDataURL('image/png'));
}

/* --- 2. ส่วนการแต่งรูป (Preview & Edit) --- */

// เตรียมหน้า Preview
function setupPreview() {
    const grid = document.getElementById('photo-grid');
    // ล้าง class เก่าออก แล้วใส่ class ใหม่ตาม layout ที่เลือก
    grid.className = 'photo-grid ' + layouts[currentLayout].class; 
    grid.innerHTML = '';
    
    photos.forEach(imgSrc => {
        const div = document.createElement('div');
        div.className =
