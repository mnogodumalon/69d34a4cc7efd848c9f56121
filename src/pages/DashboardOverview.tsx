import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichUmlaufRueckmeldung, enrichUmlaufmappePersonen } from '@/lib/enrich';
import type { EnrichedUmlaufRueckmeldung, EnrichedUmlaufmappePersonen } from '@/types/enriched';
import type { Umlaufmappe } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { UmlaufmappeDialog } from '@/components/dialogs/UmlaufmappeDialog';
import { UmlaufRueckmeldungDialog } from '@/components/dialogs/UmlaufRueckmeldungDialog';
import { UmlaufmappePersonenDialog } from '@/components/dialogs/UmlaufmappePersonenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconPlus, IconPencil, IconTrash, IconAlertCircle, IconTool,
  IconRefresh, IconCheck, IconFileText, IconUsers, IconClockHour4,
  IconCircleCheck, IconCircleX, IconChevronRight,
} from '@tabler/icons-react';

const APPGROUP_ID = '69d34a4cc7efd848c9f56121';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
  offen: { label: 'Offen', variant: 'outline', color: 'text-amber-600 border-amber-300 bg-amber-50' },
  in_bearbeitung: { label: 'In Bearbeitung', variant: 'secondary', color: 'text-blue-600 border-blue-300 bg-blue-50' },
  erledigt: { label: 'Erledigt', variant: 'default', color: 'text-green-700 border-green-300 bg-green-50' },
};

export default function DashboardOverview() {
  const {
    umlaufmappe, personenstamm, umlaufRueckmeldung, umlaufmappePersonen,
    umlaufmappeMap, personenstammMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedUmlaufRueckmeldung = enrichUmlaufRueckmeldung(umlaufRueckmeldung, { umlaufmappeMap, personenstammMap });
  const enrichedUmlaufmappePersonen = enrichUmlaufmappePersonen(umlaufmappePersonen, { umlaufmappeMap, personenstammMap });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('alle');

  // Umlaufmappe Dialog
  const [umDialogOpen, setUmDialogOpen] = useState(false);
  const [umEditRecord, setUmEditRecord] = useState<Umlaufmappe | null>(null);
  const [umDeleteTarget, setUmDeleteTarget] = useState<Umlaufmappe | null>(null);

  // UmlaufRueckmeldung Dialog
  const [rmDialogOpen, setRmDialogOpen] = useState(false);
  const [rmEditRecord, setRmEditRecord] = useState<EnrichedUmlaufRueckmeldung | null>(null);
  const [rmDeleteTarget, setRmDeleteTarget] = useState<EnrichedUmlaufRueckmeldung | null>(null);

  // UmlaufmappePersonen Dialog
  const [upDialogOpen, setUpDialogOpen] = useState(false);
  const [upEditRecord, setUpEditRecord] = useState<EnrichedUmlaufmappePersonen | null>(null);
  const [upDeleteTarget, setUpDeleteTarget] = useState<EnrichedUmlaufmappePersonen | null>(null);

  const filteredUmlaufmappe = useMemo(() => {
    if (filterStatus === 'alle') return umlaufmappe;
    return umlaufmappe.filter(u => u.fields.status?.key === filterStatus);
  }, [umlaufmappe, filterStatus]);

  const selectedUmlaufmappe = useMemo(
    () => umlaufmappe.find(u => u.record_id === selectedId) ?? null,
    [umlaufmappe, selectedId]
  );

  const personen = useMemo(() =>
    enrichedUmlaufmappePersonen.filter(p => {
      const id = extractRecordId(p.fields.umlaufmappe_ref);
      return id === selectedId;
    }),
    [enrichedUmlaufmappePersonen, selectedId]
  );

  const rueckmeldungen = useMemo(() =>
    enrichedUmlaufRueckmeldung.filter(r => {
      const id = extractRecordId(r.fields.umlaufmappe_ref);
      return id === selectedId;
    }),
    [enrichedUmlaufRueckmeldung, selectedId]
  );

  const stats = useMemo(() => ({
    gesamt: umlaufmappe.length,
    offen: umlaufmappe.filter(u => u.fields.status?.key === 'offen').length,
    inBearbeitung: umlaufmappe.filter(u => u.fields.status?.key === 'in_bearbeitung').length,
    erledigt: umlaufmappe.filter(u => u.fields.status?.key === 'erledigt').length,
  }), [umlaufmappe]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleUmDelete = async () => {
    if (!umDeleteTarget) return;
    await LivingAppsService.deleteUmlaufmappeEntry(umDeleteTarget.record_id);
    if (selectedId === umDeleteTarget.record_id) setSelectedId(null);
    setUmDeleteTarget(null);
    fetchAll();
  };

  const handleRmDelete = async () => {
    if (!rmDeleteTarget) return;
    await LivingAppsService.deleteUmlaufRueckmeldungEntry(rmDeleteTarget.record_id);
    setRmDeleteTarget(null);
    fetchAll();
  };

  const handleUpDelete = async () => {
    if (!upDeleteTarget) return;
    await LivingAppsService.deleteUmlaufmappePersonenEntry(upDeleteTarget.record_id);
    setUpDeleteTarget(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* KPI Leiste */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(stats.gesamt)}
          description="Umlaufmappen"
          icon={<IconFileText size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={String(stats.offen)}
          description="Ausstehend"
          icon={<IconClockHour4 size={18} className="text-amber-500" />}
        />
        <StatCard
          title="In Bearbeitung"
          value={String(stats.inBearbeitung)}
          description="Aktiv"
          icon={<IconUsers size={18} className="text-blue-500" />}
        />
        <StatCard
          title="Erledigt"
          value={String(stats.erledigt)}
          description="Abgeschlossen"
          icon={<IconCircleCheck size={18} className="text-green-500" />}
        />
      </div>

      {/* Hauptbereich: Master-Detail */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0">

        {/* Linke Spalte: Umlaufmappe-Liste */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3">
          {/* Header + Aktionen */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-foreground text-sm">Umlaufmappen</h2>
            <Button size="sm" onClick={() => { setUmEditRecord(null); setUmDialogOpen(true); }}>
              <IconPlus size={14} className="shrink-0 mr-1" />
              <span className="hidden sm:inline">Neu</span>
            </Button>
          </div>

          {/* Filter-Tabs */}
          <div className="flex gap-1 flex-wrap">
            {[
              { key: 'alle', label: 'Alle' },
              { key: 'offen', label: 'Offen' },
              { key: 'in_bearbeitung', label: 'In Bearbeitung' },
              { key: 'erledigt', label: 'Erledigt' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-280px)]">
            {filteredUmlaufmappe.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <IconFileText size={36} className="text-muted-foreground" stroke={1.5} />
                <p className="text-sm text-muted-foreground">Keine Umlaufmappen vorhanden</p>
                <Button size="sm" variant="outline" onClick={() => { setUmEditRecord(null); setUmDialogOpen(true); }}>
                  <IconPlus size={14} className="mr-1" /> Erste anlegen
                </Button>
              </div>
            ) : (
              filteredUmlaufmappe.map(um => {
                const status = um.fields.status?.key ?? 'offen';
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offen;
                const isSelected = um.record_id === selectedId;
                return (
                  <div
                    key={um.record_id}
                    onClick={() => setSelectedId(isSelected ? null : um.record_id)}
                    className={`group relative rounded-xl border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate text-foreground">{um.fields.titel || '(Kein Titel)'}</p>
                        {um.fields.faelligkeitsdatum && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Fällig: {formatDate(um.fields.faelligkeitsdatum)}
                          </p>
                        )}
                        {um.fields.zweck && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{um.fields.zweck}</p>
                        )}
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                      <IconChevronRight size={14} className={`shrink-0 mt-0.5 transition-transform ${isSelected ? 'text-primary rotate-90' : 'text-muted-foreground'}`} />
                    </div>

                    {/* Aktionen */}
                    <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={e => { e.stopPropagation(); setUmEditRecord(um); setUmDialogOpen(true); }}
                      >
                        <IconPencil size={12} className="shrink-0 mr-1" /> Bearbeiten
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={e => { e.stopPropagation(); setUmDeleteTarget(um); }}
                      >
                        <IconTrash size={12} className="shrink-0 mr-1" /> Löschen
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Rechte Spalte: Detailansicht */}
        <div className="flex-1 min-w-0">
          {!selectedUmlaufmappe ? (
            <div className="flex flex-col items-center justify-center h-64 lg:h-full rounded-2xl border-2 border-dashed border-border gap-4 text-center p-8">
              <IconFileText size={48} className="text-muted-foreground" stroke={1.5} />
              <div>
                <p className="font-medium text-foreground">Umlaufmappe auswählen</p>
                <p className="text-sm text-muted-foreground mt-1">Klicke links auf eine Umlaufmappe, um Details und Rückmeldungen zu sehen.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Detail-Header */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg text-foreground truncate">{selectedUmlaufmappe.fields.titel || '(Kein Titel)'}</h2>
                    {selectedUmlaufmappe.fields.zweck && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedUmlaufmappe.fields.zweck}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                      {selectedUmlaufmappe.fields.erstellungsdatum && (
                        <span>Erstellt: <strong>{formatDate(selectedUmlaufmappe.fields.erstellungsdatum)}</strong></span>
                      )}
                      {selectedUmlaufmappe.fields.faelligkeitsdatum && (
                        <span>Fällig: <strong>{formatDate(selectedUmlaufmappe.fields.faelligkeitsdatum)}</strong></span>
                      )}
                      {selectedUmlaufmappe.fields.min_zustimmungen != null && (
                        <span>Min. Zustimmungen: <strong>{selectedUmlaufmappe.fields.min_zustimmungen}</strong></span>
                      )}
                      {selectedUmlaufmappe.fields.min_kenntnisnahmen != null && (
                        <span>Min. Kenntnisnahmen: <strong>{selectedUmlaufmappe.fields.min_kenntnisnahmen}</strong></span>
                      )}
                    </div>
                    {selectedUmlaufmappe.fields.bemerkung && (
                      <p className="mt-2 text-sm text-muted-foreground italic">{selectedUmlaufmappe.fields.bemerkung}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    {selectedUmlaufmappe.fields.status && (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_CONFIG[selectedUmlaufmappe.fields.status.key]?.color ?? ''}`}>
                        {selectedUmlaufmappe.fields.status.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Anhänge */}
                {[
                  selectedUmlaufmappe.fields.anhang_1,
                  selectedUmlaufmappe.fields.anhang_2,
                  selectedUmlaufmappe.fields.anhang_3,
                  selectedUmlaufmappe.fields.anhang_4,
                  selectedUmlaufmappe.fields.anhang_5,
                ].filter(Boolean).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Anhänge</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        selectedUmlaufmappe.fields.anhang_1,
                        selectedUmlaufmappe.fields.anhang_2,
                        selectedUmlaufmappe.fields.anhang_3,
                        selectedUmlaufmappe.fields.anhang_4,
                        selectedUmlaufmappe.fields.anhang_5,
                      ].filter(Boolean).map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-accent text-xs text-foreground border border-border transition-colors"
                        >
                          <IconFileText size={12} className="shrink-0" /> Anhang {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Personen-Zuordnungen */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <IconUsers size={16} className="text-muted-foreground shrink-0" />
                    Beteiligte Personen
                    <Badge variant="secondary" className="ml-1 text-xs">{personen.length}</Badge>
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setUpEditRecord(null); setUpDialogOpen(true); }}
                  >
                    <IconPlus size={13} className="shrink-0 mr-1" /> Person zuweisen
                  </Button>
                </div>

                {personen.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Noch keine Personen zugeordnet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[400px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Person</th>
                          <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Aufgabentyp</th>
                          <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Bemerkung</th>
                          <th className="py-2 text-xs font-medium text-muted-foreground text-right">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {personen.map(p => (
                          <tr key={p.record_id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-3 font-medium truncate max-w-[140px]">{p.person_refName || '—'}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{p.fields.aufgabentyp?.label || '—'}</td>
                            <td className="py-2 pr-3 text-muted-foreground truncate max-w-[120px]">{p.fields.bemerkung || '—'}</td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => { setUpEditRecord(p); setUpDialogOpen(true); }}
                                >
                                  <IconPencil size={13} className="shrink-0" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => setUpDeleteTarget(p)}
                                >
                                  <IconTrash size={13} className="shrink-0" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Rückmeldungen */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <IconCheck size={16} className="text-muted-foreground shrink-0" />
                    Rückmeldungen
                    <Badge variant="secondary" className="ml-1 text-xs">{rueckmeldungen.length}</Badge>
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setRmEditRecord(null); setRmDialogOpen(true); }}
                  >
                    <IconPlus size={13} className="shrink-0 mr-1" /> Rückmeldung erfassen
                  </Button>
                </div>

                {rueckmeldungen.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Noch keine Rückmeldungen vorhanden</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Person</th>
                          <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Aufgabentyp</th>
                          <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Entscheidung</th>
                          <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Datum</th>
                          <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Kommentar</th>
                          <th className="py-2 text-xs font-medium text-muted-foreground text-right">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rueckmeldungen.map(r => {
                          const ent = r.fields.entscheidung?.key;
                          return (
                            <tr key={r.record_id} className="border-b border-border/50 last:border-0">
                              <td className="py-2 pr-3 font-medium truncate max-w-[120px]">{r.person_refName || '—'}</td>
                              <td className="py-2 pr-3 text-muted-foreground text-xs">{r.fields.aufgabentyp?.label || '—'}</td>
                              <td className="py-2 pr-3">
                                {ent === 'ja' ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                                    <IconCircleCheck size={13} className="shrink-0" /> Ja
                                  </span>
                                ) : ent === 'nein' ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                                    <IconCircleX size={13} className="shrink-0" /> Nein
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-2 pr-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(r.fields.rueckmeldedatum)}</td>
                              <td className="py-2 pr-3 text-muted-foreground truncate max-w-[120px] text-xs">{r.fields.kommentar || '—'}</td>
                              <td className="py-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => { setRmEditRecord(r); setRmDialogOpen(true); }}
                                  >
                                    <IconPencil size={13} className="shrink-0" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => setRmDeleteTarget(r)}
                                  >
                                    <IconTrash size={13} className="shrink-0" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialoge */}
      <UmlaufmappeDialog
        open={umDialogOpen}
        onClose={() => { setUmDialogOpen(false); setUmEditRecord(null); }}
        onSubmit={async (fields) => {
          if (umEditRecord) {
            await LivingAppsService.updateUmlaufmappeEntry(umEditRecord.record_id, fields);
          } else {
            await LivingAppsService.createUmlaufmappeEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={umEditRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Umlaufmappe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Umlaufmappe']}
      />

      <UmlaufRueckmeldungDialog
        open={rmDialogOpen}
        onClose={() => { setRmDialogOpen(false); setRmEditRecord(null); }}
        onSubmit={async (fields) => {
          if (rmEditRecord) {
            await LivingAppsService.updateUmlaufRueckmeldungEntry(rmEditRecord.record_id, fields);
          } else {
            await LivingAppsService.createUmlaufRueckmeldungEntry({
              ...fields,
              umlaufmappe_ref: selectedId ? createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedId) : fields.umlaufmappe_ref,
            });
          }
          fetchAll();
        }}
        defaultValues={
          rmEditRecord
            ? rmEditRecord.fields
            : selectedId
              ? { umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedId) }
              : undefined
        }
        umlaufmappeList={umlaufmappe}
        personenstammList={personenstamm}
        enablePhotoScan={AI_PHOTO_SCAN['UmlaufRueckmeldung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['UmlaufRueckmeldung']}
      />

      <UmlaufmappePersonenDialog
        open={upDialogOpen}
        onClose={() => { setUpDialogOpen(false); setUpEditRecord(null); }}
        onSubmit={async (fields) => {
          if (upEditRecord) {
            await LivingAppsService.updateUmlaufmappePersonenEntry(upEditRecord.record_id, fields);
          } else {
            await LivingAppsService.createUmlaufmappePersonenEntry({
              ...fields,
              umlaufmappe_ref: selectedId ? createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedId) : fields.umlaufmappe_ref,
            });
          }
          fetchAll();
        }}
        defaultValues={
          upEditRecord
            ? upEditRecord.fields
            : selectedId
              ? { umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedId) }
              : undefined
        }
        umlaufmappeList={umlaufmappe}
        personenstammList={personenstamm}
        enablePhotoScan={AI_PHOTO_SCAN['UmlaufmappePersonen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['UmlaufmappePersonen']}
      />

      {/* Confirm Dialoge */}
      <ConfirmDialog
        open={!!umDeleteTarget}
        title="Umlaufmappe löschen"
        description={`Möchtest du die Umlaufmappe "${umDeleteTarget?.fields.titel}" wirklich löschen?`}
        onConfirm={handleUmDelete}
        onClose={() => setUmDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!rmDeleteTarget}
        title="Rückmeldung löschen"
        description="Möchtest du diese Rückmeldung wirklich löschen?"
        onConfirm={handleRmDelete}
        onClose={() => setRmDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!upDeleteTarget}
        title="Person entfernen"
        description={`Möchtest du "${upDeleteTarget?.person_refName}" aus der Umlaufmappe entfernen?`}
        onConfirm={handleUpDelete}
        onClose={() => setUpDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" /> Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
