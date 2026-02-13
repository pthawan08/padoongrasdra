let currentStep = 1;
let photos = [];
let stream = null;
let currentLayout = 'strip3'; // ค่าเริ่มต้น
let shotsNeeded = 3;

const layouts = {
    'strip3': { count: 3, class: 'grid-strip3' },
    'strip4': { count: 4, class: 'grid-strip4' },
    'grid2x2': { count: 4, class: 'grid-2x2' },
    'grid3x3': { count: 9, class: 'grid-3x3' }
};

const blessings = {
    black: "🖤 อำนาจ บารมี มั่นคงดั่งภูผา",
    white: "🤍 จิตใจผ่องใส พบเจอแต่กัลยาณมิตร",
    gold: "💛 มั่งคั่ง ร่ำรวย ทองกองเต็มบ้าน",
    red: "❤️ รักรุ่ง งานพุ่ง เฮงตลอดปี!"
};

// 1. เลือก Layout และเริ่มกล้อง
function selectLayout(type) {
    currentLayout = type;
    shotsNeeded = layouts[type].count;
    startCamera();
}

async function startCamera() {
    switchStep(2);
    try {
        // บังคับสัดส่วน 4:3 เพื่อคุณภาพที่ดีที่สุด
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", aspectRatio: 4/3 }, 
            audio: false 
        });
        document.getElementById('video').srcObject = stream;
        startCountdown();
    } catch (e) { 
        alert("ไม่สามารถเปิดกล้องได้: " + e.message); 
        location.reload();
    }
}

// 2. นับถอยหลังและถ่ายรูป
async function startCountdown() {
    photos = [];
    for (let i = 1; i <= shotsNeeded; i++) {
        document.getElementById('status-text').innerText = `รูปที่ ${i} / ${shotsNeeded}`;
        
        await new Promise(resolve => {
            let c = 3;
            const el = document.getElementById('countdown');
            el.innerText = c;
            el.style.display = 'block';
            
            const timer = setInterval(() => {
                c--;
                if(c > 0) {
                    el.innerText = c;
                } else {
                    clearInterval(timer);
                    el.innerText = "📸";
                    resolve();
                }
            }, 1000);
        });

        capture();
        
        // แสดงผลแวบๆ ว่าถ่ายแล้ว
        document.getElementById('countdown').style.display = 'none';
        await new Promise(r => setTimeout(r, 500)); // พัก 0.5 วิ
    }
    
    // จบการถ่าย
    if(stream) stream.getTracks().forEach(t => t.stop());
    setupPreview();
    switchStep(3);
}

function capture() {
    const video = document.getElementById('video');
    const cvs = document.createElement('canvas');
    // ตั้งขนาด Canvas ตามขนาดจริงของวิดีโอเพื่อความชัด
    cvs.width = video.videoWidth; 
    cvs.height = video.videoHeight;
    const ctx = cvs.getContext('2d');
    
    // กลับด้านรูป (Mirror)
    ctx.translate(cvs.width, 0); 
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cvs.width, cvs.height);
    
    photos.push(cvs.toDataURL('image/png'));
}

// 3. จัดเรียงรูปตาม Layout
function setupPreview() {
    const grid = document.getElementById('photo-grid');
    grid.className = 'photo-grid ' + layouts[currentLayout].class; // ใส่ Class เพื่อจัด Layout
    grid.innerHTML = '';
    
    photos.forEach(imgSrc => {
        const div = document.createElement('div');
        div.className = 'photo-slot';
        // ใช้ background-image แทน img tag เพื่อแก้ปัญหา Distortion
        div.style.backgroundImage = `url(${imgSrc})`; 
        grid.appendChild(div);
    });
    
    applyFrame('red'); // สีเริ่มต้น
}

function applyFrame(color) {
    const container = document.getElementById('preview-container');
    const textDiv = document.getElementById('final-blessing');
    const display = document.getElementById('blessing-display');
    
    let bg = '#D72638', text = '#fff';
    if(color === 'black') { bg='#1a1a1a'; text='#fff'; }
    if(color === 'white') { bg='#ffffff'; text='#000'; }
    if(color === 'gold') { bg='#F4D35E'; text='#000'; }
    
    container.style.backgroundColor = bg;
    textDiv.style.color = text;
    textDiv.innerText = blessings[color];
    display.innerText = blessings[color];
}

// 4. สร้างรูปและอัปโหลด
function uploadAndGenerate() {
    const btn = document.getElementById('save-btn');
    btn.innerText = "กำลังสร้างรูป... ⏳";
    btn.disabled = true;

    const element = document.getElementById('preview-container');
    
    // scale: 3 เพื่อความคมชัดสูงสุด
    html2canvas(element, { scale: 3, useCORS: true }).then(canvas => {
        canvas.toBlob(async (blob) => {
            try {
                // ส่งไปที่ API
                const res = await fetch(`/api/upload?filename=cny-${Date.now()}.png`, {
                    method: 'POST', body: blob
                });
                
                if(!res.ok) throw new Error('Upload Failed');
                
                const data = await res.json();
                
                showResult(data.url);
            } catch (err) {
                alert("เกิดข้อผิดพลาด: " + err.message);
                btn.innerText = "ลองใหม่";
                btn.disabled = false;
            }
        }, 'image/png', 0.9); // คุณภาพ JPEG 90%
    });
}

function showResult(url) {
    switchStep(4);
    
    // แสดงรูป
    const div = document.getElementById('final-image-show');
    div.innerHTML = `<img src="${url}" alt="Result Photo">`;
    
    // ปุ่มดาวน์โหลด
    const link = document.getElementById('download-link');
    link.href = url;
    link.download = `cny-booth-${Date.now()}.png`;

    // QR Code (URL ตรงๆ ของรูปเลย)
    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: url, // <-- ใส่ URL ของรูปโดยตรง สแกนปุ๊บเปิดรูปปั๊บ
        width: 180,
        height: 180,
        colorDark : "#D72638", // QR สีแดงสวยๆ
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

function switchStep(id) {
    document.querySelectorAll('section').forEach(s => {
        s.classList.add('hidden'); s.classList.remove('active');
    });
    if(id===1) document.getElementById('step-welcome').classList.add('active');
    if(id===2) document.getElementById('step-camera').classList.add('active');
    if(id===3) document.getElementById('step-edit').classList.add('active');
    if(id===4) document.getElementById('step-result').classList.add('active');
}
