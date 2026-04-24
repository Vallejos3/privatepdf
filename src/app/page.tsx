"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { mergePDFs, splitPdf, rotatePdf, watermarkPdf, optimizePdf, getPageCount, parsePageRange, loadPdfSafe, splitPdfAsZip } from '@/lib/pdf';
import { PDFDocument } from 'pdf-lib';

type Tool = 'merge' | 'split' | 'rotate' | 'watermark' | 'optimize';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [tool, setTool] = useState<Tool>('merge');
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<string | null>(null);
  const [splitWarning, setSplitWarning] = useState<string>('');
  const [pageRange, setPageRange] = useState<string>('');
  const [rotation, setRotation] = useState<number>(90);
  const [watermarkText, setWatermarkText] = useState<string>('DRAFT');
  const [splitZipBlob, setSplitZipBlob] = useState<Blob | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (tool === 'merge') {
      setFiles(prev => [...prev, ...acceptedFiles]);
    } else {
      setFiles(acceptedFiles.slice(0, 1));
    }
    setStatus('');
  }, [tool]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: tool === 'merge',
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (dragIndex !== dropIndex) {
      const newFiles = [...files];
      const [removed] = newFiles.splice(dragIndex, 1);
      newFiles.splice(dropIndex, 0, removed);
      setFiles(newFiles);
    }
  };

  const processPDF = async () => {
    if (files.length === 0) {
      setStatus('Please select PDF files.');
      return;
    }
    if (tool === 'merge' && files.length < 2) {
      setStatus('Please select at least 2 PDF files for merging.');
      return;
    }
    if (tool !== 'merge' && files.length !== 1) {
      setStatus('Please select exactly 1 PDF file.');
      return;
    }
    setStatus('');
    setProgress('Processing...');
    try {
      let result: Uint8Array | Blob;
      if (tool === 'split') {
        if (!pageRange) {
          setProgress(null);
          setStatus('Please enter page range.');
          return;
        }
        const pageCount = await getPageCount(files[0]);
        const requestedPages = parsePageRange(pageRange);
        const validPages = requestedPages.filter(page => page >= 1 && page <= pageCount);
        const outOfRange = requestedPages.filter(page => page < 1 || page > pageCount);
        if (validPages.length === 0) {
          setProgress(null);
          setStatus(`Page range does not match any pages. Use 1-${pageCount}.`);
          return;
        }
        setSplitWarning(outOfRange.length > 0 ? `Skipped pages outside 1-${pageCount}.` : '');
        
        // Use ZIP for multiple pages, single file for single page
        if (validPages.length > 1) {
          const zipBlob = await splitPdfAsZip(files[0], pageRange);
          setSplitZipBlob(zipBlob);
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `split_${Date.now()}.zip`;
          a.click();
          URL.revokeObjectURL(url);
          setProgress(null);
          setStatus(`Downloaded ${validPages.length} pages as ZIP.`);
          return;
        } else {
          result = await splitPdf(files[0], pageRange);
        }
      } else {
        setSplitWarning('');
        switch (tool) {
          case 'merge':
            let totalPages = 0;
            for (const file of files) {
              totalPages += await getPageCount(file);
            }
            let currentPage = 0;
            const mergedPdf = await PDFDocument.create();
            for (const file of files) {
              const pdf = await loadPdfSafe(file);
              const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
              pages.forEach(page => mergedPdf.addPage(page));
              currentPage += pages.length;
              setProgress(`Processing page ${currentPage} of ${totalPages}`);
            }
            result = mergedPdf.save();
            break;
          case 'rotate':
            result = await rotatePdf(files[0], rotation);
            break;
          case 'watermark':
            if (!watermarkText) {
              setProgress(null);
              setStatus('Please enter watermark text.');
              return;
            }
            result = await watermarkPdf(files[0], watermarkText);
            break;
          case 'optimize':
            result = await optimizePdf(files[0]);
            break;
          default:
            throw new Error('Unknown tool');
        }
      }
      const blob = result instanceof Blob ? result : new Blob([new Uint8Array(result)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `output_${tool}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setProgress(null);
      setStatus('Download started.');
    } catch (error) {
      setProgress(null);
      setStatus(error instanceof Error ? error.message : 'An error occurred.');
    }
  };

  const formatFileSize = (size: number) => {
    return (size / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <main className="max-w-4xl mx-auto bg-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">PDF Tool</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Tool:</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {(['merge', 'split', 'rotate', 'watermark', 'optimize'] as Tool[]).map(t => (
              <button
                key={t}
                onClick={() => {
                  setTool(t);
                  setFiles([]);
                  setStatus('');
                }}
                className={`relative px-3 py-2 rounded text-sm font-medium transition ${
                  tool === t 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {files.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {files.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {tool === 'split' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Page Range (e.g., 1-3, 5):</label>
            <input
              type="text"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              className="border rounded p-2 w-full"
              placeholder="1-3, 5"
            />
            {splitWarning && (
              <p className="mt-2 text-sm text-orange-600">{splitWarning}</p>
            )}
          </div>
        )}

        {tool === 'rotate' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Rotation (degrees):</label>
            <select
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="border rounded p-2"
            >
              <option value={90}>90°</option>
              <option value={180}>180°</option>
              <option value={270}>270°</option>
            </select>
          </div>
        )}

        {tool === 'watermark' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Watermark Text:</label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>
        )}

        <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 cursor-pointer">
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the PDF files here...</p>
          ) : (
            <p>Drag 'n' drop PDF files here, or click to select files</p>
          )}
        </div>

        {files.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Files:</h2>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={index}
                  draggable={tool === 'merge'}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex justify-between items-center p-2 border rounded ${tool === 'merge' ? 'cursor-move' : ''}`}
                >
                  <span>{file.name} <span className="text-sm text-gray-500">({formatFileSize(file.size)})</span></span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={processPDF}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Process PDF
        </button>

        {splitZipBlob && tool === 'split' && (
          <button
            onClick={() => {
              const url = URL.createObjectURL(splitZipBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `split_pages_${Date.now()}.zip`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="ml-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Download All as ZIP
          </button>
        )}

        {progress && (
          <div className="mt-4 p-2 bg-blue-100 rounded flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            {progress}
          </div>
        )}

        {status && (
          <div className="mt-4 p-2 bg-gray-200 rounded">
            {status}
          </div>
        )}
      </main>
    </div>
  );
}
