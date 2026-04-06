import type { UmlaufmappePersonen, Umlaufmappe, Personenstamm } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface UmlaufmappePersonenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: UmlaufmappePersonen | null;
  onEdit: (record: UmlaufmappePersonen) => void;
  umlaufmappeList: Umlaufmappe[];
  personenstammList: Personenstamm[];
}

export function UmlaufmappePersonenViewDialog({ open, onClose, record, onEdit, umlaufmappeList, personenstammList }: UmlaufmappePersonenViewDialogProps) {
  function getUmlaufmappeDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return umlaufmappeList.find(r => r.record_id === id)?.fields.titel ?? '—';
  }

  function getPersonenstammDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return personenstammList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Umlaufmappe_Personen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umlaufmappe</Label>
            <p className="text-sm">{getUmlaufmappeDisplayName(record.fields.umlaufmappe_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Person</Label>
            <p className="text-sm">{getPersonenstammDisplayName(record.fields.person_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aufgabentyp</Label>
            <Badge variant="secondary">{record.fields.aufgabentyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}