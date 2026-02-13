let currentStep = 1;
let photos = [];
let stream = null;
const totalShots = 3;

const blessings = {
    black: "🖤 อำนาจ บารมี มั่นคงดั่งขุนเขา",
    white: "🤍 สงบ สว่าง พบเจอแต่มิตรแท้",
    gold: "💛 มั่งคั่ง ร่ำรวย เงินทองไหลมาเทมา",
    red: "❤️ เฮงๆ ปังๆ รักรุ่ง งานพุ่งแรง!"
};

// 1. จัดการกล้อง
async function startCamera() {
    switchStep(2);
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        document.getElementById('video').srcObject = stream;
        startCountdown();
    } catch (e) { alert("กรุณาอนุญาตให้ใช้กล้อง"); }
}

async function startCountdown() {
    photos = [];
    for (let i = 1; i <= totalShots; i++) {
        document.getElementById('status-text').innerText = `ช็อตที่ ${i} / ${totalShots}`;
        await new Promise(r => {
            let c = 3;
            const el = document.getElementById('countdown');
            el.innerText = c;
            const timer = setInterval(() => {
                c--;
                if(c>0) el.innerText = c;
                else { clearInterval(timer); el.innerText = "📸"; r(); }
            }, 1000);
        });
        capture();
        await new Promise(r => setTimeout(r, 800)); // พักแป๊บนึง
    }
    stream.getTracks().forEach(t => t.stop());
    setupPreview();
    switchStep(3);
}

function capture() {
    const video = document.getElementById('video');
    const cvs = document.createElement('canvas');
    cvs.width = video.videoWidth; cvs.height = video.videoHeight;
    const ctx = cvs.getContext('2d');
    ctx.translate(cvs.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    photos.push(cvs.toDataURL('image/png'));
}

// 2. จัดการ Preview และเลือกสี
function setupPreview() {
    const grid = document.getElementById('photo-grid');
    grid.innerHTML = '';
    photos.forEach(img => {
        const div = document.createElement('div');
        div.className = 'photo-slot';
        div.style.backgroundImage = `url(${img})`;
        grid.appendChild(div);
    });
    applyFrame('red');
}

function applyFrame(color) {
    const container = document.getElementById('preview-container');
    const textDiv = document.getElementById('final-blessing');
    const display = document.getElementById('blessing-display');
    
    let bg = '#D72638', text = '#fff';
    if(color === 'black') { bg='#000'; text='#fff'; }
    if(color === 'white') { bg='#fff'; text='#000'; }
    if(color === 'gold') { bg='#F4D35E'; text='#000'; }
    
    container.style.backgroundColor = bg;
    textDiv.style.color = text;
    textDiv.innerText = blessings[color];
    display.innerText = blessings[color];
}

// 3. รวมรูป + อัปโหลดไป Vercel Blob
function uploadAndGenerate() {
    const btn = document.getElementById('save-btn');
    btn.innerText = "กำลังสร้างรูปและอัปโหลด... ⏳";
    btn.disabled = true;

    const element = document.getElementById('preview-container');
    
    html2canvas(element, { scale: 2 }).then(canvas => {
        canvas.toBlob(async (blob) => {
            try {
                // ส่งไปที่ API ของเรา
                const res = await fetch(`/api/upload?filename=cny-${Date.now()}.png`, {
                    method: 'POST', body: blob
                });
                if(!res.ok) throw new Error('Upload Failed');
                
                const data = await res.json(); // ได้ URL จาก Blob มาแล้ว!
                
                showResult(data.url);
            } catch (err) {
                alert("เกิดข้อผิดพลาด: " + err.message);
                btn.innerText = "ลองใหม่";
                btn.disabled = false;
            }
        }, 'image/png');
    });
}

function showResult(url) {
    switchStep(4);
    // แสดงรูป
    const div = document.getElementById('final-image-show');
    div.innerHTML = `<img src="${url}" alt="Result">`;
    
    // ปุ่มโหลด
    const link = document.getElementById('download-link');
    link.href = url;
    link.download = `cny-photo-${Date.now()}.png`;

    // QR Code
    new QRCode(document.getElementById("qrcode"), {
        text: url,
        width: 150, height: 150
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