'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { TaxResults } from './utils/taxCalculator';
import { ParsedForm16Data, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from './utils/documentParser';

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
  <div className="flex flex-col space-y-1">
    <label htmlFor={id} className="text-sm font-medium text-gray-300">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full rounded-md bg-neutral-800 border text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 transition-all duration-300 ${highlighted
          ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/20'
          : 'border-neutral-700'
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
          message: 'Invalid file type. Please upload PDF, JPG, PNG, or WebP.',
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadStatus({
          type: 'error',
          message: 'File too large. Maximum size is 10MB.',
        });
        return;
      }

      setIsUploading(true);
      setUploadStatus({ type: 'info', message: 'Analyzing Form 16 with AI...' });

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
            message: `✓ Extracted from ${result.fileName} (${result.confidence}% confidence)`,
          });
        } else {
          setUploadStatus({
            type: 'error',
            message: result.error || 'Failed to extract data from document.',
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploadStatus({
          type: 'error',
          message: 'Failed to upload document. Please try again.',
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
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${isDragActive
            ? 'border-indigo-500 bg-indigo-950/30'
            : isUploading
              ? 'border-neutral-600 bg-neutral-800/50 cursor-wait'
              : 'border-neutral-700 hover:border-indigo-500 hover:bg-neutral-800/50'
          }`}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
            <p className="text-gray-400 text-sm">Analyzing document...</p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center space-y-2">
            <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-indigo-400 font-medium">Drop your Form 16 here</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-300 font-medium">Upload Form 16</p>
            <p className="text-gray-500 text-sm">
              Drag & drop or click to upload PDF or image
            </p>
            <p className="text-gray-600 text-xs">
              Supported: PDF, JPG, PNG, WebP (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Status message */}
      {uploadStatus.type && (
        <div
          className={`px-4 py-2 rounded-lg text-sm ${uploadStatus.type === 'success'
              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800'
              : uploadStatus.type === 'error'
                ? 'bg-red-950/50 text-red-400 border border-red-800'
                : 'bg-indigo-950/50 text-indigo-400 border border-indigo-800'
            }`}
        >
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

    if (data.grossSalary !== null) {
      setGrossSalary(data.grossSalary.toString());
      newAutoFilled.add('grossSalary');
    }
    if (data.basicSalary !== null) {
      setBasicSalary(data.basicSalary.toString());
      newAutoFilled.add('basicSalary');
    }
    if (data.hraReceived !== null) {
      setHraReceived(data.hraReceived.toString());
      newAutoFilled.add('hraReceived');
    }
    if (data.rentPaid !== null) {
      setRentPaid(data.rentPaid.toString());
      newAutoFilled.add('rentPaid');
    }
    if (data.deduction80c !== null) {
      setDeduction80c(data.deduction80c.toString());
      newAutoFilled.add('deduction80c');
    }
    if (data.deduction80d !== null) {
      setDeduction80d(data.deduction80d.toString());
      newAutoFilled.add('deduction80d');
    }
    if (data.npsContribution !== null) {
      setNpsContribution(data.npsContribution.toString());
      newAutoFilled.add('npsContribution');
    }
    if (data.homeLoanInterest !== null) {
      setHomeLoanInterest(data.homeLoanInterest.toString());
      newAutoFilled.add('homeLoanInterest');
    }
    if (data.deduction80tta !== null) {
      setDeduction80tta(data.deduction80tta.toString());
      newAutoFilled.add('deduction80tta');
    }

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
    <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center p-4 font-light tracking-wide">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-semibold text-white">AI Tax Advisor</h1>
          <p className="text-gray-400 text-sm">
            Upload Form 16 or enter details manually to calculate tax & get AI advice.
          </p>
        </header>

        {/* Document Upload Section */}
        <div className="bg-neutral-900 rounded-2xl shadow-xl p-6 border border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Auto-Fill from Form 16
            </h2>
            <span className="text-xs text-gray-500 bg-neutral-800 px-2 py-1 rounded">
              Powered by Gemini AI
            </span>
          </div>
          <DocumentUpload
            onDataExtracted={handleDataExtracted}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-neutral-800"></div>
          <span className="text-gray-500 text-sm">or enter manually</span>
          <div className="flex-1 h-px bg-neutral-800"></div>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-900 rounded-2xl shadow-xl p-6 space-y-6 border border-neutral-800"
        >
          {/* Basic Info */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-medium text-gray-200">
              Basic Information
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label htmlFor="age" className="text-sm font-medium text-gray-300">
                  Age Group
                </label>
                <select
                  id="age"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value as 'below60' | '60to80' | 'above80')
                  }
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="below60">Below 60 years</option>
                  <option value="60to80">60 to 80 years (Senior Citizen)</option>
                  <option value="above80">Above 80 years (Super Senior Citizen)</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Income Details */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-medium text-gray-200">
              Income Details
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <InputField
                id="grossSalary"
                label="Gross Annual Salary"
                type="number"
                value={grossSalary}
                onChange={(e) => setGrossSalary(e.target.value)}
                placeholder="e.g., 1500000"
                highlighted={autoFilledFields.has('grossSalary')}
              />
              <p className="text-xs text-gray-500">
                Standard Deduction of ₹50,000 is auto-applied.
              </p>
            </div>
          </fieldset>

          {/* Common Deductions */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-medium text-gray-200">
              Common Deductions (Old Regime)
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField id="deduction80c" label="Section 80C" type="number" value={deduction80c} onChange={(e) => setDeduction80c(e.target.value)} placeholder="e.g., 150000" highlighted={autoFilledFields.has('deduction80c')} />
              <InputField id="deduction80d" label="Section 80D - Medical Insurance" type="number" value={deduction80d} onChange={(e) => setDeduction80d(e.target.value)} placeholder="e.g., 20000" highlighted={autoFilledFields.has('deduction80d')} />
              <InputField id="npsContribution" label="NPS Contribution 80CCD(1B)" type="number" value={npsContribution} onChange={(e) => setNpsContribution(e.target.value)} placeholder="e.g., 50000" highlighted={autoFilledFields.has('npsContribution')} />
              <InputField id="homeLoanInterest" label="Home Loan Interest - Sec 24(b)" type="number" value={homeLoanInterest} onChange={(e) => setHomeLoanInterest(e.target.value)} placeholder="e.g., 200000" highlighted={autoFilledFields.has('homeLoanInterest')} />
              <InputField id="deduction80tta" label="Interest from Savings - 80TTA/80TTB" type="number" value={deduction80tta} onChange={(e) => setDeduction80tta(e.target.value)} placeholder="e.g., 5000" highlighted={autoFilledFields.has('deduction80tta')} />
            </div>
          </fieldset>

          {/* HRA Exemption */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-medium text-gray-200">
              House Rent Allowance (HRA)
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField id="basicSalary" label="Annual Basic Salary" type="number" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} placeholder="e.g., 600000" highlighted={autoFilledFields.has('basicSalary')} />
              <InputField id="hraReceived" label="Total HRA Received" type="number" value={hraReceived} onChange={(e) => setHraReceived(e.target.value)} placeholder="e.g., 200000" highlighted={autoFilledFields.has('hraReceived')} />
              <InputField id="rentPaid" label="Total Rent Paid" type="number" value={rentPaid} onChange={(e) => setRentPaid(e.target.value)} placeholder="e.g., 240000" highlighted={autoFilledFields.has('rentPaid')} />
              <div className="flex items-center space-x-2">
                <input id="livesInMetro" type="checkbox" checked={livesInMetro} onChange={(e) => setLivesInMetro(e.target.checked)} className="h-4 w-4 rounded bg-neutral-800 border-neutral-700 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="livesInMetro" className="text-sm text-gray-300">
                  I live in a metro city
                </label>
              </div>
            </div>
          </fieldset>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row justify-end">
            <button
              type="submit"
              disabled={loading || isUploading}
              className="w-full sm:w-auto px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition disabled:opacity-50"
            >
              {loading ? 'Calculating...' : 'Calculate Tax'}
            </button>
          </div>
        </form>

        {/* Results */}
        {results && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">Results</h2>
            <p>Old Regime Tax: ₹{results.oldRegimeTax.toLocaleString()}</p>
            <p>New Regime Tax: ₹{results.newRegimeTax.toLocaleString()}</p>
            <p>Savings: ₹{results.savings.toLocaleString()}</p>
            <p>
              Recommended Regime:{' '}
              <span className="font-bold text-indigo-400">
                {results.recommendedRegime === 'old' ? 'Old Regime' : 'New Regime'}
              </span>
            </p>
          </div>
        )}

        {/* AI Advice */}
        {advice && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">AI Advice</h2>
            <p className="text-gray-300 whitespace-pre-line">{advice}</p>
          </div>
        )}
      </div>
    </div>
  );
}
