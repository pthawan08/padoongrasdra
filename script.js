/* --- ตัวแปรและการตั้งค่า --- */
let currentStep = 1;
let photos = [];
let stream = null;
let currentLayout = 'strip3';
let shotsNeeded = 3;

const layouts = {
    'strip2': { count: 2, class: 'grid-strip2' },
    'strip3': { count: 3, class: 'grid-strip3' },
    'strip4': { count: 4, class: 'grid-strip4' },
    'grid2x2': { count: 4, class: 'grid-2x2' }
};

const blessings = {
    black: "新年快乐，恭喜发财！สวัดีปีใหม่  ขอให้ร่ำรวย",
    white: "学业进步，马到成功！การเรียนก้าวหน้าและประสบความสำเร็จ",
    gold: "新年快乐，万事如意！สวัสดีปีใหม่  สมปรารถนาทุกประการ",
    red: "顺顺利利，好运连连！ทุกอย่างราบรื่นและโชคดีตลอดทั้งปี"
};

/* --- Main Functions --- */
window.selectLayout = function(type) {
    currentLayout = type;
    shotsNeeded = layouts[type].count;
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
        startCountdownSequence();
    } catch (e) { 
        alert("ขออภัย ไม่สามารถเปิดกล้องได้"); 
        location.reload();
    }
}

async function startCountdownSequence() {
    photos = [];
    const statusText = document.getElementById('status-text');
    const countdownEl = document.getElementById('countdown');

    for (let i = 1; i <= shotsNeeded; i++) {
        statusText.innerText = `รูปที่ ${i} / ${shotsNeeded}`;
        await new Promise(resolve => {
            let c = 3;
            countdownEl.innerText = c;
            countdownEl.style.display = 'block';
            const timer = setInterval(() => {
                c--;
                if(c > 0) countdownEl.innerText = c;
                else { clearInterval(timer); countdownEl.innerText = "📸"; resolve(); }
            }, 1000);
        });
        capture();
        countdownEl.style.display = 'none';
        if (i < shotsNeeded) await new Promise(r => setTimeout(r, 800));
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
    ctx.translate(cvs.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cvs.width, cvs.height);
    photos.push(cvs.toDataURL('image/png'));
}

function setupPreview() {
    const grid = document.getElementById('photo-grid');
    grid.className = 'photo-grid ' + layouts[currentLayout].class; 
    grid.innerHTML = '';
    photos.forEach(imgSrc => {
        const div = document.createElement('div');
        div.className = 'photo-slot';
        div.style.backgroundImage = `url(${imgSrc})`; 
        grid.appendChild(div);
    });
    window.applyFrame('red');
}

// 🔥 ฟังก์ชันนี้แก้ใหม่ ล้าง Gradient ทิ้งให้เกลี้ยง 🔥
window.applyFrame = function(color) {
    const container = document.getElementById('preview-container');
    const textDiv = document.getElementById('final-blessing');
    
    // 1. ล้างค่าพื้นหลังเก่าทิ้งให้หมดก่อน (สำคัญ!)
    container.style.background = 'none'; 
    container.style.backgroundImage = 'none';
    container.style.backgroundColor = 'transparent';

    // 2. ใส่สีใหม่
    if(color === 'red') {
        container.style.backgroundImage = 'linear-gradient(135deg, #D90000 0%, #8A0000 100%)';
        container.style.borderColor = '#FFD700'; 
        textDiv.style.color = '#FFD700';
    } 
    else if(color === 'gold') {
        container.style.backgroundImage = 'linear-gradient(135deg, #FFD700 0%, #DAA520 100%)';
        container.style.borderColor = '#D90000';
        textDiv.style.color = '#8A0000';
    } 
    else if(color === 'black') {
        container.style.backgroundColor = '#1a1a1a'; // สีดำล้วน
        container.style.borderColor = '#FFD700';
        textDiv.style.color = '#FFD700';
    } 
    else if(color === 'white') {
        container.style.backgroundColor = '#ffffff'; // สีขาวล้วน
        container.style.borderColor = '#D90000';
        textDiv.style.color = '#D90000';
    }
    
    textDiv.innerText = blessings[color];
}

window.uploadAndGenerate = function() {
    const btn = document.getElementById('save-btn');
    const originalText = btn.innerText;
    btn.innerText = "กำลังสร้างรูป... ⏳";
    btn.disabled = true;

    const element = document.getElementById('preview-container');
    
    html2canvas(element, { scale: 3, useCORS: true }).then(canvas => {
        canvas.toBlob(async (blob) => {
            if (!blob) { alert("Error generating image"); btn.disabled = false; return; }
            try {
                const res = await fetch(`/api/upload?filename=cny-${Date.now()}.png`, {
                    method: 'POST', body: blob
                });
                if(!res.ok) throw new Error('Upload Failed');
                const data = await res.json();
                showResult(data.url);
            } catch (err) {
                alert("Upload failed: " + err.message);
                btn.innerText = "ลองใหม่";
                btn.disabled = false;
            }
        }, 'image/png', 0.95);
    });
}

function showResult(url) {
    switchStep(4);
    document.getElementById('final-image-show').innerHTML = `<img src="${url}" alt="Result">`;
    const link = document.getElementById('download-link');
    link.href = url;
    link.download = `cny-${Date.now()}.png`;

    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: url, width: 160, height: 160,
        colorDark : "#D90000", colorLight : "#ffffff",
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
