# 💰 AI Tax Saver & Regime Suggestion Assistant

An intelligent financial assistant that automates tax planning for Indian salaried employees. It parses **Form 16 PDFs** using multimodal AI, calculates taxes under both Old & New Regimes instantly, and provides personalized AI-driven tax-saving advice.

## 🚀 Key Features

*   **📄 Smart Form 16 Parsing**: Upload your Form 16 PDF or image. The system uses **Gemini 1.5 Pro** with a custom "Chain of Verification" technique to accurately extract salary, HRA, and deduction details from complex tables.
*   **🧮 Instant Regime Comparison**: Automatically calculates tax liability for **FY 2023-24 (AY 2024-25)** under both Old and New Tax Regimes.
*   **🤖 AI Financial Advisor**: Generates personalized tax-saving strategies based on your unique financial profile (Age, Metro city status, existing investments).
*   **🔒 Privacy First**: Documents are processed in memory and never stored on disk.

---

## 🏗️ Architecture & How It Works

This project is built on a **Hybrid AI + Deterministic Logic** architecture. It combines the creativity of Large Language Models (LLMs) with the precision of code-based mathematics.

### 1. The Parsing Engine (Vision-First)
Unlike traditional OCR (which fails on complex tables), we use a **Multimodal Vision Approach**:
1.  **Input**: User performs a Drag & Drop of Form 16 (PDF/Image).
2.  **Vision Analysis**: The file is sent to `Gemini 1.5 Pro` (Vision Model).
3.  **Anchored Prompting**: The model searches for specific text anchors (e.g., "Section 10(13A)") rather than guessing locations.
4.  **Chain of Verification**: The model extracts data using a JSON structure that requires "evidence". It must cite the text it found next to the number (e.g., value: `50000`, evidence: `"Found row 'Standard Deduction'"`). This practically eliminates hallucinations.

### 2. The Tax Engine (Deterministic)
We do **not** use AI for tax math (as LLMs are bad at arithmetic).
*   **Logic**: A pure TypeScript utility (`taxCalculator.ts`) handles all Indian Income Tax logic (Slabs, Surcharge, Cess, Rebate u/s 87A).
*   **Validation**: Inputs from the parsing engine are sanitized and fed into this math engine to get 100% accurate tax liabilities.

### 3. The Advisory Engine (RAG-Lite)
*   **Context Injection**: The calculated tax breakdown and the user's raw inputs are injected into a prompt.
*   **Generation**: `Gemini 2.0 Flash` (or similar) acts as a financial planner to suggest untapped 80C, 80D, or NPS opportunities tailored to the user's age and income level.

---

## 🛠️ Tech Stack

### Core
*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS v4

### Artificial Intelligence
*   **Model Provider**: Google Generative AI (Gemini)
*   **SDK**: `@google/generative-ai`
*   **Models Used**:
    *   `gemini-1.5-pro` (For high-accuracy PDF/Image parsing)
    *   `gemini-2.0-flash` (For fast text advisory explanation)

### State & Parsing
*   **State Management**: React Hooks
*   **Markdown**: `react-markdown` (for rendering AI advice)
*   **Drag & Drop**: `react-dropzone`

---

## 🏃‍♂️ Getting Started

### Prerequisites
*   Node.js 18+ installed.
*   A Google Gemini API Key (Get it from [Google AI Studio](https://aistudio.google.com/)).

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Mounesh-13/tax-saving-and-regime-suggestion-ai.git
    cd tax-saving-and-regime-suggestion-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env.local` file in the root directory:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Run the Server**
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) to start saving taxes!

---

## 🛡️ License

This project is open-source. Feel free to use it for personal tax planning or learning purposes.
