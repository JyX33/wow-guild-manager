import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) {
    return null;
  }

  return (
    // Backdrop
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300"
      onClick={onClose} // Close on backdrop click
      aria-modal="true"
      role="dialog"
    >
      {/* Modal Content */}
      <div 
        className="bg-white p-6 rounded shadow-lg max-w-md w-full m-4 transform transition-all duration-300 scale-95 opacity-0 animate-modal-fade-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
        role="document"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 text-2xl"
            aria-label="Close modal"
          >
            &times; {/* Close button (X) */}
          </button>
        </div>
        
        {/* Body */}
        <div>
          {children}
        </div>

        {/* Footer (Optional - can be added via children) */}
        {/* Example Footer:
        <div className="mt-4 pt-2 border-t flex justify-end">
           <button 
             onClick={onClose} 
             className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
           >
             Close
           </button>
        </div> 
        */}
      </div>
      {/* Basic CSS Animation (add to your global CSS or Tailwind config) */}
      <style>{`
        @keyframes modal-fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-modal-fade-in {
          animation: modal-fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// Default export for easier dynamic import if needed later
export default Modal;