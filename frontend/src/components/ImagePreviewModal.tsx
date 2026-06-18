import { X } from 'lucide-react';
import { Button } from './Ui';

export function ImagePreviewModal({ alt, src, title, onClose }: { alt: string; src: string; title: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="image-preview-modal">
        <div className="section-head">
          <div><span>Mahsulot rasmi</span><h2>{title}</h2></div>
          <button onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <img alt={alt} src={src} />
        <div className="row-actions">
          <Button onClick={() => window.open(src, '_blank')} variant="secondary">Yangi oynada ochish</Button>
          <Button onClick={onClose}>Yopish</Button>
        </div>
      </div>
    </div>
  );
}