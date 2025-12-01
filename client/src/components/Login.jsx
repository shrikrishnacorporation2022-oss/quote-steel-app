import React, { useState } from 'react';
import { Lock, ArrowRight, QrCode } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSetup, setShowSetup] = useState(false);
    const [qrData, setQrData] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const authUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '/api/auth') : `${apiUrl}/api/auth`;

            const response = await fetch(`${authUrl}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: code }),
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                onLogin();
            } else {
                setError(data.message || 'Invalid code');
            }
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetup = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const authUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '/api/auth') : `${apiUrl}/api/auth`;

            const response = await fetch(`${authUrl}/setup`, {
                credentials: 'include'
            });
            const data = await response.json();
            setQrData(data);
            setShowSetup(true);
        } catch (err) {
            setError('Could not load setup');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-indigo-600 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Secure Login</h1>
                    <p className="text-indigo-100">Ammashanthi Quote Steel</p>
                </div>

                <div className="p-8">
                    {!showSetup ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Authenticator Code
                                </label>
                                <input
                                    type="text"
                                    maxLength="6"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    className="input-field text-center text-2xl tracking-widest"
                                    placeholder="000 000"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full btn-primary flex items-center justify-center gap-2"
                            >
                                {loading ? 'Verifying...' : 'Login'}
                                <ArrowRight className="w-5 h-5" />
                            </button>

                            <div className="pt-4 text-center">
                                <button
                                    type="button"
                                    onClick={handleSetup}
                                    className="text-xs text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto transition-colors"
                                >
                                    <QrCode className="w-3 h-3" />
                                    First time setup?
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center space-y-6">
                            <h3 className="text-lg font-bold text-slate-900">Setup Authenticator</h3>

                            {qrData ? (
                                <>
                                    <div className="bg-white p-4 border-2 border-slate-100 rounded-xl inline-block">
                                        <img src={qrData.qrImage} alt="QR Code" className="w-48 h-48" />
                                    </div>

                                    <div className="text-left bg-slate-50 p-4 rounded-xl text-sm space-y-2">
                                        <p>1. Install Google Authenticator app</p>
                                        <p>2. Scan this QR code</p>
                                        <p>3. Use the 6-digit code to login</p>
                                        <p className="pt-2 text-xs text-slate-500 break-all">
                                            Secret: <span className="font-mono select-all">{qrData.secret}</span>
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <p>Loading...</p>
                            )}

                            <button
                                onClick={() => setShowSetup(false)}
                                className="w-full btn-secondary"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
