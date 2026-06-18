import { FileUp } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, PageTitle } from '../components/Ui';

export function PrescriptionPage() {
  const [items, setItems] = useState<string[]>([]);
  return (
    <div className="page">
      <PageTitle eyebrow="Retsept" title="Retsept yuklash" text="Rasm yoki PDF tanlang. Admin tekshiradi." />
      <Card>
        <label className="upload">
          <FileUp size={34} />
          <strong>Fayl tanlang</strong>
          <span>JPG, PNG yoki PDF</span>
          <input type="file" onChange={(event) => event.target.files?.[0] && setItems([event.target.files[0].name, ...items])} />
        </label>
        <div className="list">{items.map((name) => <div className="row" key={name}><span>{name}</span><Badge tone="warning">Admin tekshiradi</Badge></div>)}</div>
      </Card>
    </div>
  );
}