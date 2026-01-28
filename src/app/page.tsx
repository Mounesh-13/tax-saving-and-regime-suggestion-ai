'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import { TaxResults } from './utils/taxCalculator';
import { ParsedForm16Data, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from './utils/documentParser';

// --- Components ---

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  placeholder?: string;
  highlighted?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  highlighted = false,
}) => (
  <div className="flex flex-col space-y-2 group">
    <label htmlFor={id} className="text-sm font-bold text-[#19183B]/80 transition-colors group-hover:text-[#19183B]">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full rounded-2xl bg-white border-2 px-4 py-3 text-[#19183B] font-medium 
      focus:outline-none focus:ring-0 focus:border-[#708993] focus:shadow-[4px_4px_0px_0px_rgba(112,137,147,0.3)] 
      transition-all duration-300 placeholder-[#708993]/50
      ${highlighted
          ? 'border-[#A1C2BD] bg-[#E7F2EF] ring-2 ring-[#A1C2BD]/50 animate-pulse'
          : 'border-[#A1C2BD]/40 hover:border-[#708993]'
        }`}
    />
  </div>
);

// Document upload component
interface DocumentUploadProps {
  onDataExtracted: (data: ParsedForm16Data) => void;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onDataExtracted,
  isUploading,
  setIsUploading,
}) => {
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setUploadStatus({
          type: 'error',
          message: '🚫 Oops! Only PDF, JPG, PNG, or WebP allowed.',
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadStatus({
          type: 'error',
          message: '🐘 File is too big! Max 10MB please.',
        });
        return;
      }

      setIsUploading(true);
      setUploadStatus({ type: 'info', message: '✨ Analyzing your Form 16 magic...' });

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/parse-document', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success && result.data) {
          onDataExtracted(result.data);
          setUploadStatus({
            type: 'success',
            message: `🎉 Information extracted from ${result.fileName}! Check below.`,
          });
        } else {
          setUploadStatus({
            type: 'error',
            message: result.error || '🤕 Couldn\'t read that file clearly.',
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploadStatus({
          type: 'error',
          message: '💥 Network glitch! Please try again.',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onDataExtracted, setIsUploading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative border-3 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 transform
          ${isDragActive
            ? 'border-[#708993] bg-[#A1C2BD]/20 scale-102 rotate-1'
            : isUploading
              ? 'border-[#A1C2BD] bg-[#E7F2EF] cursor-wait opacity-75'
              : 'border-[#A1C2BD] bg-white hover:border-[#708993] hover:bg-[#E7F2EF]/50 hover:-translate-y-1 hover:shadow-lg'
          }`}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-bounce text-4xl">🤖</div>
            <p className="text-[#19183B] font-medium">Crunching the numbers...</p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="text-5xl animate-pulse">📂</div>
            <p className="text-[#19183B] font-bold text-lg">Drop it right here!</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 bg-[#E7F2EF] rounded-2xl shadow-sm border-2 border-[#A1C2BD]/30 mb-2">
              <svg className="w-10 h-10 text-[#708993]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-[#19183B] font-bold text-lg">Upload Form 16</h3>
            <p className="text-[#708993] text-sm max-w-xs">
              Drag & drop your PDF or Image to auto-fill the boring stuff!
            </p>
          </div>
        )}
      </div>

      {/* Status message */}
      {uploadStatus.type && (
        <div
          className={`px-4 py-3 rounded-2xl text-sm font-medium border-l-4 flex items-center gap-2 animate-in slide-in-from-top-2 fade-in
            ${uploadStatus.type === 'success'
              ? 'bg-white text-[#19183B] border-[#A1C2BD]'
              : uploadStatus.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-400'
                : 'bg-blue-50 text-blue-700 border-blue-400'
            }`}
        >
          <span>{uploadStatus.type === 'success' ? '✅' : uploadStatus.type === 'error' ? '❌' : 'ℹ️'}</span>
          {uploadStatus.message}
        </div>
      )}
    </div>
  );
};

export default function Page() {
  // Form states
  const [age, setAge] = useState<'below60' | '60to80' | 'above80'>('below60');
  const [grossSalary, setGrossSalary] = useState('');
  const [deduction80c, setDeduction80c] = useState('');
  const [deduction80d, setDeduction80d] = useState('');
  const [npsContribution, setNpsContribution] = useState('');
  const [homeLoanInterest, setHomeLoanInterest] = useState('');
  const [deduction80tta, setDeduction80tta] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [hraReceived, setHraReceived] = useState('');
  const [rentPaid, setRentPaid] = useState('');
  const [livesInMetro, setLivesInMetro] = useState(false);

  const [results, setResults] = useState<TaxResults | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Track which fields were auto-filled (for visual highlighting)
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  // Handle extracted data from Form 16
  const handleDataExtracted = (data: ParsedForm16Data) => {
    const newAutoFilled = new Set<string>();

    const setField = (val: number | null, setter: (v: string) => void, name: string) => {
      if (val !== null) {
        setter(val.toString());
        newAutoFilled.add(name);
      }
    }

    setField(data.grossSalary, setGrossSalary, 'grossSalary');
    setField(data.basicSalary, setBasicSalary, 'basicSalary');
    setField(data.hraReceived, setHraReceived, 'hraReceived');
    setField(data.rentPaid, setRentPaid, 'rentPaid');
    setField(data.deduction80c, setDeduction80c, 'deduction80c');
    setField(data.deduction80d, setDeduction80d, 'deduction80d');
    setField(data.npsContribution, setNpsContribution, 'npsContribution');
    setField(data.homeLoanInterest, setHomeLoanInterest, 'homeLoanInterest');
    setField(data.deduction80tta, setDeduction80tta, 'deduction80tta');

    setAutoFilledFields(newAutoFilled);

    // Clear highlighting after 3 seconds
    setTimeout(() => {
      setAutoFilledFields(new Set());
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAdvice(null);
    setResults(null);

    const inputs = {
      age,
      grossSalary: Number(grossSalary) || 0,
      deduction80c: Number(deduction80c) || 0,
      deduction80d: Number(deduction80d) || 0,
      npsContribution: Number(npsContribution) || 0,
      homeLoanInterest: Number(homeLoanInterest) || 0,
      deduction80tta: Number(deduction80tta) || 0,
      basicSalary: Number(basicSalary) || 0,
      hraReceived: Number(hraReceived) || 0,
      rentPaid: Number(rentPaid) || 0,
      livesInMetro,
    };

    try {
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        setAdvice(data.advice);
      }
    } catch (err) {
      console.error('Error fetching advice', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#19183B] text-[#E7F2EF] p-4 sm:p-8 font-sans selection:bg-[#708993] selection:text-white">

      {/* Decorative blobs - using theme colors */}
      <div className="fixed top-0 left-0 w-64 h-64 bg-[#708993] rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
      <div className="fixed top-0 right-0 w-64 h-64 bg-[#A1C2BD] rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="fixed -bottom-8 left-20 w-64 h-64 bg-[#708993] rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header className="text-center space-y-4 py-8">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#E7F2EF]/10 border border-[#E7F2EF]/20 shadow-sm text-xs font-bold tracking-wider text-[#A1C2BD] uppercase mb-2 backdrop-blur-md">
            FY 2023-24 • AY 2024-25
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-[#E7F2EF] tracking-tight leading-tight">
            Tax Saver <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A1C2BD] to-[#708993]">AI</span> 💸
          </h1>
          <p className="text-[#A1C2BD] text-lg font-medium max-w-xl mx-auto">
            Your friendly neighborhood tax assistant. Upload your Form 16 or type it in,
            and let's save you some money!
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Upload */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#E7F2EF] rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(112,137,147,0.4)] border-2 border-[#19183B]/10 p-6 sm:p-8 sticky top-8">
              <h2 className="text-xl font-bold text-[#19183B] mb-6 flex items-center gap-2">
                <span className="text-2xl">⚡</span> Quick Start
              </h2>
              <DocumentUpload
                onDataExtracted={handleDataExtracted}
                isUploading={isUploading}
                setIsUploading={setIsUploading}
              />
              <div className="mt-8 pt-6 border-t border-[#19183B]/10">
                <p className="text-xs text-[#708993] leading-relaxed text-center">
                  <strong>Privacy Note:</strong> We process your files in real-time memory.
                  Nothing is stored. Your secrets are safe with us! 🔒
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Manual Entry & Results */}
          <div className="lg:col-span-7 space-y-8">

            {/* Manual Form */}
            <form
              onSubmit={handleSubmit}
              className="bg-[#E7F2EF] rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(112,137,147,0.4)] border-2 border-[#19183B]/10 p-6 sm:p-8 space-y-8 relative overflow-hidden"
            >
              {/* Decorative bar */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#19183B] via-[#708993] to-[#A1C2BD]"></div>

              <div className="space-y-6">
                <h2 className="text-xl font-bold text-[#19183B] flex items-center gap-2">
                  <span className="text-2xl">📝</span> The Details
                </h2>

                {/* Basic Info */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-[#19183B] block">How young are you?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { val: 'below60', label: 'Below 60', emoji: '🧑' },
                      { val: '60to80', label: '60 - 80', emoji: '👴' },
                      { val: 'above80', label: '80+', emoji: '🦾' }
                    ].map((opt) => (
                      <label key={opt.val} className="cursor-pointer relative">
                        <input
                          type="radio"
                          name="age"
                          value={opt.val}
                          checked={age === opt.val}
                          onChange={(e: any) => setAge(e.target.value)}
                          className="peer sr-only"
                        />
                        <div className="rounded-2xl border-2 border-[#A1C2BD]/30 bg-white p-3 text-center transition-all peer-checked:border-[#19183B] peer-checked:bg-[#19183B] peer-checked:text-white font-bold text-sm hover:bg-[#A1C2BD]/10 hover:shadow-md text-[#19183B]">
                          <div className="text-2xl mb-1">{opt.emoji}</div>
                          {opt.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Income */}
                <div className="p-4 bg-[#708993]/10 rounded-2xl border border-[#708993]/20 space-y-4">
                  <h3 className="font-bold text-[#708993] text-sm uppercase tracking-wide">💰 Income</h3>
                  <InputField id="grossSalary" label="Gross Annual Salary (₹)" type="number" value={grossSalary} onChange={(e) => setGrossSalary(e.target.value)} placeholder="0" highlighted={autoFilledFields.has('grossSalary')} />
                  <p className="text-xs text-[#708993] font-medium">Standard Deduction of ₹50k is on us!</p>
                </div>

                {/* Deductions */}
                <div className="p-4 bg-[#A1C2BD]/20 rounded-2xl border border-[#A1C2BD]/40 space-y-4">
                  <h3 className="font-bold text-[#19183B] text-sm uppercase tracking-wide">🛡️ Tax Shields (Deductions)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField id="deduction80c" label="Sec 80C (LIC, PPF...)" type="number" value={deduction80c} onChange={(e) => setDeduction80c(e.target.value)} placeholder="Max 1.5L" highlighted={autoFilledFields.has('deduction80c')} />
                    <InputField id="deduction80d" label="Sec 80D (Health Ins.)" type="number" value={deduction80d} onChange={(e) => setDeduction80d(e.target.value)} placeholder="0" highlighted={autoFilledFields.has('deduction80d')} />
                    <InputField id="npsContribution" label="NPS (80CCD 1B)" type="number" value={npsContribution} onChange={(e) => setNpsContribution(e.target.value)} placeholder="Max 50k" highlighted={autoFilledFields.has('npsContribution')} />
                    <InputField id="homeLoanInterest" label="Home Loan Int. (24b)" type="number" value={homeLoanInterest} onChange={(e) => setHomeLoanInterest(e.target.value)} placeholder="Max 2L" highlighted={autoFilledFields.has('homeLoanInterest')} />
                  </div>
                </div>

                {/* HRA */}
                <div className="p-4 bg-[#19183B]/5 rounded-2xl border border-[#19183B]/10 space-y-4">
                  <h3 className="font-bold text-[#19183B] text-sm uppercase tracking-wide">🏠 House Rent</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField id="basicSalary" label="Basic Salary (Yearly)" type="number" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} placeholder="0" highlighted={autoFilledFields.has('basicSalary')} />
                    <InputField id="hraReceived" label="HRA Received" type="number" value={hraReceived} onChange={(e) => setHraReceived(e.target.value)} placeholder="0" highlighted={autoFilledFields.has('hraReceived')} />
                    <InputField id="rentPaid" label="Rent Paid" type="number" value={rentPaid} onChange={(e) => setRentPaid(e.target.value)} placeholder="0" highlighted={autoFilledFields.has('rentPaid')} />

                    <div className="flex items-end pb-3">
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className="relative">
                          <input type="checkbox" checked={livesInMetro} onChange={(e) => setLivesInMetro(e.target.checked)} className="sr-only peer" />
                          <div className="w-12 h-7 bg-[#A1C2BD]/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#19183B] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#19183B]"></div>
                        </div>
                        <span className="text-sm font-bold text-[#19183B] group-hover:text-[#708993] transition-colors">Metro City? (Delhi/Mum/Kol/Chn)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || isUploading}
                  className="w-full group relative flex items-center justify-center gap-3 bg-[#19183B] hover:bg-[#708993] text-white font-bold text-lg py-4 px-8 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 hover:shadow-2xl disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  <span>{loading ? 'Crunching Numbers...' : 'Calculate My Tax!'}</span>
                  {!loading && <span className="group-hover:translate-x-1 transition-transform">🚀</span>}
                </button>
                {loading && <p className="text-center text-xs text-[#708993] mt-2 animate-pulse">Consulting the AI Tax Oracle...</p>}
              </div>
            </form>

            {/* Results Section */}
            {(results || advice) && (
              <div id="results" className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
                {results && (
                  <div className="bg-[#E7F2EF] rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(112,137,147,0.4)] border-2 border-[#A1C2BD]/50 p-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 font-black text-9xl text-[#19183B] select-none">₹</div>
                    <h2 className="text-2xl font-black text-[#19183B] mb-6">The Verdict 🥁</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className={`p-6 rounded-2xl border-2 transition-all ${results.recommendedRegime === 'old' ? 'bg-white border-[#19183B] shadow-md transform scale-105 ring-2 ring-[#708993]' : 'bg-[#708993]/10 border-[#708993]/20 opacity-70 grayscale'}`}>
                        <div className="text-xs uppercase font-bold text-[#708993] mb-1">Old Regime</div>
                        <div className="text-2xl font-black text-[#19183B]">₹{results.oldRegimeTax.toLocaleString()}</div>
                        {results.recommendedRegime === 'old' && <div className="mt-2 inline-block px-2 py-1 bg-[#19183B] text-white text-xs font-bold rounded">🎉 Best Option</div>}
                      </div>
                      <div className={`p-6 rounded-2xl border-2 transition-all ${results.recommendedRegime === 'new' ? 'bg-white border-[#19183B] shadow-md transform scale-105 ring-2 ring-[#708993]' : 'bg-[#708993]/10 border-[#708993]/20 opacity-70 grayscale'}`}>
                        <div className="text-xs uppercase font-bold text-[#708993] mb-1">New Regime</div>
                        <div className="text-2xl font-black text-[#19183B]">₹{results.newRegimeTax.toLocaleString()}</div>
                        {results.recommendedRegime === 'new' && <div className="mt-2 inline-block px-2 py-1 bg-[#19183B] text-white text-xs font-bold rounded">🎉 Best Option</div>}
                      </div>
                    </div>
                    <div className="bg-[#19183B] text-white p-4 rounded-xl text-center">
                      <p className="text-lg">
                        You save <span className="font-bold text-[#A1C2BD]">₹{results.savings.toLocaleString()}</span> by choosing the
                        <strong className="uppercase ml-1 text-[#A1C2BD]">{results.recommendedRegime} Regime</strong>!
                      </p>
                    </div>
                  </div>
                )}

                {advice && (
                  <div className="bg-[#E7F2EF] rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(112,137,147,0.4)] border-2 border-[#708993]/30 p-8 relative">
                    <div className="absolute -top-6 -left-2 text-6xl transform -rotate-12 filter drop-shadow-lg">🧙‍♂️</div>
                    <h2 className="text-2xl font-black text-[#19183B] mb-6 pl-12">AI Tax Whisperer says...</h2>
                    <div className="prose prose-stone prose-lg max-w-none text-[#19183B]">
                      <ReactMarkdown
                        components={{
                          h3: (props: any) => <h3 className="text-lg font-bold text-[#19183B] mt-6 mb-2 flex items-center gap-2" {...props} />,
                          ul: (props: any) => <ul className="space-y-3 mb-6" {...props} />,
                          li: (props: any) => <li className="flex items-start gap-2 bg-white/50 p-3 rounded-lg border border-[#A1C2BD] text-sm" {...props} />,
                          p: (props: any) => <p className="leading-relaxed mb-4 text-[#19183B]/80" {...props} />,
                          strong: (props: any) => <strong className="font-bold text-[#19183B] bg-[#A1C2BD]/30 px-1 rounded" {...props} />,
                        }}
                      >
                        {advice}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
