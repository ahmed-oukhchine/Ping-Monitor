import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function ImportModal({ onClose, onImported }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const handleUpload = () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResult(null);

        const form = new FormData();
        form.append('file', file);

        axios.post('/api/targets/import', form)
            .then(res => setResult(res.data))
            .catch(err => setError(err.response?.data?.message || 'Import failed'))
            .finally(() => setLoading(false));
    };

    const downloadTemplate = () => {
        window.open('/api/targets/template', '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden anim-scale-in">
                <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                            <i className="fas fa-file-import text-primary text-xs"></i>
                        </div>
                        <h2 className="text-sm font-bold text-base-content">Import Targets</h2>
                    </div>
                    <button onClick={onClose} className="text-base-content/30 hover:text-base-content/60 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {!result ? (
                        <>
                            <p className="text-[11px] text-base-content/50">Upload a CSV file with your targets. <button onClick={downloadTemplate}
                                className="text-primary hover:underline font-medium">Download template</button></p>

                            <div onClick={() => inputRef.current?.click()}
                                className="border-2 border-dashed border-base-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors">
                                {file ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <i className="fas fa-file-csv text-primary text-lg"></i>
                                        <span className="text-xs font-medium text-base-content">{file.name}</span>
                                        <span className="text-[10px] text-base-content/40">({(file.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                ) : (
                                    <div>
                                        <i className="fas fa-cloud-upload-alt text-2xl text-base-content/20 mb-2"></i>
                                        <p className="text-xs text-base-content/40">Click to select a CSV file</p>
                                    </div>
                                )}
                                <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
                                    onChange={e => setFile(e.target.files[0])} />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 text-error text-[11px] font-medium">
                                    <i className="fas fa-exclamation-circle"></i> {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <button onClick={onClose}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-base-content/40 hover:text-base-content/60 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleUpload} disabled={!file || loading}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-semibold bg-primary text-white hover:opacity-90 transition-all disabled:opacity-40">
                                    {loading ? <span className="loading loading-spinner loading-xs"></span> : <i className="fas fa-upload text-[9px]"></i>}
                                    {loading ? 'Importing…' : 'Import'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4 space-y-3">
                            {result.errors?.length > 0 ? (
                                <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center mx-auto">
                                    <i className="fas fa-exclamation-triangle text-warning text-xl"></i>
                                </div>
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                                    <i className="fas fa-check-circle text-success text-xl"></i>
                                </div>
                            )}
                            <p className="text-sm font-bold text-base-content">{result.message}</p>
                            {result.errors?.length > 0 && (
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {result.errors.map((e, i) => (
                                        <p key={i} className="text-[10px] text-error/70">{e}</p>
                                    ))}
                                </div>
                            )}
                            <button onClick={onImported}
                                className="px-4 py-1.5 rounded-lg text-[10px] font-semibold bg-primary text-white hover:opacity-90 transition-all">
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
