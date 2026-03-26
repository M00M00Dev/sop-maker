"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  Plus, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle, 
  BookOpen, 
  Download,
  Save,
  FileUp,
  History,
  CheckCircle2,
  Maximize2
} from 'lucide-react';

// --- TYPES & CONFIG ---
interface Step {
  id: number;
  stepNumber: string;
  title: string;
  detail: string;
}

const APP_VERSION = "1.1.0";
const DATA_SCHEMA_VERSION = "1.1";

declare global {
  interface Window {
    htmlToImage: any;
  }
}

const CONFIG = {
  SIDEBAR: {
    APP_NAME: "SOP Builder Pro",
    SECTION_1_LABEL: "1. Procedure Title",
    SECTION_2_LABEL: "2. Visual Reference (Drag to Pan)",
    SECTION_3_LABEL: "3. Procedure Steps",
    TITLE_PLACEHOLDER: "e.g. Daily Prep: Jasmine Rice",
    ADD_STEP_BTN: "Add New Step",
    DOWNLOAD_BTN: "Download Image",
    EXPORT_BTN: "Export .JSON",
    IMPORT_BTN: "Import .JSON",
  },
  DOC: {
    HEADER_TYPE: "Standard Operating Procedure",
    VISUAL_GUIDE_LABEL: "Visual Guide",
    PAGE_LABEL: "Page",
  }
};

export default function App() {
  // --- STATE ---
  const [sopTitle, setSopTitle] = useState('Daily Prep: Jasmine Rice');
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, stepNumber: '1', title: 'Wash Rice', detail: 'Rinse rice 3 times until water runs clear.' },
    { id: 2, stepNumber: '2', title: 'Water Ratio', detail: 'Use 1:1.2 ratio for jasmine rice.' }
  ]);
  
  // Image Manipulation State
  const [imageZoom, setImageZoom] = useState(100);
  const [imageOffset, setImageOffset] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // --- PERSISTENCE (LOCALSTORAGE) ---
  useEffect(() => {
    const saved = localStorage.getItem('sop_autosave_v1.1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSopTitle(parsed.title);
        setSteps(parsed.steps);
        setImageZoom(parsed.imageZoom || 100);
        setImageOffset(parsed.imageOffset || { x: 50, y: 50 });
      } catch (e) { console.error("Sync Error"); }
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('sop_autosave_v1.1', JSON.stringify({ 
        title: sopTitle, 
        steps, 
        imageZoom, 
        imageOffset 
      }));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [sopTitle, steps, imageZoom, imageOffset]);

  // --- LIBRARIES ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
    script.async = true;
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  // --- HANDLERS ---
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMainImage(reader.result);
          setImageZoom(100);
          setImageOffset({ x: 50, y: 50 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !mainImage) return;
    const sensitivity = 0.2; // Adjust for smoothness
    setImageOffset(prev => ({
      x: Math.max(0, Math.min(100, prev.x - e.movementX * sensitivity)),
      y: Math.max(0, Math.min(100, prev.y - e.movementY * sensitivity))
    }));
  };

  const handleExportData = () => {
    const dataToExport = {
      app_version: APP_VERSION,
      schema_version: DATA_SCHEMA_VERSION,
      content: { title: sopTitle, mainImage, steps, imageZoom, imageOffset }
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SOP_PROJECT_${sopTitle.replace(/\s+/g, '_')}.json`;
    link.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.content) {
          setSopTitle(json.content.title);
          setMainImage(json.content.mainImage);
          setSteps(json.content.steps);
          setImageZoom(json.content.imageZoom || 100);
          setImageOffset(json.content.imageOffset || { x: 50, y: 50 });
          setError(null);
        }
      } catch (err) { setError("Incompatible file."); }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleDownloadImage = async () => {
    if (!previewRef.current || isDownloading || typeof window.htmlToImage === 'undefined') return;
    setIsDownloading(true);
    try {
      const dataUrl = await window.htmlToImage.toPng(previewRef.current, {
        quality: 1, pixelRatio: 3, backgroundColor: '#ffffff', width: 1122.5, height: 793.7
      });
      const link = document.createElement('a');
      link.download = `SOP_${sopTitle.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { setError("Export failed."); }
    finally { setIsDownloading(false); }
  };

  // --- SHARED UI COMPONENTS ---
  const VisualContent = ({ isPreview = false }) => (
    <div 
      className="w-full h-full bg-slate-50 relative overflow-hidden"
      style={isPreview ? { cursor: isDragging ? 'grabbing' : 'grab' } : {}}
      onMouseDown={() => isPreview && setIsDragging(true)}
      onMouseUp={() => isPreview && setIsDragging(false)}
      onMouseLeave={() => isPreview && setIsDragging(false)}
      onMouseMove={handleMouseMove}
    >
      {mainImage ? (
        <div 
          className="absolute inset-0 transition-transform duration-75 ease-out"
          style={{
            backgroundImage: `url(${mainImage})`,
            backgroundSize: `${imageZoom}%`,
            backgroundPosition: `${imageOffset.x}% ${imageOffset.y}%`,
            backgroundRepeat: 'no-repeat'
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full opacity-20">
          <ImageIcon className="w-16 h-16" />
          <p className="font-black uppercase tracking-widest text-sm">Image Required</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col lg:flex-row font-sans">
      {/* SIDEBAR */}
      <div className="w-full lg:w-[450px] bg-white border-r border-slate-200 p-8 overflow-y-auto h-screen shadow-xl z-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#061E30] rounded-lg text-white"><BookOpen className="w-6 h-6" /></div>
            <h1 className="text-xl font-black text-[#061E30] uppercase tracking-tighter">SOP Maker</h1>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-black text-emerald-600 uppercase">
            <CheckCircle2 className="w-3 h-3" /> v{APP_VERSION}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportData} className="flex items-center justify-center gap-2 py-2 border-2 border-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:border-[#061E30] hover:text-[#061E30] transition-all"><Save className="w-3 h-3" /> {CONFIG.SIDEBAR.EXPORT_BTN}</button>
            <button onClick={() => importInputRef.current?.click()} className="flex items-center justify-center gap-2 py-2 border-2 border-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:border-[#061E30] hover:text-[#061E30] transition-all"><FileUp className="w-3 h-3" /> {CONFIG.SIDEBAR.IMPORT_BTN}</button>
            <input type="file" ref={importInputRef} onChange={handleImportData} className="hidden" accept=".json" />
          </div>

          <section>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{CONFIG.SIDEBAR.SECTION_1_LABEL}</label>
            <input type="text" value={sopTitle} onChange={(e) => setSopTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#061E30]" />
          </section>

          <section>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{CONFIG.SIDEBAR.SECTION_2_LABEL}</label>
            <div className="border-2 border-slate-200 rounded-xl overflow-hidden group relative">
              <div className="h-48"><VisualContent isPreview /></div>
              {mainImage && (
                <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Zoom Level</span><span className="text-xs font-black">{imageZoom}%</span></div>
                  <input type="range" min="100" max="400" value={imageZoom} onChange={(e) => setImageZoom(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-[#061E30]" />
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-slate-50 text-[10px] font-black uppercase text-slate-400 hover:bg-[#061E30] hover:text-white transition-all border-t border-slate-100">Change Image</button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </section>

          <section>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{CONFIG.SIDEBAR.SECTION_3_LABEL}</label>
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 group relative">
                  <button onClick={() => setSteps(steps.filter(s => s.id !== step.id))} className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={step.stepNumber} onChange={(e) => setSteps(steps.map(s => s.id === step.id ? {...s, stepNumber: e.target.value} : s))} className="w-8 h-6 text-center bg-white border border-slate-200 rounded font-black text-xs" />
                    <input type="text" value={step.title} onChange={(e) => setSteps(steps.map(s => s.id === step.id ? {...s, title: e.target.value} : s))} placeholder="Step Title" className="flex-1 bg-transparent border-none font-bold text-[#061E30] p-0 text-sm focus:ring-0" />
                  </div>
                  <textarea value={step.detail} onChange={(e) => setSteps(steps.map(s => s.id === step.id ? {...s, detail: e.target.value} : s))} rows={2} className="w-full bg-transparent border-none text-xs text-slate-500 p-0 focus:ring-0 resize-none" placeholder="Instructions..." />
                </div>
              ))}
            </div>
            <button onClick={() => setSteps([...steps, { id: Date.now(), stepNumber: (steps.length + 1).toString(), title: '', detail: '' }])} className="w-full py-3 mt-4 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-[#061E30] hover:text-[#061E30] transition-all">+ Add Step</button>
          </section>

          <button onClick={handleDownloadImage} disabled={isDownloading} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-lg hover:bg-emerald-700 disabled:opacity-50">
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download Final SOP
          </button>
          
          {lastSaved && <div className="text-center text-[9px] text-slate-300 font-bold uppercase tracking-tighter flex items-center justify-center gap-1"><History className="w-3 h-3" /> Auto-saved {lastSaved}</div>}
        </div>
      </div>

      {/* MAIN DOCUMENT PREVIEW */}
      <div className="flex-1 p-12 overflow-auto flex items-start justify-center bg-slate-400 min-h-screen">
        <div className="shadow-[0_0_50px_rgba(0,0,0,0.3)] h-fit">
          <div ref={previewRef} className="flex bg-white origin-top-center" style={{ width: '297mm', height: '210mm', transform: 'scale(0.4)', flexShrink: 0 }}>
            {/* PAGE 1 (Visual) */}
            <div className="w-[148.5mm] h-full border-r-[1px] border-slate-100 p-12 flex flex-col">
              <div className="border-b-4 border-[#061E30] pb-4 mb-6">
                <h3 className="text-[#061E30] font-black text-xs uppercase tracking-[3px] mb-1">{CONFIG.DOC.HEADER_TYPE}</h3>
                <h2 className="text-[#061E30] font-bold text-3xl uppercase tracking-tighter">{sopTitle}</h2>
              </div>
              <div className="flex-1 flex flex-col rounded-xl overflow-hidden border-[6px] border-[#061E30]">
                <div className="bg-[#061E30] text-white px-6 py-3 flex items-center gap-3"><ImageIcon className="w-5 h-5" /><span className="text-[12px] font-black uppercase tracking-[3px]">{CONFIG.DOC.VISUAL_GUIDE_LABEL}</span></div>
                <div className="flex-1 h-full"><VisualContent /></div>
              </div>
              <div className="mt-8 flex justify-end"><span className="text-[12px] font-bold text-slate-300 uppercase tracking-widest">{CONFIG.DOC.PAGE_LABEL} 01</span></div>
            </div>

            {/* PAGE 2 (Steps) */}
            <div className="w-[148.5mm] h-full p-12 flex flex-col">
              <div className="border-b-4 border-[#061E30] pb-4 mb-6">
                <h3 className="text-[#061E30] font-black text-xs uppercase tracking-[3px] mb-1">{CONFIG.DOC.HEADER_TYPE}</h3>
                <h2 className="text-[#061E30] font-bold text-3xl uppercase tracking-tighter">{sopTitle}</h2>
              </div>
              <div className="flex-1 space-y-6">
                {steps.map((step) => (
                  <div key={step.id} className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#061E30] text-white flex items-center justify-center font-black text-2xl rounded-xl shadow-lg">{step.stepNumber}</div>
                    <div className="flex-1 pt-1 border-b border-slate-50 pb-4">
                      <h4 className="text-[#061E30] font-black text-xl uppercase tracking-tight mb-2">{step.title || 'Step Title'}</h4>
                      <p className="text-slate-600 text-[16px] leading-relaxed">{step.detail || 'Step details...'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-8 flex justify-end border-t-2 border-slate-100"><span className="text-[12px] font-bold text-slate-300 uppercase tracking-widest">{CONFIG.DOC.PAGE_LABEL} 02</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}