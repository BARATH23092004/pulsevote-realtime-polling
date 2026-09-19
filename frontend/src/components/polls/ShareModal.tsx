import React, { useState } from 'react';
import { Copy, ExternalLink, X, Check, Share2, QrCode, Download, Smartphone } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ShareModalProps {
  isOpen: boolean;
  pollId: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, pollId, onClose }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(true);

  if (!isOpen) return null;

  const pollUrl = `${window.location.origin}/vote/${pollId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pollUrl)}&margin=8`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pollUrl);
    setCopied(true);
    showToast('Poll link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'PulseVote Live Poll',
        text: 'Cast your vote in real time on PulseVote!',
        url: pollUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pulsevote_qr_${pollId.slice(-6)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('QR Code downloaded successfully!', 'success');
    } catch {
      window.open(qrCodeUrl, '_blank');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '30px',
          borderRadius: '24px',
          backgroundColor: 'var(--bg-card)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          animation: 'blastPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '18px',
            top: '18px',
            color: 'var(--text-muted)',
            padding: '6px',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'var(--accent-gradient)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share2 size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Share This Poll
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Invite audience members to view and participate live
            </span>
          </div>
        </div>

        {/* QR Code Card Display */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            margin: '20px 0 16px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              padding: '12px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
              marginBottom: '12px',
            }}
          >
            <img
              src={qrCodeUrl}
              alt="Poll QR Code"
              style={{ width: '180px', height: '180px', display: 'block', borderRadius: '8px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            <Smartphone size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>Scan with phone camera to vote instantly</span>
          </div>

          <button
            onClick={handleDownloadQr}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Download size={14} />
            <span>Download QR Code Image</span>
          </button>
        </div>

        {/* URL Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            marginBottom: '16px',
          }}
        >
          <input
            type="text"
            readOnly
            value={pollUrl}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              fontWeight: 500,
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: copied ? 'var(--accent-success)' : 'var(--accent-gradient)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Social Share & Direct Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Vote in this live poll on PulseVote: ${pollUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '12px',
              backgroundColor: 'rgba(37, 211, 102, 0.1)',
              border: '1px solid rgba(37, 211, 102, 0.25)',
              color: '#16a34a',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            WhatsApp
          </a>

          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Vote in this live poll!')}&url=${encodeURIComponent(pollUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '12px',
              backgroundColor: 'rgba(29, 155, 240, 0.1)',
              border: '1px solid rgba(29, 155, 240, 0.25)',
              color: '#0284c7',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            Twitter / X
          </a>

          <a
            href={pollUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={15} />
            Open
          </a>
        </div>
      </div>
    </div>
  );
};
