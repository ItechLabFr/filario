"use client";

import { useEffect, useMemo, useState } from "react";
import { BambuCameraView } from "@/components/bambu-camera-view";
import { PrinterDeleteButton } from "@/components/printer-delete-button";

type Telemetry = Record<string, any>;

type Props = {
  printer: {
    id: string;
    name: string;
    manufacturer: string | null;
    model: string | null;
    status: string;
  };
  initialTelemetry: Telemetry;
  initialTelemetryUpdatedAt: string | null;
  initialOnline: boolean;
  camera: {
    enabled: boolean;
    host: string | null;
    lastError: string | null;
  };
};

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function temp(current: unknown, target: unknown) {
  const c = number(current);
  const t = number(target);
  if (c == null) return "—";
  if (t != null && t > 0) return `${Math.round(c)}° / ${Math.round(t)}°`;
  return `${Math.round(c)}°`;
}

function remaining(minutes: unknown) {
  const value = number(minutes);
  if (value == null || value <= 0) return "—";
  const rounded = Math.max(1, Math.round(value));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return hours ? `${hours} h ${String(rest).padStart(2, "0")}` : `${rest} min`;
}

function stateLabel(state: unknown) {
  const value = String(state || "").toUpperCase();
  if (value === "RUNNING" || value === "PREPARE") return "Impression";
  if (value === "PAUSE") return "En pause";
  if (value === "FINISH") return "Terminée";
  if (value === "FAILED") return "Erreur";
  if (value === "IDLE") return "Disponible";
  return value || "Synchronisation";
}

function trayColor(value: unknown) {
  const raw = String(value || "").replace("#", "");
  if (!/^[0-9a-f]{6,8}$/i.test(raw)) return "#69736e";
  return `#${raw.slice(0, 6)}`;
}

function trays(telemetry: Telemetry) {
  const units = telemetry?.print?.ams?.ams;
  if (!Array.isArray(units)) return [];

  return units.flatMap((unit: any) => {
    const trayList = Array.isArray(unit?.tray) ? unit.tray : [];
    return trayList.map((tray: any) => ({
      id: `${unit?.id ?? "0"}-${tray?.id ?? "0"}`,
      unit: unit?.id == null ? "AMS" : `AMS ${Number(unit.id) + 1}`,
      slot: tray?.id == null ? "?" : String(Number(tray.id) + 1),
      type: String(tray?.tray_type || tray?.tray_sub_brands || "Vide"),
      color: trayColor(tray?.tray_color),
      remain: number(tray?.remain)
    }));
  });
}

export function BambuPrinterCard({
  printer,
  initialTelemetry,
  initialTelemetryUpdatedAt,
  initialOnline,
  camera
}: Props) {
  const [telemetry, setTelemetry] = useState<Telemetry>(initialTelemetry || {});
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialTelemetryUpdatedAt);
  const [online, setOnline] = useState(initialOnline);

  useEffect(() => {
    let stopped = false;

    async function refresh() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/printers/${printer.id}/telemetry`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (stopped) return;
        setTelemetry(payload.telemetry || {});
        setUpdatedAt(payload.telemetryUpdatedAt || null);
        setOnline(Boolean(payload.online));
      } catch {
        // Keep the last known values visible.
      }
    }

    const timer = window.setInterval(refresh, 4000);
    refresh();

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [printer.id]);

  const print = telemetry?.print || {};
  const amsTrays = useMemo(() => trays(telemetry), [telemetry]);
  const state = String(print?.gcode_state || "").toUpperCase();
  const percent = Math.max(0, Math.min(100, number(print?.mc_percent) ?? 0));
  const printing = state === "RUNNING" || state === "PREPARE" || state === "PAUSE";
  const layer = number(print?.layer_num);
  const totalLayers = number(print?.total_layer_num);
  const jobName = String(print?.subtask_name || print?.gcode_file || "").trim();
  const wifi = String(print?.wifi_signal || "").trim();

  return (
    <article className="printer-station-card">
      <header className="printer-station-head">
        <div>
          <div className="printer-station-brand">
            <span className={online ? "source-dot" : "source-dot offline"} />
            Bambu Lab · Cloud
          </div>
          <h3>{printer.name}</h3>
          <p>{printer.model || "Bambu Lab"}</p>
        </div>

        <div className="printer-station-head-actions">
          <span className={online ? "status-chip status-online" : "status-chip status-offline"}>
            {online ? stateLabel(print?.gcode_state) : "Hors ligne"}
          </span>
          <PrinterDeleteButton printerId={printer.id} printerName={printer.name} cloud />
        </div>
      </header>

      <div className="printer-station-body">
        <BambuCameraView
          printerId={printer.id}
          enabled={camera.enabled}
          host={camera.host}
          initialError={camera.lastError}
        />

        <div className="printer-telemetry-panel">
          <div className="telemetry-grid">
            <div className="telemetry-item">
              <span>Buse</span>
              <strong>{temp(print?.nozzle_temper, print?.nozzle_target_temper)}</strong>
            </div>
            <div className="telemetry-item">
              <span>Plateau</span>
              <strong>{temp(print?.bed_temper, print?.bed_target_temper)}</strong>
            </div>
            <div className="telemetry-item">
              <span>Chambre</span>
              <strong>{temp(print?.chamber_temper, null)}</strong>
            </div>
            <div className="telemetry-item">
              <span>Wi‑Fi</span>
              <strong>{wifi || "—"}</strong>
            </div>
          </div>

          <div className={printing ? "live-job active" : "live-job"}>
            <div className="live-job-head">
              <div>
                <span>{printing ? "Impression en cours" : "État machine"}</span>
                <strong>{printing ? (jobName || "Projet Bambu") : (online ? "Prête" : "Hors ligne")}</strong>
              </div>
              {printing && <strong>{Math.round(percent)}%</strong>}
            </div>

            {printing && (
              <>
                <div className="progress live-progress">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <div className="live-job-meta">
                  <span>Reste {remaining(print?.mc_remaining_time)}</span>
                  {layer != null && totalLayers != null && totalLayers > 0 && (
                    <span>Couche {layer}/{totalLayers}</span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="printer-live-meta">
            <span>Dernière donnée</span>
            <strong>
              {updatedAt
                ? new Date(updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                : "En attente"}
            </strong>
          </div>
        </div>
      </div>

      {amsTrays.length > 0 && (
        <div className="printer-ams-panel">
          <div className="ams-strip-title">
            <span>AMS</span>
            <small>{amsTrays.length} slot{amsTrays.length > 1 ? "s" : ""}</small>
          </div>

          <div className="ams-trays">
            {amsTrays.map((tray) => (
              <div className="ams-tray" key={tray.id} title={`${tray.unit} · Slot ${tray.slot} · ${tray.type}`}>
                <i style={{ background: tray.color }} />
                <div>
                  <strong>{tray.slot}</strong>
                  <span>{tray.type || "Vide"}</span>
                </div>
                {tray.remain != null && <small>{Math.round(tray.remain)}%</small>}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
