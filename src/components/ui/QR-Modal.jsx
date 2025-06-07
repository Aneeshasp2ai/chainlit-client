// QRModal.jsx
import { useEffect, useState } from "react";
import { QrCode, Download } from "lucide-react";

export const QRModal = ({ qrId, isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchQRCode = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`http://13.60.99.108:8004/qr/${qrId}`, {
          method: "GET",
          headers: {
            Accept: "image/*",
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = () => setQrDataUrl(reader.result);
        reader.onerror = () => setError("Failed to read QR code data.");
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error(err);
        setError("Failed to load QR code.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQRCode();
  }, [isOpen, qrId]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-code-${qrId}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#212121] rounded-xl p-6 shadow-xl w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-3 text-xl text-gray-500 hover:text-gray-800 dark:hover:text-white"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-lg font-semibold mb-4 text-center">QR Code</h2>

        {isLoading && (
          <div className="text-center">Generating QR code...</div>
        )}

        {error && <div className="text-red-500 text-center">{error}</div>}

        {qrDataUrl && (
          <>
            <div className="flex justify-center mb-4">
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>
            <div className="flex justify-center">
              <button
                onClick={downloadQR}
                className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-sm px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <Download size={16} /> Download
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};