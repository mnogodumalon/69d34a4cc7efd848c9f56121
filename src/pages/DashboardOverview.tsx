import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichUmlaufmappePersonen, enrichUmlaufRueckmeldung } from '@/lib/enrich';
import type { EnrichedUmlaufmappePersonen, EnrichedUmlaufRueckmeldung } from '@/types/enriched';
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
import { UmlaufmappePersonenDialog } from '@/components/dialogs/UmlaufmappePersonenDialog';
import { UmlaufRueckmeldungDialog } from '@/components/dialogs/UmlaufRueckmeldungDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconPlus, IconPencil, IconTrash, IconUsers, IconClipboardCheck,
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconCalendar, IconChevronDown, IconChevronUp, IconMessageCircle,
  IconFolderOpen, IconClock
} from '@tabler/icons-react';

const APPGROUP_ID = '69d34a4cc7efd848c9f56121';
const REPAIR_ENDPOINT = '/claude/build/repair';

type DialogMode = 'create-mappe' | 'edit-mappe' | 'create-person' | 'create-rueckmeldung' | null;

export default function DashboardOverview() {
  const {
    umlaufmappe, umlaufmappePersonen, personenstamm, umlaufRueckmeldung,
    umlaufmappeMap, personenstammMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedUmlaufmappePersonen = enrichUmlaufmappePersonen(umlaufmappePersonen, { umlaufmappeMap, personenstammMap });
  const enrichedUmlaufRueckmeldung = enrichUmlaufRueckmeldung(umlaufRueckmeldung, { umlaufmappeMap, personenstammMap });

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editMappe, setEditMappe] = useState<Umlaufmappe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Umlaufmappe | null>(null);
  const [activeMappeId, setActiveMappeId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('alle');

  // Preselect umlaufmappe for sub-dialogs
  const [subDialogMappeId, setSubDialogMappeId] = useState<string | null>(null);

  const personenByMappe = useMemo(() => {
    const map: Record<string, EnrichedUmlaufmappePersonen[]> = {};
    for (const p of enrichedUmlaufmappePersonen) {
      const id = extractRecordId(p.fields.umlaufmappe_ref);
      if (id) {
        if (!map[id]) map[id] = [];
        map[id].push(p);
      }
    }
    return map;
  }, [enrichedUmlaufmappePersonen]);

  const rueckmeldungenByMappe = useMemo(() => {
    const map: Record<string, EnrichedUmlaufRueckmeldung[]> = {};
    for (const r of enrichedUmlaufRueckmeldung) {
      const id = extractRecordId(r.fields.umlaufmappe_ref);
      if (id) {
        if (!map[id]) map[id] = [];
        map[id].push(r);
      }
    }
    return map;
  }, [enrichedUmlaufRueckmeldung]);

  const kanbanColumns = useMemo(() => {
    const statusMap: Record<string, Umlaufmappe[]> = {
      offen: [],
      in_bearbeitung: [],
      erledigt: [],
    };
    for (const m of umlaufmappe) {
      const key = m.fields.status?.key ?? 'offen';
      if (statusMap[key]) statusMap[key].push(m);
      else statusMap['offen'].push(m);
    }
    return statusMap;
  }, [umlaufmappe]);

  const statsTotal = umlaufmappe.length;
  const statsOffen = kanbanColumns['offen'].length;
  const statsInBearbeitung = kanbanColumns['in_bearbeitung'].length;
  const statsErledigt = kanbanColumns['erledigt'].length;

  const filteredMappe = useMemo(() => {
    if (filterStatus === 'alle') return umlaufmappe;
    return umlaufmappe.filter(m => (m.fields.status?.key ?? 'offen') === filterStatus);
  }, [umlaufmappe, filterStatus]);

  const handleDeleteMappe = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteUmlaufmappeEntry(deleteTarget.record_id);
    fetchAll();
    setDeleteTarget(null);
  };

  const openAddPerson = (mappeId: string) => {
    setSubDialogMappeId(mappeId);
    setDialogMode('create-person');
  };

  const openAddRueckmeldung = (mappeId: string) => {
    setSubDialogMappeId(mappeId);
    setDialogMode('create-rueckmeldung');
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Umlaufmappen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Verwalte Freigabe- und Kenntnisnahme-Prozesse</p>
        </div>
        <Button onClick={() => { setEditMappe(null); setDialogMode('create-mappe'); }} className="shrink-0">
          <IconPlus size={16} className="mr-1 shrink-0" />
          Neue Umlaufmappe
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(statsTotal)}
          description="Umlaufmappen"
          icon={<IconFolderOpen size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={String(statsOffen)}
          description="Neu erstellt"
          icon={<IconClock size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="In Bearbeitung"
          value={String(statsInBearbeitung)}
          description="Läuft gerade"
          icon={<IconClipboardCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Erledigt"
          value={String(statsErledigt)}
          description="Abgeschlossen"
          icon={<IconCheck size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'alle', label: 'Alle' },
          { key: 'offen', label: 'Offen' },
          { key: 'in_bearbeitung', label: 'In Bearbeitung' },
          { key: 'erledigt', label: 'Erledigt' },
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={filterStatus === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(key)}
          >
            {label}
            {key !== 'alle' && (
              <span className="ml-1.5 text-xs opacity-70">
                {key === 'offen' ? statsOffen : key === 'in_bearbeitung' ? statsInBearbeitung : statsErledigt}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Mappe List */}
      {filteredMappe.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <IconFolderOpen size={48} className="text-muted-foreground" stroke={1.5} />
          <p className="text-muted-foreground text-sm">Noch keine Umlaufmappen vorhanden</p>
          <Button size="sm" onClick={() => { setEditMappe(null); setDialogMode('create-mappe'); }}>
            <IconPlus size={14} className="mr-1" /> Erste Mappe erstellen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMappe.map((mappe) => {
            const statusKey = mappe.fields.status?.key ?? 'offen';
            const statusLabel = mappe.fields.status?.label ?? 'Offen';
            const isExpanded = expandedId === mappe.record_id;
            const personen = personenByMappe[mappe.record_id] ?? [];
            const rueckmeldungen = rueckmeldungenByMappe[mappe.record_id] ?? [];
            const isOverdue = mappe.fields.faelligkeitsdatum && mappe.fields.faelligkeitsdatum < today && statusKey !== 'erledigt';
            const isActive = activeMappeId === mappe.record_id;

            return (
              <div
                key={mappe.record_id}
                className={`rounded-xl border bg-card overflow-hidden transition-all ${isActive ? 'ring-2 ring-primary' : ''}`}
              >
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                      statusKey === 'erledigt' ? 'bg-green-500' :
                      statusKey === 'in_bearbeitung' ? 'bg-amber-500' :
                      'bg-blue-500'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {mappe.fields.titel ?? '(Ohne Titel)'}
                        </span>
                        <StatusBadge statusKey={statusKey} label={statusLabel} />
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs shrink-0">Überfällig</Badge>
                        )}
                      </div>

                      {mappe.fields.zweck && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{mappe.fields.zweck}</p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {mappe.fields.erstellungsdatum && (
                          <span className="flex items-center gap-1">
                            <IconCalendar size={12} className="shrink-0" />
                            Erstellt: {formatDate(mappe.fields.erstellungsdatum)}
                          </span>
                        )}
                        {mappe.fields.faelligkeitsdatum && (
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                            <IconClock size={12} className="shrink-0" />
                            Fällig: {formatDate(mappe.fields.faelligkeitsdatum)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <IconUsers size={12} className="shrink-0" />
                          {personen.length} {personen.length === 1 ? 'Person' : 'Personen'}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconMessageCircle size={12} className="shrink-0" />
                          {rueckmeldungen.length} {rueckmeldungen.length === 1 ? 'Rückmeldung' : 'Rückmeldungen'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditMappe(mappe); setDialogMode('edit-mappe'); }}
                        title="Bearbeiten"
                      >
                        <IconPencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(mappe)}
                        title="Löschen"
                      >
                        <IconTrash size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setExpandedId(isExpanded ? null : mappe.record_id);
                          setActiveMappeId(isExpanded ? null : mappe.record_id);
                        }}
                        title={isExpanded ? 'Zuklappen' : 'Details anzeigen'}
                      >
                        {isExpanded ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t bg-muted/30 p-4 space-y-4">
                    {/* Progress */}
                    {(mappe.fields.min_zustimmungen || mappe.fields.min_kenntnisnahmen) && (
                      <ProgressSection
                        personen={personen}
                        rueckmeldungen={rueckmeldungen}
                        minZustimmungen={mappe.fields.min_zustimmungen}
                        minKenntnisnahmen={mappe.fields.min_kenntnisnahmen}
                      />
                    )}

                    {/* Persons */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-foreground">Beteiligte Personen</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openAddPerson(mappe.record_id)}
                        >
                          <IconPlus size={12} className="mr-1" /> Person hinzufügen
                        </Button>
                      </div>
                      {personen.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Noch keine Personen zugeordnet</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {personen.map((p) => (
                            <PersonCard key={p.record_id} person={p} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Feedback */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-foreground">Rückmeldungen</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openAddRueckmeldung(mappe.record_id)}
                        >
                          <IconPlus size={12} className="mr-1" /> Rückmeldung hinzufügen
                        </Button>
                      </div>
                      {rueckmeldungen.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Noch keine Rückmeldungen</p>
                      ) : (
                        <div className="space-y-2">
                          {rueckmeldungen.map((r) => (
                            <RueckmeldungCard key={r.record_id} rueckmeldung={r} />
                          ))}
                        </div>
                      )}
                    </div>

                    {mappe.fields.bemerkung && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Bemerkungen</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{mappe.fields.bemerkung}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <UmlaufmappeDialog
        open={dialogMode === 'create-mappe' || dialogMode === 'edit-mappe'}
        onClose={() => { setDialogMode(null); setEditMappe(null); }}
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
        open={dialogMode === 'create-person'}
        onClose={() => { setDialogMode(null); setSubDialogMappeId(null); }}
        onSubmit={async (fields) => {
          await LivingAppsService.createUmlaufmappePersonenEntry(fields);
          fetchAll();
        }}
        defaultValues={subDialogMappeId ? { umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, subDialogMappeId) } : undefined}
        umlaufmappeList={umlaufmappe}
        personenstammList={personenstamm}
        enablePhotoScan={AI_PHOTO_SCAN['UmlaufmappePersonen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['UmlaufmappePersonen']}
      />

      <UmlaufRueckmeldungDialog
        open={dialogMode === 'create-rueckmeldung'}
        onClose={() => { setDialogMode(null); setSubDialogMappeId(null); }}
        onSubmit={async (fields) => {
          await LivingAppsService.createUmlaufRueckmeldungEntry(fields);
          fetchAll();
        }}
        defaultValues={subDialogMappeId ? { umlaufmappe_ref: createRecordUrl(APP_IDS.UMLAUFMAPPE, subDialogMappeId) } : undefined}
        umlaufmappeList={umlaufmappe}
        personenstammList={personenstamm}
        enablePhotoScan={AI_PHOTO_SCAN['UmlaufRueckmeldung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['UmlaufRueckmeldung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Umlaufmappe löschen"
        description={`Soll "${deleteTarget?.fields.titel ?? 'diese Mappe'}" wirklich gelöscht werden? Alle zugehörigen Personen und Rückmeldungen bleiben erhalten.`}
        onConfirm={handleDeleteMappe}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// --- Sub-components ---

function StatusBadge({ statusKey, label }: { statusKey: string; label: string }) {
  const cls =
    statusKey === 'erledigt'
      ? 'bg-green-100 text-green-700 border-green-200'
      : statusKey === 'in_bearbeitung'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function ProgressSection({
  personen, rueckmeldungen, minZustimmungen, minKenntnisnahmen
}: {
  personen: EnrichedUmlaufmappePersonen[];
  rueckmeldungen: EnrichedUmlaufRueckmeldung[];
  minZustimmungen?: number;
  minKenntnisnahmen?: number;
}) {
  const zustimmungen = rueckmeldungen.filter(r => r.fields.entscheidung?.key === 'ja').length;
  const kenntnisnahmen = rueckmeldungen.filter(r => r.fields.aufgabentyp?.key === 'kenntnisnahme' && r.fields.entscheidung?.key === 'ja').length;
  const totalPersonen = personen.length;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Fortschritt</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {minZustimmungen !== undefined && minZustimmungen > 0 && (
          <ProgressBar
            label="Zustimmungen"
            current={zustimmungen}
            target={minZustimmungen}
            total={totalPersonen}
            color="green"
          />
        )}
        {minKenntnisnahmen !== undefined && minKenntnisnahmen > 0 && (
          <ProgressBar
            label="Kenntnisnahmen"
            current={kenntnisnahmen}
            target={minKenntnisnahmen}
            total={totalPersonen}
            color="blue"
          />
        )}
      </div>
    </div>
  );
}

function ProgressBar({
  label, current, target, total, color
}: {
  label: string;
  current: number;
  target: number;
  total: number;
  color: 'green' | 'blue';
}) {
  const pct = Math.min(100, total > 0 ? Math.round((current / target) * 100) : 0);
  const barColor = color === 'green' ? 'bg-green-500' : 'bg-blue-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{current}/{target}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PersonCard({ person }: { person: EnrichedUmlaufmappePersonen }) {
  return (
    <div className="flex items-center gap-2 bg-background rounded-lg border px-3 py-2">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <IconUsers size={13} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{person.person_refName || '—'}</p>
        {person.fields.aufgabentyp && (
          <p className="text-xs text-muted-foreground truncate">{person.fields.aufgabentyp.label}</p>
        )}
      </div>
    </div>
  );
}

function RueckmeldungCard({ rueckmeldung }: { rueckmeldung: EnrichedUmlaufRueckmeldung }) {
  const entscheidung = rueckmeldung.fields.entscheidung;
  const isJa = entscheidung?.key === 'ja';
  const isNein = entscheidung?.key === 'nein';

  return (
    <div className="flex items-start gap-3 bg-background rounded-lg border px-3 py-2">
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
        isJa ? 'bg-green-100' : isNein ? 'bg-red-100' : 'bg-muted'
      }`}>
        {isJa ? (
          <IconCheck size={11} className="text-green-600" />
        ) : isNein ? (
          <IconAlertCircle size={11} className="text-red-500" />
        ) : (
          <IconClock size={11} className="text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium truncate">{rueckmeldung.person_refName || '—'}</p>
          {entscheidung && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
              isJa ? 'bg-green-100 text-green-700' : isNein ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
            }`}>
              {entscheidung.label}
            </span>
          )}
        </div>
        {rueckmeldung.fields.kommentar && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rueckmeldung.fields.kommentar}</p>
        )}
        {rueckmeldung.fields.rueckmeldedatum && (
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(rueckmeldung.fields.rueckmeldedatum)}</p>
        )}
      </div>
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
