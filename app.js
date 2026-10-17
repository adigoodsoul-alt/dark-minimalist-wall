import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    doc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Твоя конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAo6xB3NscspUGmIvIUa_Ls3iXnp99iv34",
    authDomain: "semensite.firebaseapp.com",
    projectId: "semensite",
    storageBucket: "semensite.firebasestorage.app",
    messagingSenderId: "765236316817",
    appId: "1:765236316817:web:38da96a3c674bcfee38d30",
    measurementId: "G-K51WZF57TF"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCollection = collection(db, "posts");

// DOM элементы
const viewport = document.getElementById('viewport');
const wall = document.getElementById('wall');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const textInput = document.getElementById('textInput');
const fontInput = document.getElementById('fontInput');
const colorInput = document.getElementById('colorInput');
const bgStyleInput = document.getElementById('bgStyleInput');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const uploadLabel = document.getElementById('uploadLabel');
const editImageNotice = document.getElementById('editImageNotice');
const addBtn = document.getElementById('addBtn');
const cancelBtn = document.getElementById('cancelBtn');
const sizeInput = document.getElementById('sizeInput');
const sizeValue = document.getElementById('sizeValue');
const adminToggle = document.getElementById('adminToggle');

const accentColors = [
    { hex: '#00e5ff', glow: 'rgba(0, 229, 255, 0.25)' }, 
    { hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.25)' }, 
    { hex: '#10b981', glow: 'rgba(16, 185, 129, 0.25)' }, 
    { hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)' }
];

let scale = 1; 
let panX = 0; 
let panY = 0;
let clickX = 0, clickY = 0;
let tempMarker = null;
let highestZ = 10;
let isAdmin = false;
let lastPostTime = 0;
let editingPostId = null;
let currentNormalizedFile = null;

// ==========================================
// 1. БЕСКОНЕЧНЫЙ ХОЛСТ (МЫШЬ + ТАЧ)
// ==========================================
function updateWallTransform() {
    wall.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    wall.style.backgroundPosition = `${-panX / scale}px ${-panY / scale}px`;
}

// Зум колесиком (ПК)
viewport.addEventListener('wheel', (e) => {
    e.preventDefault(); 
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; 
    let newScale = Math.max(0.2, Math.min(scale * zoomFactor, 3));
    const xs = (e.clientX - panX) / scale;
    const ys = (e.clientY - panY) / scale;
    panX = e.clientX - xs * newScale;
    panY = e.clientY - ys * newScale;
    scale = newScale;
    updateWallTransform();
}, { passive: false });

// Панорамирование (ПК)
let isPanning = false, startPanX = 0, startPanY = 0, isSpacePressed = false;
window.addEventListener('keydown', (e) => { 
    if (e.code === 'Space' && e.target === document.body) {
        isSpacePressed = true; 
    }
});
window.addEventListener('keyup', (e) => { 
    if (e.code === 'Space') {
        isSpacePressed = false; 
        viewport.classList.remove('panning');
    }
});

viewport.addEventListener('mousedown', (e) => {
    if (isSpacePressed || e.button === 1) {
        isPanning = true; 
        startPanX = e.clientX - panX; 
        startPanY = e.clientY - panY; 
        viewport.classList.add('panning');
    }
});
window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startPanX; 
    panY = e.clientY - startPanY; 
    updateWallTransform();
});
window.addEventListener('mouseup', () => { 
    isPanning = false; 
    viewport.classList.remove('panning'); 
});

// МОБАЙЛ: Панорамирование, Зум и Тап
let touchStartX = 0, touchStartY = 0;
let initialPinchDistance = null;
let isTouchDrag = false;

viewport.addEventListener('touchstart', (e) => {
    if (e.target !== wall && e.target !== viewport) return;
    
    if (e.touches.length === 1) {
        isPanning = true; 
        isTouchDrag = false;
        startPanX = e.touches[0].clientX - panX;
        startPanY = e.touches[0].clientY - panY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        isPanning = false;
        initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
}, { passive: false });

viewport.addEventListener('touchmove', (e) => {
    if (e.target !== wall && e.target !== viewport) return;
    e.preventDefault(); 
    
    if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isTouchDrag = true;

        panX = e.touches[0].clientX - startPanX;
        panY = e.touches[0].clientY - startPanY;
        updateWallTransform();
    } else if (e.touches.length === 2) {
        const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        if (initialPinchDistance) {
            const zoomFactor = currentDistance / initialPinchDistance;
            let newScale = Math.max(0.2, Math.min(scale * zoomFactor, 3));
            
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const xs = (centerX - panX) / scale;
            const ys = (centerY - panY) / scale;
            
            panX = centerX - xs * newScale;
            panY = centerY - ys * newScale;
            scale = newScale;
            updateWallTransform();
        }
        initialPinchDistance = currentDistance;
        isTouchDrag = true;
    }
}, { passive: false });

viewport.addEventListener('touchend', (e) => {
    if (!isTouchDrag && e.changedTouches.length === 1 && isPanning) {
        // Гасим синтетические mouse-события, которые браузер шлёт после тапа,
        // иначе обработчик mousedown ниже создаст вторую метку.
        e.preventDefault();

        const touch = e.changedTouches[0];
        clickX = (touch.clientX - panX) / scale;
        clickY = (touch.clientY - panY) / scale;
        
        tempMarker = document.createElement('div');
        tempMarker.className = 'click-marker';
        tempMarker.style.left = `${clickX}px`; 
        tempMarker.style.top = `${clickY}px`;
        wall.appendChild(tempMarker);
        
        openModal(false);
    }
    isPanning = false; 
    initialPinchDistance = null;
});

// Клик по ПК для создания
viewport.addEventListener('mousedown', (e) => {
    if (e.target !== wall || isSpacePressed || e.button === 1) return;
    clickX = (e.clientX - panX) / scale;
    clickY = (e.clientY - panY) / scale;
    
    tempMarker = document.createElement('div');
    tempMarker.className = 'click-marker';
    tempMarker.style.left = `${clickX}px`; 
    tempMarker.style.top = `${clickY}px`;
    wall.appendChild(tempMarker);
    openModal(false);
});

// ==========================================
// 2. ИНТЕРФЕЙС, HEIC И МОДАЛКА
// ==========================================
fontInput.addEventListener('change', (e) => { textInput.style.fontFamily = e.target.value; });
colorInput.addEventListener('input', (e) => { textInput.style.color = e.target.value; });
bgStyleInput.addEventListener('change', (e) => {
    if (e.target.value === 'transparent') textInput.classList.add('preview-transparent');
    else textInput.classList.remove('preview-transparent');
});
sizeInput.addEventListener('input', (e) => { sizeValue.textContent = `${e.target.value}x`; });

adminToggle.addEventListener('click', () => {
    if (isAdmin) { 
        isAdmin = false; 
        document.body.classList.remove('admin-mode'); 
        adminToggle.textContent = '🔒'; 
    } else {
        if (prompt('Введите пароль (admin):') === 'admin') {
            isAdmin = true; 
            document.body.classList.add('admin-mode'); 
            adminToggle.textContent = '🔓';
        }
    }
});

// Функция нормализации файлов (HEIC -> JPEG)
async function normalizeFile(file) {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic') {
        try {
            const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
            return Array.isArray(converted) ? converted[0] : converted;
        } catch (err) {
            console.error("HEIC Error:", err);
            throw new Error("Не удалось обработать формат HEIC. Попробуйте другое фото.");
        }
    }
    return file; 
}

imageInput.addEventListener('change', async () => {
    const file = imageInput.files[0];
    if (file) {
        addBtn.disabled = true;
        editImageNotice.style.display = 'block';
        editImageNotice.textContent = 'Обработка фото (HEIC может занять пару секунд)...';
        
        try {
            currentNormalizedFile = await normalizeFile(file);
            imagePreview.src = URL.createObjectURL(currentNormalizedFile);
            imagePreview.style.display = 'block';
            editImageNotice.style.display = 'none';
        } catch(e) {
            alert(e.message);
            editImageNotice.style.display = 'none';
            imageInput.value = '';
        } finally {
            addBtn.disabled = false;
        }
    }
});

function openModal(isEditMode = false, data = null, id = null) {
    editingPostId = isEditMode ? id : null;
    if (isEditMode && data) {
        modalTitle.textContent = "Редактировать запись";
        textInput.value = data.text || "";
        fontInput.value = data.font || "'Inter', sans-serif";
        colorInput.value = data.textColor || "#ededed";
        bgStyleInput.value = data.bgStyle || "glass";
        sizeInput.value = data.size || 1; 
        sizeValue.textContent = `${data.size || 1}x`;
        uploadLabel.style.display = 'none'; 
        editImageNotice.style.display = 'block'; 
        editImageNotice.textContent = '*Фото заменить нельзя.';
        addBtn.textContent = 'Сохранить';
        textInput.style.fontFamily = fontInput.value; 
        textInput.style.color = colorInput.value;
        if (bgStyleInput.value === 'transparent') textInput.classList.add('preview-transparent');
    } else {
        modalTitle.textContent = "Создать запись";
        uploadLabel.style.display = 'block'; 
        editImageNotice.style.display = 'none'; 
        addBtn.textContent = 'Опубликовать';
    }
    modalBackdrop.classList.add('active'); 
    setTimeout(() => textInput.focus(), 100);
}

function closeModal() {
    modalBackdrop.classList.remove('active');
    textInput.value = ''; 
    textInput.style.fontFamily = "'Inter', sans-serif"; 
    textInput.style.color = "#ededed";
    textInput.classList.remove('preview-transparent'); 
    fontInput.value = "'Inter', sans-serif"; 
    colorInput.value = "#ededed";
    bgStyleInput.value = "glass"; 
    imageInput.value = ''; 
    imagePreview.src = ''; 
    imagePreview.style.display = 'none';
    sizeInput.value = 1; 
    sizeValue.textContent = '1x'; 
    editingPostId = null; 
    currentNormalizedFile = null;
    if (tempMarker) { 
        tempMarker.remove(); 
        tempMarker = null; 
    }
}
cancelBtn.addEventListener('click', closeModal);

function compressImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); 
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image(); 
            img.src = e.target.result;
            img.onload = () => {
                const MAX_SIZE = 600; 
                let { width, height } = img;
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    if (width > height) { 
                        height = Math.round((height * MAX_SIZE) / width); 
                        width = MAX_SIZE; 
                    } else { 
                        width = Math.round((width * MAX_SIZE) / height); 
                        height = MAX_SIZE; 
                    }
                }
                const canvas = document.createElement('canvas'); 
                canvas.width = width; 
                canvas.height = height;
                const ctx = canvas.getContext('2d'); 
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            }; 
            img.onerror = reject;
        }; 
        reader.onerror = reject;
    });
}

addBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    const file = currentNormalizedFile; 
    const scaleSize = parseFloat(sizeInput.value);

    if (!text && !file && !editingPostId) return;

    if (!editingPostId && (Date.now() - lastPostTime < 3000)) {
        alert("Подождите 3 секунды перед созданием следующего поста!"); 
        return;
    }

    addBtn.disabled = true; 
    addBtn.textContent = 'Сохранение...';

    try {
        const payload = { 
            text, 
            size: scaleSize, 
            font: fontInput.value, 
            textColor: colorInput.value, 
            bgStyle: bgStyleInput.value 
        };
        if (editingPostId) {
            await updateDoc(doc(db, "posts", editingPostId), payload);
        } else {
            if (file) payload.imageBase64 = await compressImageToBase64(file);
            payload.x = clickX; 
            payload.y = clickY;
            payload.color = accentColors[Math.floor(Math.random() * accentColors.length)];
            payload.zIndex = highestZ + 1; 
            payload.createdAt = serverTimestamp();
            await addDoc(postsCollection, payload); 
            lastPostTime = Date.now();
        }
        closeModal();
    } catch (err) { 
        console.error(err); 
        alert("Ошибка сохранения!"); 
    } finally { 
        addBtn.disabled = false; 
    }
});

// ==========================================
// 3. FIREBASE СИНХРОНИЗАЦИЯ & РЕНДЕР
// ==========================================
let localPostsData = {};

const q = query(postsCollection);
onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        const data = change.doc.data(); 
        const id = change.doc.id;
        if (data.zIndex && data.zIndex > highestZ) highestZ = data.zIndex;
        
        if (change.type === "added") { 
            localPostsData[id] = data; 
            renderPost(id, data); 
        } else if (change.type === "modified") {
            localPostsData[id] = data;
            const el = document.getElementById(id);
            if (el) {
                applyStylesToElement(el, data);
                if (!el.classList.contains('dragging')) { 
                    el.style.left = `${data.x}px`; 
                    el.style.top = `${data.y}px`; 
                }
                const p = el.querySelector('.text-content');
                if (p) { 
                    p.textContent = data.text || ''; 
                    applyTextStyles(p, data); 
                }
            }
        } else if (change.type === "removed") {
            delete localPostsData[id]; 
            const el = document.getElementById(id); 
            if (el) el.remove();
        }
    });
});

function applyStylesToElement(el, data) {
    if (data.bgStyle === 'transparent') el.classList.add('style-transparent');
    else el.classList.remove('style-transparent');
    
    if (data.color) {
        el.style.setProperty('--accent', data.color.hex || '#6366f1'); 
        el.style.setProperty('--accent-glow', data.color.glow || 'rgba(99, 102, 241, 0.4)');
    }
    el.style.setProperty('--post-scale', data.size || 1); 
    el.style.zIndex = data.zIndex || 10;
}

function applyTextStyles(p, data) {
    p.style.fontFamily = data.font || "'Inter', sans-serif"; 
    p.style.color = data.textColor || "#ededed";
    p.style.fontSize = data.font && data.font.includes('Caveat') 
        ? `calc(20px * var(--post-scale))` 
        : `calc(15px * var(--post-scale))`;
}

function renderPost(id, data) {
    if (document.getElementById(id)) return;
    const item = document.createElement('div'); 
    item.className = 'wall-item'; 
    item.id = id;
    applyStylesToElement(item, data); 
    item.style.left = `${data.x}px`; 
    item.style.top = `${data.y}px`;

    const delBtn = document.createElement('button'); 
    delBtn.className = 'delete-btn'; 
    delBtn.innerHTML = '×';
    delBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); 
        if (confirm('Удалить эту запись?')) { 
            try { 
                await deleteDoc(doc(db, "posts", id)); 
            } catch (err) { 
                alert(err.message); 
            } 
        }
    });
    item.appendChild(delBtn);

    if (data.imageBase64) {
        const imgContainer = document.createElement('div'); 
        imgContainer.className = 'img-container';
        const img = document.createElement('img'); 
        img.src = data.imageBase64; 
        imgContainer.appendChild(img);
        item.appendChild(imgContainer);
    }
    if (data.text) {
        const p = document.createElement('p'); 
        p.className = 'text-content'; 
        p.textContent = data.text; 
        applyTextStyles(p, data); 
        item.appendChild(p);
    }
    makeDraggableAndEditable(item, id); 
    wall.appendChild(item);
}

// ==========================================
// 4. ПЕРЕТАСКИВАНИЕ КАРТОЧЕК (МЫШЬ + ТАЧ)
// ==========================================
function makeDraggableAndEditable(element, docId) {
    let isDragging = false, hasMoved = false;
    let startX, startY, initialX, initialY;
    let lastTapTime = 0; 

    const startDrag = (clientX, clientY) => {
        isDragging = true; 
        hasMoved = false; 
        element.classList.add('dragging');
        highestZ++; 
        element.style.zIndex = highestZ; 
        updateDoc(doc(db, "posts", docId), { zIndex: highestZ }).catch(console.error);
        startX = clientX; 
        startY = clientY;
        initialX = parseFloat(element.style.left || 0); 
        initialY = parseFloat(element.style.top || 0);
    };

    const moveDrag = (clientX, clientY) => {
        if (!isDragging) return;
        const dx = (clientX - startX) / scale; 
        const dy = (clientY - startY) / scale;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved = true;
        element.style.left = `${initialX + dx}px`; 
        element.style.top = `${initialY + dy}px`;
    };

    const endDrag = async () => {
        if (isDragging) {
            isDragging = false; 
            element.classList.remove('dragging');
            if (hasMoved) { 
                try { 
                    await updateDoc(doc(db, "posts", docId), { 
                        x: parseFloat(element.style.left), 
                        y: parseFloat(element.style.top) 
                    }); 
                } catch (error) { 
                    console.error(error); 
                } 
            }
        }
    };

    element.addEventListener('mousedown', (e) => { 
        if (e.target.classList.contains('delete-btn')) return; 
        e.stopPropagation(); 
        startDrag(e.clientX, e.clientY); 
    });
    window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);
    element.addEventListener('dblclick', (e) => { 
        e.stopPropagation(); 
        const data = localPostsData[docId]; 
        if (data) openModal(true, data, docId); 
    });

    element.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('delete-btn')) return;
        e.stopPropagation();
        
        const currentTime = Date.now();
        if (currentTime - lastTapTime < 300) { 
            e.preventDefault(); 
            const data = localPostsData[docId]; 
            if (data) openModal(true, data, docId); 
            return; 
        }
        lastTapTime = currentTime;

        if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    
    element.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
            e.preventDefault(); 
            moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });
    
    element.addEventListener('touchend', endDrag);
}
