import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';
import { FileText, ShieldAlert, ShieldCheck, Upload, AlertCircle, ArrowRight } from 'lucide-react';

const KycVerification = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [documentType, setDocumentType] = useState('PASSPORT');
  const [file, setFile] = useState(null);
  const [kycData, setKycData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchKycStatus = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data.success && res.data.user.kyc) {
        setKycData(res.data.user.kyc);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'CREATOR') {
      navigate('/');
    } else {
      fetchKycStatus();
    }
  }, [user]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      return setError('Please select a document file to upload.');
    }
    setError('');
    setMessage('');
    setSubmitting(true);

    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('kycDocument', file);

    try {
      const res = await api.post('/users/kyc/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setMessage(res.data.message);
        setKycData(res.data.kyc);
        await refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'KYC submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textSecondary text-xs">Checking verification files...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 bg-darkbg">
      <div className="bg-white card-shadow border border-darkborder rounded-2xl p-8 space-y-8 animate-scaleIn">
        
        {/* Title */}
        <div>
          <h2 className="text-3xl font-extrabold text-textPrimary tracking-tight">KYC Identity Verification</h2>
          <p className="text-sm text-textSecondary mt-1">
            Required for all Campaign Creators before launching public campaigns.
          </p>
        </div>

        {/* Dynamic States Display */}
        {kycData && kycData.status === 'APPROVED' && (
          <div className="bg-emerald-500/10 border border-emerald-500/35 rounded-xl p-6 flex gap-4 items-start animate-fadeInUp">
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-bold text-emerald-400 text-sm">Identity Verified Successfully</h3>
              <p className="text-xs text-textSecondary leading-relaxed mt-1">
                Your KYC application was reviewed and approved. Your campaigns can now accept funding immediately!
              </p>
              <button 
                onClick={() => navigate('/create-campaign')}
                className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all animate-fadeInUp"
              >
                <span>Launch New Campaign</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {kycData && kycData.status === 'PENDING' && (
          <div className="bg-amber-500/10 border border-amber-500/35 rounded-xl p-6 flex gap-4 items-start">
            <AlertCircle className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <h3 className="font-bold text-amber-400 text-sm">KYC Application Pending Audit</h3>
              <p className="text-xs text-textSecondary leading-relaxed mt-1">
                We have received your document ({kycData.documentType}). A platform administrator is auditing it. This usually takes between 1-3 business hours.
              </p>
            </div>
          </div>
        )}

        {kycData && kycData.status === 'REJECTED' && (
          <div className="bg-rose-500/10 border border-rose-500/35 rounded-xl p-6 flex gap-4 items-start">
            <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
            <div>
              <h3 className="font-bold text-rose-400 text-sm">Verification Audit Rejected</h3>
              <p className="text-xs text-textSecondary leading-relaxed mt-1">
                Unfortunately, your verification was rejected. 
              </p>
              <p className="text-xs text-rose-400 font-semibold bg-rose-500/5 border border-rose-500/15 p-3 rounded-lg mt-3">
                Reason: "{kycData.rejectionReason}"
              </p>
              <p className="text-xs text-textSecondary mt-3">
                Please review the reason and re-submit your correct credentials below.
              </p>
            </div>
          </div>
        )}

        {/* Upload Form (Shown when no KYC or if rejected) */}
        {(!kycData || kycData.status === 'REJECTED') && (
          <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-darkborder/50">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs font-semibold animate-fadeInUp">
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Document Type Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">
                  Select Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full bg-white border border-darkborder rounded-xl text-sm p-3.5 text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="PASSPORT">International Passport</option>
                  <option value="NATIONAL_ID">National Government ID Card</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                </select>
              </div>

              {/* Document Upload Area */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">
                  Upload Identity Proof File
                </label>
                <div className="relative flex items-center justify-center border-dashed border-2 border-primary/40 rounded-xl p-4 bg-primary/5 hover:bg-primary/10 transition-colors animate-pulse">
                  <input 
                    type="file" 
                    accept=".pdf, .png, .jpg, .jpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-textSecondary mx-auto mb-2" />
                    <span className="text-xs text-textSecondary block">
                      {file ? file.name : 'Choose a file (PDF, PNG, JPG)'}
                    </span>
                    <span className="text-[10px] text-textSecondary/75 block mt-1">
                      Max file size: 5MB
                    </span>
                  </div>
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Submit Verification Documents</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default KycVerification;
