// script.js - QR Code Generator Pro

const el = (id) => document.getElementById(id);
const textInput = el('text-input');
const generateBtn = el('generate-btn');
const copyBtn = el('copy-btn');
const clearBtn = el('clear-btn');
const downloadBtn = el('download-btn');
const sizeSelect = el('size-select');
const darkColor = el('dark-color');
const lightColor = el('light-color');
const qrCanvas = el('qr-canvas');
const qrInfo = el('qr-info');
const historyList = el('history-list');
const yearEl = el('year');
let downloadClickStep = 0;
const AD_URL = "https://www.effectivecpmnetwork.com/e3rszd4sd?key=598bd85fe822858116cea6ed646dda59";

yearEl.textContent = new Date().getFullYear();

let currentOptions = {width: 256, color: {dark: '#111827', light: '#ffffff'}};
let debounceTimer = null;
const HISTORY_KEY = 'qr_history_v1';

// Utility: debounce
function debounce(fn, wait=500){
  return function(...args){
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(()=>fn.apply(this,args),wait);
  }
}

// Render QR to canvas using qrcode lib (does NOT save to history)
async function renderQRCode(text, opts = {}){
  if(!text) {
    clearCanvas();
    qrInfo.textContent = 'Enter text to generate';
    return;
  }
  qrInfo.textContent = 'Generating...';
  const width = parseInt(opts.width || sizeSelect.value || 256,10);
  const dark = opts.color?.dark || darkColor.value;
  const light = opts.color?.light || lightColor.value;
  currentOptions = {width, color:{dark,light}};

  try{
    // Ensure canvas is sized
    qrCanvas.width = width;
    qrCanvas.height = width;
    // Use QRCode.toCanvas
    await QRCode.toCanvas(qrCanvas, text, {width, color:{dark, light}});
    qrInfo.textContent = 'QR code ready';
    // IMPORTANT: do NOT save to history here. History must be saved only after a successful download.
  }catch(err){
    console.error(err);
    qrInfo.textContent = 'Error generating QR';
  }
}

function clearCanvas(){
  const ctx = qrCanvas.getContext('2d');
  ctx.clearRect(0,0,qrCanvas.width,qrCanvas.height);
}

// Save generated QR to localStorage history
// Save a history entry (called ONLY after successful download)
function saveToHistory(text, width, dark, light, dataURL){
  try{
    const entry = {id:Date.now(), text, width, dark, light, dataURL, created:new Date().toISOString()};
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    list.unshift(entry);
    // limit to 12 entries
    while(list.length>12) list.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    renderHistory();
  }catch(e){
    console.warn('History save failed',e);
  }
}

function renderHistory(){
  const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  historyList.innerHTML = '';
  if(!list.length){
    historyList.innerHTML = '<div class="muted">No history yet. Your last generated QR will appear here.</div>';
    return;
  }
  list.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'history-item';
    // thumbnail
    const img = document.createElement('img');
    img.src = item.dataURL;
    img.alt = 'QR thumbnail';
    // info
    const info = document.createElement('div');
    info.style.flex = '1';
    info.innerHTML = `<div style="font-weight:600">${escapeHtml(item.text)}</div><div style="font-size:12px;color:var(--muted)">${new Date(item.created).toLocaleString()}</div>`;
    // remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn ghost small';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      deleteHistoryItem(item.id);
    });

    div.appendChild(img);
    div.appendChild(info);
    div.appendChild(removeBtn);

    div.addEventListener('click', ()=>{
      textInput.value = item.text;
      sizeSelect.value = item.width;
      darkColor.value = item.dark;
      lightColor.value = item.light;
      renderQRCode(item.text, {width:item.width, color:{dark:item.dark, light:item.light}});
      window.scrollTo({top:0,behavior:'smooth'});
    });

    historyList.appendChild(div);
  });
}

// Delete a history item by id and sync localStorage
function deleteHistoryItem(id){
  try{
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const updated = list.filter(i => i.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    renderHistory();
  }catch(e){console.warn('Failed to delete history item', e)}
}

function escapeHtml(str){
  return str.replace(/[&<>\"]/g, function(tag){
    const chars = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
    return chars[tag] || tag;
  });
}

// Download higher-resolution PNG
function downloadPNG(){
  const text = textInput.value.trim();
  if(!text) return;
  const scale = 4; // scale factor for high-res
  const off = document.createElement('canvas');
  const size = currentOptions.width || parseInt(sizeSelect.value,10) || 256;
  off.width = size * scale;
  off.height = size * scale;
  const ctx = off.getContext('2d');
  // white background support
  ctx.fillStyle = currentOptions.color.light || '#fff';
  ctx.fillRect(0,0,off.width,off.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrCanvas, 0, 0, off.width, off.height);
  try{
    // Use dataURL so we can store the image in history reliably
    const dataURL = off.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `qr-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // After initiating download, save to history
    saveToHistory(text, size, currentOptions.color.dark || '#000', currentOptions.color.light || '#fff', dataURL);
  }catch(err){
    console.error('Download failed', err);
  }
}

// Copy input text to clipboard
async function copyInput(){
  const val = textInput.value.trim();
  if(!val) return;
  try{
    await navigator.clipboard.writeText(val);
    copyBtn.textContent = 'Copied!';
    setTimeout(()=>copyBtn.textContent = 'Copy Input',1200);
  }catch(e){
    alert('Copy failed.');
  }
}

function clearAll(){
  textInput.value = '';
  clearCanvas();
  qrInfo.textContent = 'Enter text to generate';
}

// Events
const liveGenerate = debounce(()=>{
  const t = textInput.value.trim();
  renderQRCode(t, {width: parseInt(sizeSelect.value,10), color:{dark:darkColor.value, light:lightColor.value}});
}, 700);

textInput.addEventListener('input', liveGenerate);
sizeSelect.addEventListener('change', ()=>{
  const t = textInput.value.trim();
  renderQRCode(t, {width: parseInt(sizeSelect.value,10), color:{dark:darkColor.value, light:lightColor.value}});
});
[darkColor, lightColor].forEach(inp=>inp.addEventListener('input', ()=>{
  const t = textInput.value.trim();
  renderQRCode(t, {width: parseInt(sizeSelect.value,10), color:{dark:darkColor.value, light:lightColor.value}});
}));

generateBtn.addEventListener('click', ()=>{
  const t = textInput.value.trim();
  renderQRCode(t, {width: parseInt(sizeSelect.value,10), color:{dark:darkColor.value, light:lightColor.value}});
});
copyBtn.addEventListener('click', copyInput);
clearBtn.addEventListener('click', clearAll);
//downloadBtn.addEventListener('click', downloadPNG);
downloadBtn.addEventListener('click', () => {
  if (downloadClickStep === 0) {
    downloadClickStep = 1;
    window.open(AD_URL, '_blank');
    return;
  }

  downloadClickStep = 0; // reset
  downloadPNG();
});

// Initialize
(function(){
  renderHistory();
  // try to render from initial input if present
  const initial = textInput.value.trim();
  if(initial) renderQRCode(initial);
})();

// small helper: basic sanitization for history labels
