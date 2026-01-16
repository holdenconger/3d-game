import React, { useEffect, useMemo, useState } from "react";
import Scene from "./game/Scene";
import { laptopBuildOrder, laptopParts, pcBuildOrder, pcParts } from "./game/parts";
import { BuildMode, PartDefinition } from "./game/types";

type InstalledState = Record<BuildMode, string[]>;
type PowerState = Record<BuildMode, boolean>;

const formatCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const App: React.FC = () => {
  const [mode, setMode] = useState<BuildMode>("pc");
  const [guided, setGuided] = useState(true);
  const [installed, setInstalled] = useState<InstalledState>({
    pc: [],
    laptop: []
  });
  const [powerState, setPowerState] = useState<PowerState>({
    pc: false,
    laptop: false
  });
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [ledColor, setLedColor] = useState("#37ffe7");
  const [fanSpeed, setFanSpeed] = useState(1.2);
  const [waterCooling, setWaterCooling] = useState(true);

  const parts = mode === "pc" ? pcParts : laptopParts;
  const buildOrder = mode === "pc" ? pcBuildOrder : laptopBuildOrder;
  const installedList = installed[mode];
  const installedSet = useMemo(() => new Set(installedList), [installedList]);

  const nextPartId = useMemo(
    () => buildOrder.find((id) => !installedSet.has(id)) ?? null,
    [buildOrder, installedSet]
  );
  const nextPartName = useMemo(() => {
    if (!nextPartId) {
      return null;
    }
    return parts.find((part) => part.id === nextPartId)?.name ?? nextPartId.replace(/-/g, " ");
  }, [nextPartId, parts]);

  const progress = useMemo(() => {
    if (parts.length === 0) {
      return 0;
    }
    const installedCount = parts.filter((part) => installedSet.has(part.id)).length;
    return installedCount / parts.length;
  }, [parts, installedSet]);

  const requiredCounts = useMemo(() => {
    const required = parts.filter((part) => !part.optional);
    const installedRequired = required.filter((part) => installedSet.has(part.id));
    return {
      required: required.length,
      installed: installedRequired.length
    };
  }, [parts, installedSet]);

  const summary = useMemo(() => {
    let totalPower = 0;
    let totalCost = 0;
    parts.forEach((part) => {
      if (installedSet.has(part.id)) {
        totalPower += part.powerDraw;
        totalCost += part.cost;
      }
    });
    const psuCapacity = mode === "pc" && installedSet.has("psu") ? 850 : 0;
    const batteryCapacity = mode === "laptop" && installedSet.has("battery") ? 99 : 0;
    return {
      totalPower,
      totalCost,
      psuCapacity,
      batteryCapacity
    };
  }, [parts, installedSet, mode]);

  const powerOn = powerState[mode];
  const powerReady =
    mode === "pc"
      ? installedSet.has("psu") && installedSet.has("motherboard") && installedSet.has("cpu")
      : installedSet.has("battery") &&
        installedSet.has("laptop-motherboard") &&
        installedSet.has("cpu");

  const selectedPart = useMemo(
    () => parts.find((part) => part.id === selectedPartId) ?? null,
    [parts, selectedPartId]
  );

  useEffect(() => {
    if (guided) {
      setSelectedPartId(nextPartId);
    } else if (selectedPartId && !parts.some((part) => part.id === selectedPartId)) {
      setSelectedPartId(null);
    }
  }, [guided, nextPartId, parts, selectedPartId]);

  const updateInstalled = (list: string[]) => {
    setInstalled((prev) => ({ ...prev, [mode]: list }));
  };

  const togglePart = (id: string) => {
    setSelectedPartId(id);
    setInstalled((prev) => {
      const current = new Set(prev[mode]);
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      return { ...prev, [mode]: Array.from(current) };
    });
  };

  const installPart = (id: string) => {
    setSelectedPartId(id);
    setInstalled((prev) => {
      const current = new Set(prev[mode]);
      current.add(id);
      return { ...prev, [mode]: Array.from(current) };
    });
  };

  const autoBuild = () => {
    updateInstalled(buildOrder);
    setSelectedPartId(null);
  };

  const resetBuild = () => {
    updateInstalled([]);
    setPowerState((prev) => ({ ...prev, [mode]: false }));
    setSelectedPartId(null);
  };

  const stepIndex = nextPartId ? buildOrder.indexOf(nextPartId) + 1 : buildOrder.length;

  const statusLabel = (part: PartDefinition) => {
    if (installedSet.has(part.id)) {
      return "Installed";
    }
    if (guided && part.id === nextPartId) {
      return "Next";
    }
    if (part.optional) {
      return "Optional";
    }
    return "Missing";
  };

  return (
    <div className="app">
      <header className="header">
        <div className="title">
          <h1>3D PC / Laptop Builder</h1>
          <p>Assemble every component, route cables, and power it up.</p>
        </div>
        <div className="controls">
          <button
            className={`btn ${mode === "pc" ? "" : "secondary"}`}
            onClick={() => setMode("pc")}
          >
            Desktop Tower
          </button>
          <button
            className={`btn ${mode === "laptop" ? "" : "secondary"}`}
            onClick={() => setMode("laptop")}
          >
            Laptop Rig
          </button>
          <label className={`toggle ${guided ? "active" : ""}`}>
            <input
              type="checkbox"
              checked={guided}
              onChange={(event) => setGuided(event.target.checked)}
            />
            Guided Build
          </label>
        </div>
      </header>

      <div className="layout">
        <aside className="panel">
          <h2>Build Steps</h2>
          <div className="summary-card">
            <h3>
              Step {stepIndex} / {buildOrder.length}
            </h3>
            <p>{nextPartName ? `Next: ${nextPartName}` : "Build complete!"}</p>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          <div className="controls" style={{ marginTop: 12 }}>
            <button
              className="btn"
              disabled={!nextPartId}
              onClick={() => nextPartId && installPart(nextPartId)}
            >
              Install Next
            </button>
            <button className="btn secondary" onClick={autoBuild}>
              Auto Build
            </button>
            <button className="btn ghost" onClick={resetBuild}>
              Reset
            </button>
          </div>

          <div style={{ marginTop: 16 }} className="part-list">
            {parts.map((part) => {
              const installedNow = installedSet.has(part.id);
              const isNext = guided && part.id === nextPartId;
              const statusClass =
                installedNow || isNext || part.optional ? "" : "offline";
              return (
                <div
                  key={`${mode}-${part.id}`}
                  className={`part-item ${selectedPartId === part.id ? "active" : ""}`}
                  onClick={() => setSelectedPartId(part.id)}
                >
                  <div className="part-row">
                    <strong>{part.name}</strong>
                    <span className={`status ${statusClass}`}>
                      {statusLabel(part)}
                    </span>
                  </div>
                  <div className="part-meta">{part.description}</div>
                  <div className="part-row">
                    <span className="part-meta">
                      {part.category}
                      {part.optional ? " • Optional" : ""}
                      {isNext ? " • Guided Step" : ""}
                    </span>
                    <button
                      className="btn secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePart(part.id);
                      }}
                    >
                      {installedNow ? "Remove" : "Install"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="scene">
          <Scene
            mode={mode}
            installedParts={installedList}
            selectedPartId={selectedPartId}
            onTogglePart={togglePart}
            powerOn={powerOn}
            ledColor={ledColor}
            fanSpeed={fanSpeed}
            waterCooling={waterCooling}
          />
        </main>

        <aside className="panel">
          <h2>System Dashboard</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <h3>Required Parts</h3>
              <p>
                {requiredCounts.installed}/{requiredCounts.required} installed
              </p>
            </div>
            <div className="summary-card">
              <h3>Power Draw</h3>
              <p>{summary.totalPower} W</p>
            </div>
            <div className="summary-card">
              <h3>Parts Cost</h3>
              <p>{formatCurrency.format(summary.totalCost)}</p>
            </div>
            <div className="summary-card">
              <h3>{mode === "pc" ? "PSU Headroom" : "Battery Capacity"}</h3>
              <p>
                {mode === "pc"
                  ? `${Math.max(summary.psuCapacity - summary.totalPower, 0)} W`
                  : `${summary.batteryCapacity} Wh`}
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16 }} className="settings-group">
            <div className="settings-row">
              <span>Power</span>
              <button
                className={`btn ${powerOn ? "" : "secondary"}`}
                onClick={() =>
                  powerReady &&
                  setPowerState((prev) => ({ ...prev, [mode]: !prev[mode] }))
                }
                disabled={!powerReady}
              >
                {powerOn ? "Shut Down" : "Power On"}
              </button>
            </div>
            {!powerReady && (
              <span className="part-meta">
                Install motherboard, CPU, and power source to enable power.
              </span>
            )}

            <div className="settings-row">
              <span>LED Color</span>
              <input
                type="color"
                value={ledColor}
                onChange={(event) => setLedColor(event.target.value)}
              />
            </div>

            <div className="settings-row">
              <span>Fan Speed</span>
              <input
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={fanSpeed}
                onChange={(event) => setFanSpeed(Number(event.target.value))}
              />
            </div>

            {mode === "pc" && (
              <label className={`toggle ${waterCooling ? "active" : ""}`}>
                <input
                  type="checkbox"
                  checked={waterCooling}
                  onChange={(event) => setWaterCooling(event.target.checked)}
                />
                Water Cooling Loop
              </label>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <h2>Selected Part</h2>
            {selectedPart ? (
              <div className="summary-card">
                <h3>{selectedPart.name}</h3>
                <p>{selectedPart.description}</p>
                <p className="part-meta">
                  {selectedPart.category} • {selectedPart.powerDraw} W •{" "}
                  {formatCurrency.format(selectedPart.cost)}
                </p>
              </div>
            ) : (
              <p className="part-meta">Select a part in the list or 3D scene.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default App;
