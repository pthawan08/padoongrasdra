let currentStep = 1;
let photos = [];
let stream = null;
let currentLayout = 'strip3';
let shotsNeeded = 3;

// เพิ่ม config สำหรับ strip2
const layouts = {
    'strip2': { count: 2, class: 'grid-strip2' },
    'strip3': { count: 3, class: 'grid-strip3' },
    'strip4': { count: 4, class: 'grid-strip4' },
    'grid2x2': { count: 4, class: 'grid-2x2' }
};

const blessings = {
    black: "🖤 อำนาจ บารมี มั่นคงดั่งภูผา",
    white: "🤍 จิตใจผ่องใส พบเจอแต่กัลยาณมิตร",
    gold: "💛 มั่งคั่ง ร่ำรวย ทองกองเต็มบ้าน",
    red: "❤️ รักรุ่ง งานพุ่ง เฮงตลอดปี!"
};

// 1. เลือก Layout
function selectLayout(type) {
    currentLayout = type;
    shotsNeeded = layouts[type].count; // อัปเดตจำนวนรูปที่จะถ่าย
    startCamera();
}

async function startCamera() {
    switchStep(2);
    try {
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

// 2. ถ่ายรูป
async function startCountdown() {
    photos = [];
    const statusText = document.getElementById('status-text');
    const countdownEl = document.getElementById('countdown');

    for (let i = 1; i <= shotsNeeded; i++) {
        statusText.innerText = `รูปที่ ${i} / ${shotsNeeded}`;
        
        // นับถอยหลัง
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
                    countdownEl.innerText = "📸";
                    resolve();
                }
            }, 1000);
        });

        capture();
        
        // ซ่อนตัวนับเพื่อโชว์ผล
        countdownEl.style.display = 'none';
        await new Promise(r => setTimeout(r, 600)); // พักแป๊บนึง
    }
    
    if(stream) stream.getTracks().forEach(t => t.stop());
    setupPreview();
    switchStep(3);
}

function capture() {
    const video = document.getElementById('video');
    const cvs = document.createElement('canvas');
    cvs.width = video.videoWidth; 
    cvs.height = video.videoHeight;
    const ctx = cvs.getContext('2d');
    
    // กลับด้านกระจก
    ctx.translate(cvs.width, 0); 
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cvs.width, cvs.height);
    
    photos.push(cvs.toDataURL('image/png'));
}

// 3. จัด Layout
function setupPreview() {
    const grid = document.getElementById('photo-grid');
    // ล้าง class เก่าออก แล้วใส่ class ใหม่ตาม layout ที่เลือก
    grid.className = 'photo-grid ' + layouts[currentLayout].class; 
    grid.innerHTML = '';
    
    photos.forEach(imgSrc => {
        const div = document.createElement('div');
        div.className = 'photo-slot';
        div.style.backgroundImage = `url(${imgSrc})`; 
        grid.appendChild(div);
    });
    
    applyFrame('red');
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

// 4. บันทึกและสร้าง QR
function uploadAndGenerate() {
    const btn = document.getElementById('save-btn');
    const originalText = btn.innerText;
    btn.innerText = "กำลังสร้างรูป... ⏳";
    btn.disabled = true;

    const element = document.getElementById('preview-container');
    
    html2canvas(element, { scale: 3, useCORS: true }).then(canvas => {
        canvas.toBlob(async (blob) => {
            try {
                const res = await fetch(`/api/upload?filename=cny-${Date.now()}.png`, {
                    method: 'POST', body: blob
                });
                
                if(!res.ok) throw new Error('Upload Failed');
                const data = await res.json();
                
                showResult(data.url);
            } catch (err) {
                alert("เกิดข้อผิดพลาด: " + err.message);
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }, 'image/png', 0.9);
    });
}

function showResult(url) {
    switchStep(4);
    
    // แสดงรูป
    const div = document.getElementById('final-image-show');
    div.innerHTML = `<img src="${url}" alt="Result Photo">`;
    
    // ปุ่มโหลด
    const link = document.getElementById('download-link');
    link.href = url;
    link.download = `cny-booth-${Date.now()}.png`;

    // QR Code
    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: url,
        width: 160,
        height: 160,
        colorDark : "#D72638",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
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
