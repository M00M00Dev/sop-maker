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
  History
} from 'lucide-react';

interface Step {
  id: number;
  stepNumber: string;
  title: string;
  detail: string;
}

// Data Structure Versioning
const DATA_VERSION = "1.0";

declare global {
  interface Window {
    htmlToImage: any;
  }
}

const CONFIG = {
  SIDEBAR: {
    APP_NAME: "SOP Builder",
    SECTION_1_LABEL: "1. Procedure Title",
    SECTION_2_LABEL: "2. Visual Reference",
    SECTION_3_LABEL: "3. Procedure Steps",
    TITLE_PLACEHOLDER: "e.g. Daily Prep: Jasmine Rice",
    UPLOAD_PROMPT: "Click to upload photo",
    CHANGE_IMAGE: "Change Image",
    ADD_STEP_BTN: "Add New Step",
    DOWNLOAD_BTN: "Download Image",
    EXPORT_BTN: "Export Data (.json)",
    IMPORT_BTN: "Import Data",
    GENERATING_TEXT: "Generating...",
    STEP_TITLE_PLACEHOLDER: "Step Title",
    STEP_DETAIL_PLACEHOLDER: "Provide specific instructions...",
  },
  DOC: {
    HEADER_TYPE: "Standard Operating Procedure",
    VISUAL_GUIDE_LABEL: "Visual Guide",
    PAGE_LABEL: "Page",
    IMAGE_REQUIRED_LABEL: "Image Required",
    DEFAULT_STEP_TITLE: "Step Title",
    DEFAULT_STEP_DETAIL: "Detailed instructions for this step..."
  },
  INITIAL_DATA: {
    SOP_TITLE: 'Daily Prep: Jasmine Rice',
    STEPS: [
      { id: 1, stepNumber: '1', title: 'Wash Rice', detail: 'Rinse rice 3 times until water runs clear.' },
      { id: 2, stepNumber: '2', title: 'Water Ratio', detail: 'Use 1:1.2 ratio for jasmine rice.' }
    ] as Step[]
  }
};

export default function App() {
  const [sopTitle, setSopTitle] = useState(CONFIG.INITIAL_DATA.SOP_TITLE);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>(CONFIG.INITIAL_DATA.STEPS);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // 1. AUTO-SAVE TEXT TO LOCAL STORAGE (Safe from 5MB limit)
  useEffect(() => {
    const saved = localStorage.getItem('sop_autosave_text');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSopTitle(parsed.title);
        setSteps(parsed.steps);
      } catch (e) { console.error("Failed to load autosave"); }
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('sop_autosave_text', JSON.stringify({ title: sopTitle, steps }));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [sopTitle, steps]);

  // Load html-to-image library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
    script.async = true;
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  // 2. EXPORT DATA FILE (.json)
  const handleExportData = () => {
    const dataToExport = {
      metadata: { version: DATA_VERSION, timestamp: new Date().toISOString() },
      content: { title: sopTitle, mainImage, steps }
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SOP_DATA_${sopTitle.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 3. IMPORT DATA FILE
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (window.confirm("This will replace your current work. Continue?")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (json.content) {
            setSopTitle(json.content.title);
            setMainImage(json.content.mainImage);
            setSteps(json.content.steps);
          }
        } catch (err) { setError("Invalid SOP file format."); }
      };
      reader.readAsText(file);
    }
    event.target.value = ""; // Reset input
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setMainImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addStep = () => {
    const lastStep = steps[steps.length - 1];
    const nextNum = lastStep ? (parseInt(lastStep.stepNumber) + 1).toString() : "1";
    setSteps([...steps, { id: Date.now(), stepNumber: isNaN(parseInt(nextNum)) ? "1" : nextNum, title: '', detail: '' }]);
  };

  const updateStep = (id: number, field: keyof Step, value: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeStep = (id: number) => {
    setSteps(steps.filter(s => s.id !== id));
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
    } catch (err) { setError("Failed to generate image."); }
    finally { setIsDownloading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col lg:flex-row font-sans">
      <div className="w-full lg:w-[450px] bg-white border-r border-slate-200 p-8 overflow-y-auto h-screen shadow-xl z-20 no-print">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#061E30] rounded-lg text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#061E30]">{CONFIG.SIDEBAR.APP_NAME}</h1>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
              <History className="w-3 h-3" /> {lastSaved}
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Section 1: Data Management */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleExportData}
              className="flex items-center justify-center gap-2 py-2 px-3 border-2 border-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:border-[#061E30] hover:text-[#061E30] transition-all"
            >
              <Save className="w-3 h-3" /> {CONFIG.SIDEBAR.EXPORT_BTN}
            </button>
            <button 
              onClick={() => importInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-2 px-3 border-2 border-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:border-[#061E30] hover:text-[#061E30] transition-all"
            >
              <FileUp className="w-3 h-3" /> {CONFIG.SIDEBAR.IMPORT_BTN}
            </button>
            <input type="file" ref={importInputRef} onChange={handleImportData} className="hidden" accept=".json" />
          </div>

          <section className="space-y-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] block">
              {CONFIG.SIDEBAR.SECTION_1_LABEL}
            </label>
            <input 
              type="text" 
              value={sopTitle}
              onChange={(e) => setSopTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#061E30] outline-none font-bold text-[#061E30] text-lg transition-all"
            />
          </section>

          <section>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-3 block">
              {CONFIG.SIDEBAR.SECTION_2_LABEL}
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer relative h-40 w-full border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden hover:border-[#061E30] transition-colors bg-slate-50"
            >
              {mainImage ? (
                <>
                  <img src={mainImage} className="w-full h-full object-cover" alt="SOP Visual" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase">{CONFIG.SIDEBAR.CHANGE_IMAGE}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{CONFIG.SIDEBAR.UPLOAD_PROMPT}</span>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </section>

          <section>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-4 block">
              {CONFIG.SIDEBAR.SECTION_3_LABEL}
            </label>
            <div className="space-y-4 mb-6">
              {steps.map((step) => (
                <div key={step.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 group relative transition-all hover:shadow-md">
                  <button 
                    onClick={() => removeStep(step.id)}
                    className="absolute -right-2 -top-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex gap-3 mb-2">
                    <input 
                      type="text"
                      value={step.stepNumber}
                      onChange={(e) => updateStep(step.id, 'stepNumber', e.target.value)}
                      className="w-10 h-8 text-center bg-white border border-slate-200 rounded-md font-black text-[#061E30] text-sm focus:ring-1 focus:ring-[#061E30] outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder={CONFIG.SIDEBAR.STEP_TITLE_PLACEHOLDER} 
                      value={step.title}
                      onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 font-bold text-[#061E30] p-0 placeholder:text-slate-300"
                    />
                  </div>
                  <textarea 
                    placeholder={CONFIG.SIDEBAR.STEP_DETAIL_PLACEHOLDER}
                    value={step.detail}
                    onChange={(e) => updateStep(step.id, 'detail', e.target.value)}
                    rows={2}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-500 p-0 resize-none leading-relaxed"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={addStep} 
              className="w-full py-4 bg-[#061E30] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" strokeWidth={3} /> {CONFIG.SIDEBAR.ADD_STEP_BTN}
            </button>
          </section>

          <div className="pt-6 border-t border-slate-100">
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloading ? CONFIG.SIDEBAR.GENERATING_TEXT : CONFIG.SIDEBAR.DOWNLOAD_BTN}
            </button>
          </div>
          
          {error && <div className="p-3 bg-red-50 text-red-500 text-xs rounded-lg font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>}
        </div>
      </div>

      <div className="flex-1 p-8 lg:p-12 overflow-auto flex items-start justify-center bg-slate-300 min-h-screen">
        <div className="shadow-2xl h-fit">
          <div 
            ref={previewRef}
            className="flex bg-white origin-top-center"
            style={{ width: '297mm', height: '210mm', transform: 'scale(0.5)', flexShrink: 0 }}
          >
            {/* LEFT PAGE */}
            <div className="w-[148.5mm] h-full border-r-2 border-slate-100 p-12 flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between border-b-4 border-[#061E30] pb-4 mb-6">
                <div>
                  <h3 className="text-[#061E30] font-black text-xs uppercase tracking-[3px] mb-1">{CONFIG.DOC.HEADER_TYPE}</h3>
                  <h2 className="text-[#061E30] font-bold text-3xl uppercase tracking-tighter">{sopTitle || 'Untitled'}</h2>
                </div>
              </div>
              <div className="flex-1 flex flex-col rounded-xl overflow-hidden border-[6px] border-[#061E30]">
                 <div className="bg-[#061E30] text-white px-6 py-3 flex items-center gap-3">
                   <ImageIcon className="w-5 h-5" />
                   <span className="text-[12px] font-black uppercase tracking-[3px]">{CONFIG.DOC.VISUAL_GUIDE_LABEL}</span>
                 </div>
                 <div className="flex-1 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {mainImage ? <img src={mainImage} className="w-full h-full object-cover" alt="Preview" /> : <div className="text-center opacity-20"><ImageIcon className="w-20 h-20 mx-auto mb-4" /><span className="font-black uppercase tracking-widest text-xl">{CONFIG.DOC.IMAGE_REQUIRED_LABEL}</span></div>}
                 </div>
              </div>
              <div className="mt-8 flex items-center justify-end"><span className="text-[12px] font-bold text-slate-300 uppercase tracking-widest">{CONFIG.DOC.PAGE_LABEL} 01</span></div>
            </div>

            {/* RIGHT PAGE */}
            <div className="w-[148.5mm] h-full p-12 flex flex-col bg-white">
              <div className="flex items-center justify-between border-b-4 border-[#061E30] pb-4 mb-6">
                <div>
                  <h3 className="text-[#061E30] font-black text-xs uppercase tracking-[3px] mb-1">{CONFIG.DOC.HEADER_TYPE}</h3>
                  <h2 className="text-[#061E30] font-bold text-3xl uppercase tracking-tighter">{sopTitle || 'Untitled'}</h2>
                </div>
              </div>
              <div className="flex-1 space-y-8">
                {steps.map((step) => (
                  <div key={step.id} className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#061E30] text-white flex items-center justify-center font-black text-2xl rounded-xl shadow-lg">
                      <span className={step.stepNumber.length > 2 ? "text-lg" : "text-2xl"}>{step.stepNumber || "•"}</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="text-[#061E30] font-black text-xl uppercase tracking-tight leading-none mb-3">{step.title || CONFIG.DOC.DEFAULT_STEP_TITLE}</h4>
                      <p className="text-slate-600 text-[16px] leading-relaxed max-w-[95%]">{step.detail || CONFIG.DOC.DEFAULT_STEP_DETAIL}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-8 flex items-center justify-end border-t-2 border-slate-100"><span className="text-[12px] font-bold text-slate-300 uppercase tracking-widest">{CONFIG.DOC.PAGE_LABEL} 02</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}