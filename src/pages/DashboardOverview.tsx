import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichUmlaufRueckmeldung, enrichUmlaufmappePersonen } from '@/lib/enrich';
import type { EnrichedUmlaufRueckmeldung, EnrichedUmlaufmappePersonen } from '@/types/enriched';
import type { Umlaufmappe, UmlaufRueckmeldung, UmlaufmappePersonen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { UmlaufmappeDialog } from '@/components/dialogs/UmlaufmappeDialog';
import { UmlaufRueckmeldungDialog } from '@/components/dialogs/UmlaufRueckmeldungDialog';
import { UmlaufmappePersonenDialog } from '@/components/dialogs/UmlaufmappePersonenDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconChevronRight,
  IconFileDescription, IconUsers, IconClipboardCheck,
  IconClock, IconCircleCheck, IconLoader, IconX,
  IconMail, IconPhone, IconUser, IconBuildingCommunity,
} from '@tabler/icons-react';

const APPGROUP_ID = '69d34a4cc7efd848c9f56121';
const REPAIR_ENDPOINT = '/claude/build/repair';

type StatusKey = 'offen' | 'in_bearbeitung' | 'erledigt' | 'alle';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  offen: { label: 'Offen', color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: <IconClock size={14} className="shrink-0" /> },
  in_bearbeitung: { label: 'In Bearbeitung', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: <IconLoader size={14} className="shrink-0" /> },
  erledigt: { label: 'Erledigt', color: 'bg-green-500/10 text-green-600 border-green-200', icon: <IconCircleCheck size={14} className="shrink-0" /> },
};

export default function DashboardOverview() {
  const {
    personenstamm, umlaufmappe, umlaufRueckmeldung, umlaufmappePersonen,
    personenstammMap, umlaufmappeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedRueckmeldungen = enrichUmlaufRueckmeldung(umlaufRueckmeldung, { umlaufmappeMap, personenstammMap });
  const enrichedPersonen = enrichUmlaufmappePersonen(umlaufmappePersonen, { umlaufmappeMap, personenstammMap });

  const [selectedMappe, setSelectedMappe] = useState<Umlaufmappe | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusKey>('alle');
  const [mappeDialogOpen, setMappeDialogOpen] = useState(false);
  const [editMappe, setEditMappe] = useState<Umlaufmappe | null>(null);
  const [deleteMappe, setDeleteMappe] = useState<Umlaufmappe | null>(null);
  const [rueckmeldungDialogOpen, setRueckmeldungDialogOpen] = useState(false);
  const [editRueckmeldung, setEditRueckmeldung] = useState<EnrichedUmlaufRueckmeldung | null>(null);
  const [deleteRueckmeldung, setDeleteRueckmeldung] = useState<EnrichedUmlaufRueckmeldung | null>(null);
  const [personenDialogOpen, setPersonenDialogOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<EnrichedUmlaufmappePersonen | null>(null);
  const [deletePerson, setDeletePerson] = useState<EnrichedUmlaufmappePersonen | null>(null);

  const filteredMappen = useMemo(() => {
    if (statusFilter === 'alle') return umlaufmappe;
    return umlaufmappe.filter(m => m.fields.status?.key === statusFilter);
  }, [umlaufmappe, statusFilter]);

  const selectedRueckmeldungen = useMemo(() => {
    if (!selectedMappe) return [];
    return enrichedRueckmeldungen.filter(r => {
      const id = extractRecordId(r.fields.umlaufmappe_ref);
      return id === selectedMappe.record_id;
    });
  }, [selectedMappe, enrichedRueckmeldungen]);

  const selectedPersonen = useMemo(() => {
    if (!selectedMappe) return [];
    return enrichedPersonen.filter(p => {
      const id = extractRecordId(p.fields.umlaufmappe_ref);
      return id === selectedMappe.record_id;
    });
  }, [selectedMappe, enrichedPersonen]);

  const stats = useMemo(() => ({
    gesamt: umlaufmappe.length,
    offen: umlaufmappe.filter(m => m.fields.status?.key === 'offen').length,
    inBearbeitung: umlaufmappe.filter(m => m.fields.status?.key === 'in_bearbeitung').length,
    erledigt: umlaufmappe.filter(m => m.fields.status?.key === 'erledigt').length,
  }), [umlaufmappe]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleMappeSubmit = async (fields: Umlaufmappe['fields']) => {
    if (editMappe) {
      await LivingAppsService.updateUmlaufmappeEntry(editMappe.record_id, fields);
    } else {
      await LivingAppsService.createUmlaufmappeEntry(fields);
    }
    setEditMappe(null);
    fetchAll();
  };

  const handleDeleteMappe = async () => {
    if (!deleteMappe) return;
    await LivingAppsService.deleteUmlaufmappeEntry(deleteMappe.record_id);
    if (selectedMappe?.record_id === deleteMappe.record_id) setSelectedMappe(null);
    setDeleteMappe(null);
    fetchAll();
  };

  const handleRueckmeldungSubmit = async (fields: UmlaufRueckmeldung['fields']) => {
    if (editRueckmeldung) {
      await LivingAppsService.updateUmlaufRueckmeldungEntry(editRueckmeldung.record_id, fields);
    } else {
      await LivingAppsService.createUmlaufRueckmeldungEntry(fields);
    }
    setEditRueckmeldung(null);
    fetchAll();
  };

  const handleDeleteRueckmeldung = async () => {
    if (!deleteRueckmeldung) return;
    await LivingAppsService.deleteUmlaufRueckmeldungEntry(deleteRueckmeldung.record_id);
    setDeleteRueckmeldung(null);
    fetchAll();
  };

  const handlePersonenSubmit = async (fields: UmlaufmappePersonen['fields']) => {
    if (editPerson) {
      await LivingAppsService.updateUmlaufmappePersonenEntry(editPerson.record_id, fields);
    } else {
      await LivingAppsService.createUmlaufmappePersonenEntry(fields);
    }
    setEditPerson(null);
    fetchAll();
  };

  const handleDeletePerson = async () => {
    if (!deletePerson) return;
    await LivingAppsService.deleteUmlaufmappePersonenEntry(deletePerson.record_id);
    setDeletePerson(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(stats.gesamt)}
          description="Umlaufmappen"
          icon={<IconFileDescription size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={String(stats.offen)}
          description="Ausstehend"
          icon={<IconClock size={18} className="text-amber-500" />}
        />
        <StatCard
          title="In Bearbeitung"
          value={String(stats.inBearbeitung)}
          description="Aktiv"
          icon={<IconLoader size={18} className="text-blue-500" />}
        />
        <StatCard
          title="Erledigt"
          value={String(stats.erledigt)}
          description="Abgeschlossen"
          icon={<IconCircleCheck size={18} className="text-green-500" />}
        />
      </div>

      {/* Main Area: List + Detail */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left: Umlaufmappen Liste */}
        <div className="flex flex-col gap-3 lg:w-2/5 min-w-0">
          {/* Header + Filter */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-foreground text-base">Umlaufmappen</h2>
            <Button size="sm" onClick={() => { setEditMappe(null); setMappeDialogOpen(true); }}>
              <IconPlus size={14} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Neue Mappe</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-1 flex-wrap">
            {(['alle', 'offen', 'in_bearbeitung', 'erledigt'] as StatusKey[]).map(key => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {key === 'alle' ? `Alle (${stats.gesamt})` :
                 key === 'offen' ? `Offen (${stats.offen})` :
                 key === 'in_bearbeitung' ? `Bearbeitung (${stats.inBearbeitung})` :
                 `Erledigt (${stats.erledigt})`}
              </button>
            ))}
          </div>

          {/* Mappen Liste */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh] lg:max-h-[70vh] pr-1">
            {filteredMappen.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <IconFileDescription size={40} className="text-muted-foreground/40" stroke={1.5} />
                <p className="text-sm text-muted-foreground">Keine Umlaufmappen vorhanden</p>
                <Button size="sm" variant="outline" onClick={() => { setEditMappe(null); setMappeDialogOpen(true); }}>
                  <IconPlus size={14} className="mr-1" />Erste Mappe anlegen
                </Button>
              </div>
            ) : (
              filteredMappen.map(mappe => {
                const isSelected = selectedMappe?.record_id === mappe.record_id;
                const status = mappe.fields.status;
                const cfg = status?.key ? STATUS_CONFIG[status.key] : null;

                // Count responses for this mappe
                const responseCount = enrichedRueckmeldungen.filter(r =>
                  extractRecordId(r.fields.umlaufmappe_ref) === mappe.record_id
                ).length;
                const personCount = enrichedPersonen.filter(p =>
                  extractRecordId(p.fields.umlaufmappe_ref) === mappe.record_id
                ).length;

                return (
                  <div
                    key={mappe.record_id}
                    onClick={() => setSelectedMappe(isSelected ? null : mappe)}
                    className={`group rounded-xl border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground truncate">
                            {mappe.fields.titel || '(Kein Titel)'}
                          </span>
                          {cfg && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.color}`}>
                              {cfg.icon}{cfg.label}
                            </span>
                          )}
                        </div>
                        {mappe.fields.zweck && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{mappe.fields.zweck}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          {mappe.fields.faelligkeitsdatum && (
                            <span className="flex items-center gap-1">
                              <IconClock size={11} className="shrink-0" />
                              {formatDate(mappe.fields.faelligkeitsdatum)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <IconUsers size={11} className="shrink-0" />
                            {personCount} Person{personCount !== 1 ? 'en' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <IconClipboardCheck size={11} className="shrink-0" />
                            {responseCount} Rückmeldung{responseCount !== 1 ? 'en' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setEditMappe(mappe); setMappeDialogOpen(true); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <IconPencil size={14} className="shrink-0" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteMappe(mappe); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <IconTrash size={14} className="shrink-0" />
                        </button>
                        <IconChevronRight size={14} className={`shrink-0 transition-transform text-muted-foreground/50 ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 min-w-0">
          {!selectedMappe ? (
            <div className="flex flex-col items-center justify-center h-64 lg:h-full gap-3 text-center rounded-xl border border-dashed border-border">
              <IconFileDescription size={40} className="text-muted-foreground/30" stroke={1.5} />
              <p className="text-sm text-muted-foreground">Wähle eine Umlaufmappe aus,<br />um Details anzuzeigen</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[80vh] lg:max-h-none">
              {/* Mappe Detail Header */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground text-base truncate">
                      {selectedMappe.fields.titel || '(Kein Titel)'}
                    </h3>
                    {selectedMappe.fields.zweck && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedMappe.fields.zweck}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedMappe(null)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  >
                    <IconX size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                  {selectedMappe.fields.status && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${STATUS_CONFIG[selectedMappe.fields.status.key]?.color ?? ''}`}>
                      {STATUS_CONFIG[selectedMappe.fields.status.key]?.icon}
                      {selectedMappe.fields.status.label}
                    </span>
                  )}
                  {selectedMappe.fields.erstellungsdatum && (
                    <span>Erstellt: {formatDate(selectedMappe.fields.erstellungsdatum)}</span>
                  )}
                  {selectedMappe.fields.faelligkeitsdatum && (
                    <span>Fällig: {formatDate(selectedMappe.fields.faelligkeitsdatum)}</span>
                  )}
                  {selectedMappe.fields.min_zustimmungen != null && (
                    <span>Min. Zustimmungen: {selectedMappe.fields.min_zustimmungen}</span>
                  )}
                  {selectedMappe.fields.min_kenntnisnahmen != null && (
                    <span>Min. Kenntnisnahmen: {selectedMappe.fields.min_kenntnisnahmen}</span>
                  )}
                </div>
                {selectedMappe.fields.bemerkung && (
                  <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
                    {selectedMappe.fields.bemerkung}
                  </p>
                )}
              </div>

              {/* Empfänger */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                    <IconUsers size={15} className="shrink-0 text-muted-foreground" />
                    Empfänger ({selectedPersonen.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditPerson(null); setPersonenDialogOpen(true); }}
                    className="h-7 text-xs"
                  >
                    <IconPlus size={12} className="mr-1 shrink-0" />Hinzufügen
                  </Button>
                </div>
                {selectedPersonen.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Keine Empfänger zugewiesen
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {selectedPersonen.map(p => {
                      const person = p.fields.person_ref ? personenstamm.find(ps => {
                        const id = extractRecordId(p.fields.person_ref);
                        return ps.record_id === id;
                      }) : null;
                      return (
                        <div key={p.record_id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <IconUser size={14} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {person ? `${person.fields.vorname ?? ''} ${person.fields.nachname ?? ''}`.trim() : p.person_refName || '—'}
                            </p>
                            {p.fields.aufgabentyp && (
                              <Badge variant="secondary" className="text-xs mt-0.5">
                                {p.fields.aufgabentyp.label}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditPerson(p); setPersonenDialogOpen(true); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <IconPencil size={13} className="shrink-0" />
                            </button>
                            <button
                              onClick={() => setDeletePerson(p)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <IconTrash size={13} className="shrink-0" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rückmeldungen */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                    <IconClipboardCheck size={15} className="shrink-0 text-muted-foreground" />
                    Rückmeldungen ({selectedRueckmeldungen.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditRueckmeldung(null); setRueckmeldungDialogOpen(true); }}
                    className="h-7 text-xs"
                  >
                    <IconPlus size={12} className="mr-1 shrink-0" />Hinzufügen
                  </Button>
                </div>
                {selectedRueckmeldungen.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Noch keine Rückmeldungen eingegangen
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {selectedRueckmeldungen.map(r => {
                      const isJa = r.fields.entscheidung?.key === 'ja';
                      const isNein = r.fields.entscheidung?.key === 'nein';
                      return (
                        <div key={r.record_id} className="flex items-start gap-3 px-4 py-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isJa ? 'bg-green-500/10' : isNein ? 'bg-red-500/10' : 'bg-muted'
                          }`}>
                            {isJa ? <IconCheck size={14} className="text-green-600" /> :
                             isNein ? <IconX size={14} className="text-red-600" /> :
                             <IconUser size={14} className="text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground truncate">
                                {r.person_refName || '—'}
                              </p>
                              {r.fields.entscheidung && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                  isJa ? 'bg-green-500/10 text-green-600 border-green-200' :
                                  isNein ? 'bg-red-500/10 text-red-600 border-red-200' : 'bg-muted text-muted-foreground border-border'
                                }`}>
                                  {isJa ? 'Genehmigt' : 'Abgelehnt'}
                                </span>
                              )}
                              {r.fields.rueckmeldedatum && (
                                <span className="text-xs text-muted-foreground">{formatDate(r.fields.rueckmeldedatum)}</span>
                              )}
                            </div>
                            {r.fields.kommentar && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.fields.kommentar}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditRueckmeldung(r); setRueckmeldungDialogOpen(true); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <IconPencil size={13} className="shrink-0" />
                            </button>
                            <button
                              onClick={() => setDeleteRueckmeldung(r)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <IconTrash size={13} className="shrink-0" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Personenstamm Quick Reference */}
              {personenstamm.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                      <IconBuildingCommunity size={15} className="shrink-0 text-muted-foreground" />
                      Kontakte ({personenstamm.length})
                    </h4>
                  </div>
                  <div className="divide-y divide-border max-h-48 overflow-y-auto">
                    {personenstamm.slice(0, 8).map(p => (
                      <div key={p.record_id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <IconUser size={13} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {`${p.fields.vorname ?? ''} ${p.fields.nachname ?? ''}`.trim() || '—'}
                          </p>
                          {p.fields.abteilung && (
                            <p className="text-xs text-muted-foreground truncate">{p.fields.abteilung}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {p.fields.email && (
                            <a
                              href={`mailto:${p.fields.email}`}
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <IconMail size={13} className="shrink-0" />
                            </a>
                          )}
                          {p.fields.telefon && (
                            <a
                              href={`tel:${p.fields.telefon}`}
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <IconPhone size={13} className="shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {personenstamm.length > 8 && (
                      <div className="px-4 py-2 text-center text-xs text-muted-foreground">
                        +{personenstamm.length - 8} weitere — alle im Personenstamm
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <UmlaufmappeDialog
        open={mappeDialogOpen}
        onClose={() => { setMappeDialogOpen(false); setEditMappe(null); }}
        onSubmit={handleMappeSubmit}
        defaultValues={editMappe?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Umlaufmappe']}
      />

      <UmlaufRueckmeldungDialog
        open={rueckmeldungDialogOpen}
        onClose={() => { setRueckmeldungDialogOpen(false); setEditRueckmeldung(null); }}
        onSubmit={handleRueckmeldungSubmit}
        defaultValues={editRueckmeldung ? {
          ...editRueckmeldung.fields,
          umlaufmappe_ref: selectedMappe
            ? createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedMappe.record_id)
            : editRueckmeldung.fields.umlaufmappe_ref,
        } : selectedMappe ? {
          umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedMappe.record_id),
        } : undefined}
        umlaufmappeList={umlaufmappe}
        personenstammList={personenstamm}
        enablePhotoScan={AI_PHOTO_SCAN['UmlaufRueckmeldung']}
      />

      <UmlaufmappePersonenDialog
        open={personenDialogOpen}
        onClose={() => { setPersonenDialogOpen(false); setEditPerson(null); }}
        onSubmit={handlePersonenSubmit}
        defaultValues={editPerson ? {
          ...editPerson.fields,
          umlaufmappe_ref: selectedMappe
            ? createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedMappe.record_id)
            : editPerson.fields.umlaufmappe_ref,
        } : selectedMappe ? {
          umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedMappe.record_id),
        } : undefined}
        umlaufmappeList={umlaufmappe}
        personenstammList={personenstamm}
        enablePhotoScan={AI_PHOTO_SCAN['UmlaufmappePersonen']}
      />

      <ConfirmDialog
        open={!!deleteMappe}
        title="Umlaufmappe löschen"
        description={`Möchtest du die Mappe "${deleteMappe?.fields.titel ?? ''}" wirklich löschen?`}
        onConfirm={handleDeleteMappe}
        onClose={() => setDeleteMappe(null)}
      />

      <ConfirmDialog
        open={!!deleteRueckmeldung}
        title="Rückmeldung löschen"
        description="Möchtest du diese Rückmeldung wirklich löschen?"
        onConfirm={handleDeleteRueckmeldung}
        onClose={() => setDeleteRueckmeldung(null)}
      />

      <ConfirmDialog
        open={!!deletePerson}
        title="Empfänger entfernen"
        description="Möchtest du diesen Empfänger wirklich entfernen?"
        onConfirm={handleDeletePerson}
        onClose={() => setDeletePerson(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-2/5 space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-full" />
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="flex-1">
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
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
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
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
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
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
