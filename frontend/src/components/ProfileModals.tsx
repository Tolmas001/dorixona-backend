import { Download, FileUp, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button, Field } from './Ui';
import { money } from '../utils/format';
import type { AuthState, OnlineOrder, User } from '../types';

type ProfileAddress = { id: string; title: string; address: string; note?: string; primary?: boolean; lat?: number; lng?: number };

export function EditProfileModal({
  auth, status, onClose, onSubmit,
}: {
  auth: AuthState; status: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const displayName = (u: User) => u.full_name || u.username || u.email?.split('@')[0] || 'User';
  return (
    <div className="modal-backdrop">
      <form className="profile-modal" onSubmit={onSubmit}>
        <div className="section-head">
          <div><span>Profil</span><h2>Maʼlumotlarni tahrirlash</h2></div>
          <button onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <Field label="Ism Familiya"><input defaultValue={displayName(auth.user)} name="full_name" /></Field>
        <Field label="Familiya"><input placeholder="Familiya" /></Field>
        <Field label="Telefon"><input defaultValue={auth.user.tel_number || ''} name="tel_number" /></Field>
        <Field label="Email"><input defaultValue={auth.user.email || ''} type="email" /></Field>
        <Field label="Tug‘ilgan sana"><input type="date" /></Field>
        <Field label="Jins"><select><option>Erkak</option><option>Ayol</option><option>Ko‘rsatilmagan</option></select></Field>
        <Field label="Manzil"><input defaultValue={auth.user.delivery_address || ''} name="delivery_address" /></Field>
        <div className="row-actions"><Button type="submit">Save</Button><Button onClick={onClose} variant="secondary">Cancel</Button></div>
        {status && <p className="status-text">{status}</p>}
      </form>
    </div>
  );
}

export function OrderDetailModal({ order, onClose }: { order: OnlineOrder | null; onClose: () => void }) {
  if (!order) return null;
  return (
    <div className="modal-backdrop">
      <div className="profile-modal">
        <div className="section-head">
          <div><span>Buyurtma</span><h2>{order.id || 'Buyurtma'}</h2></div>
          <button onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="profile-fields single">
          <p><b>Status</b>{order.status || 'Tayyorlanmoqda'}</p>
          <p><b>To‘lov holati</b>Tasdiqlanishi kutilmoqda</p>
          <p><b>Umumiy summa</b>{money(order.totalAmount)}</p>
        </div>
        <Button onClick={onClose}>Yopish</Button>
      </div>
    </div>
  );
}

export function PrescriptionPreviewModal({ prescriptionId, onClose }: { prescriptionId: string | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  if (!prescriptionId) return null;
  return (
    <div className="modal-backdrop">
      <div className="prescription-preview-modal">
        <div className="section-head">
          <div><span>Retsept preview</span><h2>{prescriptionId}</h2></div>
          <button onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="prescription-preview" style={{ transform: `scale(${zoom})` }}>
          <FileUp size={64} /><strong>PDF yoki rasm preview</strong><span>Zoom boshqaruvi</span>
        </div>
        <div className="row-actions">
          <Button onClick={() => setZoom((v) => Math.min(1.6, v + 0.1))} variant="secondary">Zoom In</Button>
          <Button onClick={() => setZoom((v) => Math.max(0.8, v - 0.1))} variant="secondary">Zoom Out</Button>
          <Button onClick={() => { const blob = new Blob([`Dorixona retsepti: ${prescriptionId}`], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${prescriptionId}.txt`; a.click(); URL.revokeObjectURL(url); }}>
            <Download size={17} /> Download
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LogoutConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="profile-modal">
        <div className="section-head">
          <div><span>Logout</span><h2>Hisobdan chiqishni tasdiqlaysizmi?</h2></div>
          <button onClick={onCancel} type="button"><X size={18} /></button>
        </div>
        <div className="row-actions">
          <Button onClick={onConfirm} variant="danger">Ha, Chiqish</Button>
          <Button onClick={onCancel} variant="secondary">Bekor qilish</Button>
        </div>
      </div>
    </div>
  );
}