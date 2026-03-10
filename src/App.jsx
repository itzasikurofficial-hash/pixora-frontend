import { useState, useRef, useCallback } from "react";

const BACKEND_URL = "https://asikurr-pixora-backend.hf.space";

const TOOLS = [
  { id: "background", icon: "✦", label: "Background" },
  { id: "objects", icon: "◈", label: "Objects" },
  { id: "retouch", icon: "◉", label: "Retouch" },
  { id: "batch", icon: "⊞", label: "Batch" },
];

const BACKGROUNDS = [
  { id: "transparent", label: "None", color: null },
  { id: "white", label: "White", color: "#ffffff" },
  { id: "black", label: "Black", color: "#0a0a0a" },
  { id: "gradient1", label: "Ocean", color: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" },
  { id: "gradient2", label: "Sunset", color: "linear-gradient(135deg,#f093fb,#f5576c)" },
  { id: "gradient3", label: "Forest", color: "linear-gradient(135deg,#134e5e,#71b280)" },
  { id: "gradient4", label: "Gold", color: "linear-gradient(135deg,#f7971e,#ffd200)" },
  { id: "gradient5", label: "Aurora", color: "linear-gradient(135deg,#a18cd1,#fbc2eb)" },
];

const RETOUCHES = [
  { id: "brightness", label: "Brightness", icon: "☀", value: 0, min: -100, max: 100 },
  { id: "contrast", label: "Contrast", icon: "◑", value: 0, min: -100, max: 100 },
  { id: "saturation", label: "Saturation", icon: "◐", value: 0, min: -100, max: 100 },
  { id: "sharpness", label: "Sharpness", icon: "◇", value: 0, min: 0, max: 100 },
  { id: "shadow", label: "Shadow", icon: "▣", value: 0, min: 0, max: 100 },
];

const BATCH_MOCK = [
  { id: 1, name: "product_01.jpg", status: "done" },
  { id: 2, name: "product_02.jpg", status: "done" },
  { id: 3, name: "product_03.jpg", status: "processing" },
  { id: 4, name: "product_04.jpg", status: "queued" },
  { id: 5, name: "product_05.jpg", status: "queued" },
];
export default function PixoraApp() {
  const [activeTool, setActiveTool] = useState("background");
  const [selectedBg, setSelectedBg] = useState("transparent");
  const [imageFile, setImageFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [retouches, setRetouches] = useState(
    Object.fromEntries(RETOUCHES.map(r => [r.id, r.value]))
  );
  const inputRef = useRef(null);
  const progressRef = useRef(null);

  const startFakeProgress = () => {
    setProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 90) { p = 90; clearInterval(progressRef.current); }
      setProgress(Math.round(p));
    }, 200);
  };

  const stopProgress = (final = 100) => {
    clearInterval(progressRef.current);
    setProgress(final);
  };

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setOriginalUrl(URL.createObjectURL(file));
    setProcessedUrl(null);
    setShowResult(false);
    setError(null);
    setProgress(0);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const removeBackground = async () => {
    if (!imageFile) return;
    setProcessing(true);
    setError(null);
    startFakeProgress();
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      const response = await fetch(`${BACKEND_URL}/remove-background`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      stopProgress(100);
      setProcessedUrl(url);
      setShowResult(true);
    } catch (err) {
      stopProgress(0);
      setError("AI processing failed. Please check the backend is running.");
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = "pixora_removed_bg.png";
    a.click();
  };

  const getBgStyle = () => {
    const bg = BACKGROUNDS.find(b => b.id === selectedBg);
    if (!bg?.color) return { background: "repeating-conic-gradient(#1e1e2e 0% 25%, #16162a 0% 50%) 0 0 / 20px 20px" };
    if (bg.color.includes("gradient")) return { background: bg.color };
    return { backgroundColor: bg.color };
  };

  const retouchFilter = () =>
    `brightness(${1 + retouches.brightness / 200}) contrast(${1 + retouches.contrast / 200}) saturate(${1 + retouches.saturation / 100})`;
  const StatusBadge = ({ status }) => {
    const map = { done: ["#22c55e", "Done"], processing: ["#f59e0b", "Processing…"], queued: ["#6b7280", "Queued"] };
    const [color, label] = map[status] || ["#6b7280", status];
    return <span style={{ background: color + "20", color, border: `1px solid ${color}40`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{label}</span>;
  };

  const SliderControl = ({ control }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#94a3b8", display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 14 }}>{control.icon}</span>{control.label}
        </span>
        <span style={{ fontSize: 12, color: "#e2e8f0", minWidth: 30, textAlign: "right" }}>
          {retouches[control.id] > 0 ? "+" : ""}{retouches[control.id]}
        </span>
      </div>
      <div style={{ position: "relative", height: 4, background: "#1e293b", borderRadius: 9 }}>
        <div style={{ position: "absolute", height: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 9, width: `${((retouches[control.id] - control.min) / (control.max - control.min)) * 100}%` }} />
        <input type="range" min={control.min} max={control.max} value={retouches[control.id]}
          onChange={e => setRetouches(p => ({ ...p, [control.id]: +e.target.value }))}
          style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: 20, top: -8 }} />
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: "#0b0b15", minHeight: "100vh", color: "#e2e8f0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0b0b15; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 9px; }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes slide-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        .tool-btn:hover { background: #1e293b !important; }
        .bg-chip:hover { border-color: #6366f1 !important; transform: translateY(-2px); }
        .hover-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .upload-zone:hover { border-color: #6366f1 !important; background: #0f1229 !important; }
        input[type=range] { -webkit-appearance: none; }
      `}</style>

      <div style={{ height: 56, background: "#0d0d1a", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 20px", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800 }}>P</div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, background: "linear-gradient(90deg,#a5b4fc,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pixora</span>
          <span style={{ fontSize: 10, background: "#312e81", color: "#a5b4fc", padding: "2px 7px", borderRadius: 6, fontWeight: 600, letterSpacing: 1 }}>AI</span>
        </div>
        <div style={{ flex: 1 }} />
        {processedUrl && (
          <button onClick={downloadImage} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }} className="hover-btn">
            ⬇ Download PNG
          </button>
        )}
        <button style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Project</button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ width: 64, background: "#0d0d1a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 4 }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setActiveTool(t.id)} className="tool-btn"
              style={{ width: 44, height: 52, borderRadius: 10, border: "none", cursor: "pointer", transition: "all 0.15s", background: activeTool === t.id ? "linear-gradient(135deg,#312e81,#1e1b4b)" : "transparent", color: activeTool === t.id ? "#a5b4fc" : "#64748b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, outline: activeTool === t.id ? "1px solid #4338ca" : "none" }}>
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{t.label}</span>
            </button>
          ))}
        </div>

        <div style={{ width: 280, background: "#0d0d1a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #1e293b" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
              {activeTool === "background" ? "Background Removal" : activeTool === "objects" ? "Object Detection" : activeTool === "retouch" ? "Retouch Controls" : "Batch Processing"}
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>BRIA RMBG 1.4 · High Accuracy</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {activeTool === "background" && (
              <div style={{ animation: "slide-up 0.2s ease" }}>
                <button onClick={removeBackground} disabled={!imageFile || processing}
                  style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", cursor: imageFile && !processing ? "pointer" : "not-allowed", background: imageFile && !processing ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1e293b", color: imageFile && !processing ? "#fff" : "#475569", fontSize: 14, fontWeight: 700, marginBottom: 14, transition: "all 0.2s" }}>
                  {processing ? `AI Processing… ${progress}%` : processedUrl ? "✓ Remove Again" : "✦ Remove Background"}
                </button>
                {processing && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ height: 4, background: "#1e293b", borderRadius: 9, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 9, width: `${progress}%`, transition: "width 0.3s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#6366f1", marginTop: 6, textAlign: "center", animation: "pulse 1.5s infinite" }}>BRIA RMBG 1.4 analyzing image…</div>
                  </div>
                )}
                {error && <div style={{ background: "#2d0a0a", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 11, color: "#f87171" }}>⚠ {error}</div>}
                {processedUrl && !processing && (
                  <div style={{ background: "#0a2d1a", border: "1px solid #22c55e40", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 11, color: "#4ade80", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>✓ Background removed successfully</span>
                    <button onClick={downloadImage} style={{ background: "#166534", border: "none", borderRadius: 6, color: "#4ade80", fontSize: 10, padding: "3px 8px", cursor: "pointer", fontWeight: 700 }}>⬇ PNG</button>
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Replace Background</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {BACKGROUNDS.map(bg => (
                    <button key={bg.id} onClick={() => setSelectedBg(bg.id)} className="bg-chip"
                      style={{ height: 44, borderRadius: 8, border: selectedBg === bg.id ? "2px solid #6366f1" : "1px solid #1e293b", cursor: "pointer", transition: "all 0.15s", background: bg.color ? (bg.color.includes("gradient") ? bg.color : bg.color) : "repeating-conic-gradient(#1e1e2e 0% 25%, #16162a 0% 50%) 0 0 / 10px 10px" }}>
                      {selectedBg === bg.id && <span style={{ color: "#fff", fontSize: 16 }}>✓</span>}
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginTop: 4 }}>
                  {BACKGROUNDS.map(bg => <div key={bg.id} style={{ fontSize: 9, color: "#475569", textAlign: "center" }}>{bg.label}</div>)}
                </div>
              </div>
            )}
            {activeTool === "objects" && (
              <div style={{ animation: "slide-up 0.2s ease" }}>
                <div style={{ background: "#111827", border: "1px dashed #334155", borderRadius: 10, padding: 16, textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>◈</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Object removal coming soon.</div>
                </div>
              </div>
            )}
            {activeTool === "retouch" && (
              <div style={{ animation: "slide-up 0.2s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Adjustments</span>
                  <button onClick={() => setRetouches(Object.fromEntries(RETOUCHES.map(r => [r.id, r.value])))}
                    style={{ background: "transparent", border: "none", color: "#6366f1", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Reset All</button>
                </div>
                {RETOUCHES.map(r => <SliderControl key={r.id} control={r} />)}
              </div>
            )}
            {activeTool === "batch" && (
              <div style={{ animation: "slide-up 0.2s ease" }}>
                {BATCH_MOCK.map(item => (
                  <div key={item.id} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: "#1e293b", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 14 }}>
                      {item.status === "done" ? "✓" : item.status === "processing" ? <div style={{ width: 12, height: 12, border: "2px solid #f59e0b", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : "…"}
                    </div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{item.name}</div></div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 44, background: "#0d0d1a", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
            <div style={{ flex: 1 }} />
            {originalUrl && (
              <div style={{ display: "flex", gap: 6 }}>
                {["Original", "Result"].map(v => (
                  <button key={v} onClick={() => setShowResult(v === "Result")} disabled={v === "Result" && !processedUrl}
                    style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: (v === "Result") === showResult ? "#1e1b4b" : "transparent", color: (v === "Result") === showResult ? "#a5b4fc" : v === "Result" && !processedUrl ? "#334155" : "#64748b" }}>{v}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            {!originalUrl ? (
              <div className="upload-zone" onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => inputRef.current?.click()}
                style={{ width: 440, height: 340, border: `2px dashed ${dragging ? "#6366f1" : "#334155"}`, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", gap: 12 }}>
                <div style={{ width: 64, height: 64, background: "linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius: 16, display: "grid", placeItems: "center", fontSize: 28 }}>✦</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Drop your image here</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>PNG, JPG, WEBP · Max 50MB</div>
                </div>
                <button style={{ padding: "10px 24px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Browse Files</button>
                <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              </div>
            ) : (
              <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", inset: 0, ...getBgStyle() }} />
                <div style={{ position: "relative", maxWidth: "80%", maxHeight: "80%" }}>
                  <img src={showResult && processedUrl ? processedUrl : originalUrl} alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", filter: retouchFilter() }} />
                  {processing && (
                    <div style={{ position: "absolute", inset: 0, background: "#000c", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, border: "3px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      <div style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 600 }}>BRIA RMBG Processing…</div>
                      <div style={{ fontSize: 24, fontWeight: 800 }}>{progress}%</div>
                    </div>
                  )}
                </div>
                <button onClick={() => { setImageFile(null); setOriginalUrl(null); setProcessedUrl(null); setShowResult(false); setError(null); setProgress(0); }}
                  style={{ position: "absolute", top: 12, right: 12, background: "#1e293b", border: "none", borderRadius: 8, color: "#94a3b8", padding: "6px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>✕ Clear</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 28, background: "#0d0d1a", borderTop: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 16px", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 10, color: "#475569", fontWeight: 500 }}>Backend Connected</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />
          <span style={{ fontSize: 10, color: "#475569", fontWeight: 500 }}>BRIA RMBG 1.4 Ready</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#334155" }}>Pixora v2.4 · Powered by BRIA RMBG 1.4</span>
      </div>
    </div>
  );
}
