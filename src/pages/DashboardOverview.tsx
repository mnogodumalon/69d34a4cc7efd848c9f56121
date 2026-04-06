import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichUmlaufmappePersonen, enrichUmlaufRueckmeldung } from '@/lib/enrich';
import type { EnrichedUmlaufmappePersonen, EnrichedUmlaufRueckmeldung } from '@/types/enriched';
import type { Umlaufmappe, Personenstamm, UmlaufmappePersonen, UmlaufRueckmeldung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconChevronRight, IconUsers, IconClockHour4, IconCheckbox, IconFolder, IconFileText, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { UmlaufmappeDialog } from '@/components/dialogs/UmlaufmappeDialog';
import { UmlaufRueckmeldungDialog } from '@/components/dialogs/UmlaufRueckmeldungDialog';
import { UmlaufmappePersonenDialog } from '@/components/dialogs/UmlaufmappePersonenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '69d34a4cc7efd848c9f56121';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    umlaufmappePersonen, personenstamm, umlaufmappe, umlaufRueckmeldung,
    personenstammMap, umlaufmappeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedUmlaufmappePersonen = enrichUmlaufmappePersonen(umlaufmappePersonen, { umlaufmappeMap, personenstammMap });
  const enrichedUmlaufRueckmeldung = enrichUmlaufRueckmeldung(umlaufRueckmeldung, { umlaufmappeMap, personenstammMap });

  const [selectedMappe, setSelectedMappe] = useState<Umlaufmappe | null>(null);
  const [mappeDialogOpen, setMappeDialogOpen] = useState(false);
  const [editMappe, setEditMappe] = useState<Umlaufmappe | null>(null);
  const [deleteMappe, setDeleteMappe] = useState<Umlaufmappe | null>(null);

  const [rueckmeldungDialogOpen, setRueckmeldungDialogOpen] = useState(false);
  const [editRueckmeldung, setEditRueckmeldung] = useState<EnrichedUmlaufRueckmeldung | null>(null);
  const [deleteRueckmeldung, setDeleteRueckmeldung] = useState<EnrichedUmlaufRueckmeldung | null>(null);

  const [personenDialogOpen, setPersonenDialogOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<EnrichedUmlaufmappePersonen | null>(null);
  const [deletePerson, setDeletePerson] = useState<EnrichedUmlaufmappePersonen | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('alle');

  const stats = useMemo(() => {
    const gesamt = umlaufmappe.length;
    const offen = umlaufmappe.filter(m => m.fields.status?.key === 'offen').length;
    const inBearbeitung = umlaufmappe.filter(m => m.fields.status?.key === 'in_bearbeitung').length;
    const erledigt = umlaufmappe.filter(m => m.fields.status?.key === 'erledigt').length;
    return { gesamt, offen, inBearbeitung, erledigt };
  }, [umlaufmappe]);

  const filteredMappen = useMemo(() => {
    if (statusFilter === 'alle') return umlaufmappe;
    return umlaufmappe.filter(m => m.fields.status?.key === statusFilter);
  }, [umlaufmappe, statusFilter]);

  const selectedPersonen = useMemo<EnrichedUmlaufmappePersonen[]>(() => {
    if (!selectedMappe) return [];
    return enrichedUmlaufmappePersonen.filter(p => {
      const id = extractRecordId(p.fields.umlaufmappe_ref);
      return id === selectedMappe.record_id;
    });
  }, [selectedMappe, enrichedUmlaufmappePersonen]);

  const selectedRueckmeldungen = useMemo<EnrichedUmlaufRueckmeldung[]>(() => {
    if (!selectedMappe) return [];
    return enrichedUmlaufRueckmeldung.filter(r => {
      const id = extractRecordId(r.fields.umlaufmappe_ref);
      return id === selectedMappe.record_id;
    });
  }, [selectedMappe, enrichedUmlaufRueckmeldung]);

  const getPersonName = (personId: string) => {
    const p = personenstamm.find(x => x.record_id === personId);
    if (!p) return personId;
    return [p.fields.vorname, p.fields.nachname].filter(Boolean).join(' ');
  };

  const getRueckmeldungForPerson = (personId: string) => {
    return selectedRueckmeldungen.find(r => extractRecordId(r.fields.person_ref) === personId);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(stats.gesamt)}
          description="Umlaufmappen"
          icon={<IconFolder size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={String(stats.offen)}
          description="Noch nicht gestartet"
          icon={<IconClockHour4 size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="In Bearbeitung"
          value={String(stats.inBearbeitung)}
          description="Wird bearbeitet"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Erledigt"
          value={String(stats.erledigt)}
          description="Abgeschlossen"
          icon={<IconCheckbox size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Main Workspace: Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[520px]">

        {/* Linke Spalte: Umlaufmappen-Liste */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground">Umlaufmappen</span>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                {[
                  { key: 'alle', label: 'Alle' },
                  { key: 'offen', label: 'Offen' },
                  { key: 'in_bearbeitung', label: 'Aktiv' },
                  { key: 'erledigt', label: 'Erledigt' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-2 py-1 transition-colors ${statusFilter === f.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() => { setEditMappe(null); setMappeDialogOpen(true); }}
                className="h-7 px-2 text-xs"
              >
                <IconPlus size={14} className="shrink-0" />
                <span className="hidden sm:inline ml-1">Neu</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filteredMappen.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <IconFolder size={36} stroke={1.5} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Keine Umlaufmappen</p>
                <Button size="sm" variant="outline" onClick={() => { setEditMappe(null); setMappeDialogOpen(true); }}>
                  <IconPlus size={14} className="mr-1" /> Neue Umlaufmappe
                </Button>
              </div>
            ) : (
              filteredMappen.map(mappe => {
                const isSelected = selectedMappe?.record_id === mappe.record_id;
                const persCount = umlaufmappePersonen.filter(p => extractRecordId(p.fields.umlaufmappe_ref) === mappe.record_id).length;
                const rueckCount = umlaufRueckmeldung.filter(r => extractRecordId(r.fields.umlaufmappe_ref) === mappe.record_id).length;
                const status = mappe.fields.status?.key ?? 'offen';

                return (
                  <div
                    key={mappe.record_id}
                    onClick={() => setSelectedMappe(isSelected ? null : mappe)}
                    className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground truncate">{mappe.fields.titel || '(kein Titel)'}</span>
                        <StatusBadge status={status} />
                      </div>
                      {mappe.fields.zweck && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{mappe.fields.zweck}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {mappe.fields.faelligkeitsdatum && (
                          <span className="flex items-center gap-1">
                            <IconClockHour4 size={11} className="shrink-0" />
                            {formatDate(mappe.fields.faelligkeitsdatum)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <IconUsers size={11} className="shrink-0" />{persCount} Personen
                        </span>
                        <span className="flex items-center gap-1">
                          <IconCheckbox size={11} className="shrink-0" />{rueckCount} Rückmeldungen
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setEditMappe(mappe); setMappeDialogOpen(true); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground"
                        title="Bearbeiten"
                      >
                        <IconPencil size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteMappe(mappe); }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Löschen"
                      >
                        <IconTrash size={14} />
                      </button>
                      <IconChevronRight size={14} className={`text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Rechte Spalte: Detail-Ansicht */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
          {!selectedMappe ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <IconFileText size={48} stroke={1.5} className="text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Umlaufmappe auswählen</p>
                <p className="text-sm text-muted-foreground mt-1">Klicke auf eine Umlaufmappe links, um Details, Personen und Rückmeldungen zu sehen.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-foreground truncate">{selectedMappe.fields.titel || '(kein Titel)'}</h2>
                      <StatusBadge status={selectedMappe.fields.status?.key ?? 'offen'} />
                    </div>
                    {selectedMappe.fields.zweck && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{selectedMappe.fields.zweck}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
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
                  </div>
                  <button
                    onClick={() => setSelectedMappe(null)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
                  >
                    <IconX size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Anhänge */}
                {(selectedMappe.fields.anhang_1 || selectedMappe.fields.anhang_2 || selectedMappe.fields.anhang_3) && (
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Anhänge</p>
                    <div className="flex flex-wrap gap-2">
                      {[selectedMappe.fields.anhang_1, selectedMappe.fields.anhang_2, selectedMappe.fields.anhang_3]
                        .filter(Boolean)
                        .map((url, i) => (
                          <a
                            key={i}
                            href={url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-foreground"
                          >
                            <IconFileText size={13} className="shrink-0" />
                            Anhang {i + 1}
                          </a>
                        ))}
                    </div>
                  </div>
                )}

                {/* Personen / Aufgaben-Verteilung */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Beteiligte Personen</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditPerson(null); setPersonenDialogOpen(true); }}
                      className="h-6 px-2 text-xs"
                    >
                      <IconPlus size={12} className="mr-1" />Person zuweisen
                    </Button>
                  </div>

                  {selectedPersonen.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">Noch keine Personen zugewiesen.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedPersonen.map(person => {
                        const personId = extractRecordId(person.fields.person_ref);
                        const rueckmeldung = personId ? getRueckmeldungForPerson(personId) : undefined;
                        const personName = person.person_refName || (personId ? getPersonName(personId) : '–');
                        const entscheidung = rueckmeldung?.fields.entscheidung?.key;

                        return (
                          <div key={person.record_id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                              entscheidung === 'ja' ? 'bg-green-100 text-green-700' :
                              entscheidung === 'nein' ? 'bg-red-100 text-red-700' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {personName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{personName}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {person.fields.aufgabentyp && (
                                  <span className="text-xs text-muted-foreground">{person.fields.aufgabentyp.label}</span>
                                )}
                                {rueckmeldung ? (
                                  <span className={`text-xs font-medium ${entscheidung === 'ja' ? 'text-green-600' : 'text-red-600'}`}>
                                    {entscheidung === 'ja' ? '✓ Genehmigt/Zur Kenntnis' : '✗ Abgelehnt'}
                                    {rueckmeldung.fields.rueckmeldedatum && ` · ${formatDate(rueckmeldung.fields.rueckmeldedatum)}`}
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-600">Ausstehend</span>
                                )}
                              </div>
                              {rueckmeldung?.fields.kommentar && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rueckmeldung.fields.kommentar}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { setEditPerson(person); setPersonenDialogOpen(true); }}
                                className="p-1 rounded hover:bg-muted text-muted-foreground"
                                title="Bearbeiten"
                              >
                                <IconPencil size={13} />
                              </button>
                              <button
                                onClick={() => setDeletePerson(person)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                title="Entfernen"
                              >
                                <IconTrash size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Rückmeldungen */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rückmeldungen</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditRueckmeldung(null); setRueckmeldungDialogOpen(true); }}
                      className="h-6 px-2 text-xs"
                    >
                      <IconPlus size={12} className="mr-1" />Rückmeldung
                    </Button>
                  </div>

                  {selectedRueckmeldungen.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">Noch keine Rückmeldungen vorhanden.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedRueckmeldungen.map(r => (
                        <div key={r.record_id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2">
                          <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            r.fields.entscheidung?.key === 'ja' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {r.fields.entscheidung?.key === 'ja'
                              ? <IconCheck size={13} className="text-green-600" />
                              : <IconX size={13} className="text-red-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{r.person_refName || '–'}</span>
                              {r.fields.rueckmeldedatum && (
                                <span className="text-xs text-muted-foreground">{formatDate(r.fields.rueckmeldedatum)}</span>
                              )}
                            </div>
                            {r.fields.entscheidung && (
                              <p className={`text-xs mt-0.5 ${r.fields.entscheidung.key === 'ja' ? 'text-green-600' : 'text-red-600'}`}>
                                {r.fields.entscheidung.label}
                              </p>
                            )}
                            {r.fields.kommentar && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.fields.kommentar}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditRueckmeldung(r); setRueckmeldungDialogOpen(true); }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground"
                              title="Bearbeiten"
                            >
                              <IconPencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteRueckmeldung(r)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              title="Löschen"
                            >
                              <IconTrash size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <UmlaufmappeDialog
        open={mappeDialogOpen}
        onClose={() => { setMappeDialogOpen(false); setEditMappe(null); }}
        onSubmit={async (fields) => {
          if (editMappe) {
            await LivingAppsService.updateUmlaufmappeEntry(editMappe.record_id, fields);
          } else {
            await LivingAppsService.createUmlaufmappeEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editMappe?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Umlaufmappe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Umlaufmappe']}
      />

      <UmlaufmappePersonenDialog
        open={personenDialogOpen}
        onClose={() => { setPersonenDialogOpen(false); setEditPerson(null); }}
        onSubmit={async (fields) => {
          if (editPerson) {
            await LivingAppsService.updateUmlaufmappePersonenEntry(editPerson.record_id, fields);
          } else {
            const enrichedFields = selectedMappe
              ? { ...fields, umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedMappe.record_id) }
              : fields;
            await LivingAppsService.createUmlaufmappePersonenEntry(enrichedFields);
          }
          fetchAll();
        }}
        defaultValues={editPerson
          ? editPerson.fields
          : selectedMappe
            ? { umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedMappe.record_id) }
            : undefined
        }
        umlaufmappeList={umlaufmappe}
        personenstammList={personenstamm}
        enablePhotoScan={AI_PHOTO_SCAN['UmlaufmappePersonen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['UmlaufmappePersonen']}
      />

      <UmlaufRueckmeldungDialog
        open={rueckmeldungDialogOpen}
        onClose={() => { setRueckmeldungDialogOpen(false); setEditRueckmeldung(null); }}
        onSubmit={async (fields) => {
          if (editRueckmeldung) {
            await LivingAppsService.updateUmlaufRueckmeldungEntry(editRueckmeldung.record_id, fields);
          } else {
            const enrichedFields = selectedMappe
              ? { ...fields, umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedMappe.record_id) }
              : fields;
            await LivingAppsService.createUmlaufRueckmeldungEntry(enrichedFields);
          }
          fetchAll();
        }}
        defaultValues={editRueckmeldung
          ? editRueckmeldung.fields
          : selectedMappe
            ? { umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, selectedMappe.record_id) }
            : undefined
        }
        umlaufmappeList={umlaufmappe}
        personenstammList={personenstamm}
        enablePhotoScan={AI_PHOTO_SCAN['UmlaufRueckmeldung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['UmlaufRueckmeldung']}
      />

      <ConfirmDialog
        open={!!deleteMappe}
        title="Umlaufmappe löschen"
        description={`"${deleteMappe?.fields.titel || 'Diese Umlaufmappe'}" wirklich löschen?`}
        onConfirm={async () => {
          if (!deleteMappe) return;
          await LivingAppsService.deleteUmlaufmappeEntry(deleteMappe.record_id);
          if (selectedMappe?.record_id === deleteMappe.record_id) setSelectedMappe(null);
          setDeleteMappe(null);
          fetchAll();
        }}
        onClose={() => setDeleteMappe(null)}
      />

      <ConfirmDialog
        open={!!deletePerson}
        title="Person entfernen"
        description={`"${deletePerson?.person_refName || 'Diese Person'}" von der Umlaufmappe entfernen?`}
        onConfirm={async () => {
          if (!deletePerson) return;
          await LivingAppsService.deleteUmlaufmappePersonenEntry(deletePerson.record_id);
          setDeletePerson(null);
          fetchAll();
        }}
        onClose={() => setDeletePerson(null)}
      />

      <ConfirmDialog
        open={!!deleteRueckmeldung}
        title="Rückmeldung löschen"
        description="Diese Rückmeldung wirklich löschen?"
        onConfirm={async () => {
          if (!deleteRueckmeldung) return;
          await LivingAppsService.deleteUmlaufRueckmeldungEntry(deleteRueckmeldung.record_id);
          setDeleteRueckmeldung(null);
          fetchAll();
        }}
        onClose={() => setDeleteRueckmeldung(null)}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    offen: { label: 'Offen', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    in_bearbeitung: { label: 'In Bearbeitung', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    erledigt: { label: 'Erledigt', className: 'bg-green-100 text-green-700 border-green-200' },
  };
  const c = config[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      {c.label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
        <Skeleton className="lg:col-span-3 h-96 rounded-2xl" />
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
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
