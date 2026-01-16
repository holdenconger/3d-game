import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useCursor } from "@react-three/drei";
import { BuildMode } from "./types";

interface SceneProps {
  mode: BuildMode;
  installedParts: string[];
  selectedPartId: string | null;
  onTogglePart: (id: string) => void;
  powerOn: boolean;
  ledColor: string;
  fanSpeed: number;
  waterCooling: boolean;
}

interface PartAnchorProps {
  id: string;
  label: string;
  installed: boolean;
  highlighted: boolean;
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  placeholderColor?: string;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

const PartAnchor: React.FC<PartAnchorProps> = ({
  id,
  label,
  installed,
  highlighted,
  position,
  rotation = [0, 0, 0],
  size = [0.5, 0.3, 0.5],
  placeholderColor = "#4f6b82",
  onToggle,
  children
}) => {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const highlightSize: [number, number, number] = [
    size[0] * 1.1,
    size[1] * 1.1,
    size[2] * 1.1
  ];

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onToggle(id);
      }}
    >
      {installed ? (
        children
      ) : (
        <mesh>
          <boxGeometry args={size} />
          <meshStandardMaterial
            color={placeholderColor}
            opacity={0.25}
            transparent
            wireframe
          />
        </mesh>
      )}
      <mesh visible={false}>
        <boxGeometry args={size} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {(hovered || highlighted) && (
        <Html distanceFactor={8}>
          <div className="part-label">{label}</div>
        </Html>
      )}
      {highlighted && (
        <mesh>
          <boxGeometry args={highlightSize} />
          <meshBasicMaterial color="#37ffe7" wireframe />
        </mesh>
      )}
    </group>
  );
};

const RotatingFan: React.FC<{
  speed: number;
  radius?: number;
  thickness?: number;
  color?: string;
}> = ({ speed, radius = 0.6, thickness = 0.15, color = "#1f2937" }) => {
  const fanRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (fanRef.current) {
      fanRef.current.rotation.z += delta * speed;
    }
  });

  return (
    <group ref={fanRef}>
      <mesh>
        <cylinderGeometry args={[radius, radius, thickness, 24]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
      </mesh>
      {Array.from({ length: 3 }).map((_, index) => (
        <mesh key={index} rotation={[0, 0, (Math.PI * 2 * index) / 3]}>
          <boxGeometry args={[radius * 1.2, thickness * 0.4, thickness * 0.2]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
      <mesh>
        <cylinderGeometry args={[radius * 0.15, radius * 0.15, thickness * 1.4, 16]} />
        <meshStandardMaterial color="#101820" />
      </mesh>
    </group>
  );
};

const PcRig: React.FC<{
  installedParts: string[];
  selectedPartId: string | null;
  onTogglePart: (id: string) => void;
  powerOn: boolean;
  ledColor: string;
  fanSpeed: number;
  waterCooling: boolean;
}> = ({
  installedParts,
  selectedPartId,
  onTogglePart,
  powerOn,
  ledColor,
  fanSpeed,
  waterCooling
}) => {
  const installedSet = useMemo(() => new Set(installedParts), [installedParts]);
  const isInstalled = (id: string) => installedSet.has(id);

  const caseOpacity = isInstalled("case") ? 0.55 : 0.15;
  const ledIntensity = powerOn ? 1.2 : 0.2;
  const fanSpin = powerOn ? fanSpeed * 2.5 : 0;

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[6, 8, 3]} />
        <meshStandardMaterial
          color="#1a2331"
          metalness={0.2}
          roughness={0.6}
          transparent
          opacity={caseOpacity}
        />
      </mesh>

      <PartAnchor
        id="motherboard"
        label="Motherboard"
        installed={isInstalled("motherboard")}
        highlighted={selectedPartId === "motherboard"}
        position={[0, 0.2, -1]}
        size={[4.8, 6.2, 0.25]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[4.6, 6, 0.25]} />
          <meshStandardMaterial color="#1d3b2f" metalness={0.3} roughness={0.5} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="cpu"
        label="CPU"
        installed={isInstalled("cpu")}
        highlighted={selectedPartId === "cpu"}
        position={[-0.7, 1.3, -0.7]}
        size={[0.8, 0.3, 0.8]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.7, 0.2, 0.7]} />
          <meshStandardMaterial color="#2c3949" metalness={0.5} roughness={0.2} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="thermal-paste"
        label="Thermal Paste"
        installed={isInstalled("thermal-paste")}
        highlighted={selectedPartId === "thermal-paste"}
        position={[-0.7, 1.5, -0.7]}
        size={[0.5, 0.08, 0.5]}
        onToggle={onTogglePart}
        placeholderColor="#7fb7a1"
      >
        <mesh>
          <boxGeometry args={[0.45, 0.05, 0.45]} />
          <meshStandardMaterial color="#7fffd4" emissive="#33b6a0" emissiveIntensity={0.3} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="cpu-cooler"
        label="Air Cooler"
        installed={isInstalled("cpu-cooler")}
        highlighted={selectedPartId === "cpu-cooler"}
        position={[-0.7, 1.9, -0.7]}
        size={[1.2, 1.2, 1]}
        onToggle={onTogglePart}
      >
        <group>
          <mesh>
            <boxGeometry args={[1, 1, 0.8]} />
            <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.3} />
          </mesh>
          <group position={[0, 0, 0.5]}>
            <RotatingFan speed={fanSpin} radius={0.35} thickness={0.12} color="#1f2937" />
          </group>
        </group>
      </PartAnchor>

      <PartAnchor
        id="ram"
        label="RAM"
        installed={isInstalled("ram")}
        highlighted={selectedPartId === "ram"}
        position={[1.1, 0.9, -0.8]}
        size={[1.2, 0.4, 0.5]}
        onToggle={onTogglePart}
      >
        <group>
          <mesh position={[-0.3, 0, 0]}>
            <boxGeometry args={[0.2, 1.1, 0.4]} />
            <meshStandardMaterial color="#101820" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0.3, 0, 0]}>
            <boxGeometry args={[0.2, 1.1, 0.4]} />
            <meshStandardMaterial color="#101820" metalness={0.3} roughness={0.4} />
          </mesh>
        </group>
      </PartAnchor>

      <PartAnchor
        id="gpu"
        label="GPU"
        installed={isInstalled("gpu")}
        highlighted={selectedPartId === "gpu"}
        position={[0, -0.4, 0.2]}
        size={[4.8, 1.1, 1]}
        onToggle={onTogglePart}
      >
        <group>
          <mesh>
            <boxGeometry args={[4.3, 1, 0.9]} />
            <meshStandardMaterial color="#273142" metalness={0.4} roughness={0.3} />
          </mesh>
          {[-1.4, 0, 1.4].map((x) => (
            <mesh key={x} position={[x, 0, 0.5]}>
              <cylinderGeometry args={[0.25, 0.25, 0.2, 18]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          ))}
        </group>
      </PartAnchor>

      <PartAnchor
        id="psu"
        label="Power Supply"
        installed={isInstalled("psu")}
        highlighted={selectedPartId === "psu"}
        position={[0, -2.7, 0.9]}
        size={[3.2, 1.7, 2.2]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[3, 1.5, 2]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.3} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="storage-nvme"
        label="NVMe SSD"
        installed={isInstalled("storage-nvme")}
        highlighted={selectedPartId === "storage-nvme"}
        position={[-1.4, -0.6, -0.6]}
        size={[1.1, 0.2, 0.5]}
        onToggle={onTogglePart}
        placeholderColor="#4b6b7f"
      >
        <mesh>
          <boxGeometry args={[1, 0.15, 0.45]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.2} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="storage-ssd"
        label="2.5\" SSD"
        installed={isInstalled("storage-ssd")}
        highlighted={selectedPartId === "storage-ssd"}
        position={[1.6, -2.1, 1]}
        size={[1.4, 0.3, 1]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[1.2, 0.25, 0.9]} />
          <meshStandardMaterial color="#374151" metalness={0.3} roughness={0.4} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="storage-hdd"
        label="3.5\" HDD"
        installed={isInstalled("storage-hdd")}
        highlighted={selectedPartId === "storage-hdd"}
        position={[-1.6, -2.1, 1]}
        size={[1.6, 0.4, 1]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[1.4, 0.35, 0.95]} />
          <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.5} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="case-fan-front"
        label="Front Fan"
        installed={isInstalled("case-fan-front")}
        highlighted={selectedPartId === "case-fan-front"}
        position={[0, 2.7, 1.3]}
        size={[1.4, 1.4, 0.4]}
        onToggle={onTogglePart}
      >
        <group rotation={[Math.PI / 2, 0, 0]}>
          <RotatingFan speed={fanSpin} radius={0.6} thickness={0.15} color="#1f2937" />
        </group>
      </PartAnchor>

      <PartAnchor
        id="case-fan-top"
        label="Top Fan"
        installed={isInstalled("case-fan-top")}
        highlighted={selectedPartId === "case-fan-top"}
        position={[0, 3.6, 0]}
        size={[1.4, 1.4, 0.4]}
        rotation={[0, 0, Math.PI / 2]}
        onToggle={onTogglePart}
      >
        <group rotation={[0, Math.PI / 2, 0]}>
          <RotatingFan speed={fanSpin} radius={0.55} thickness={0.15} color="#1f2937" />
        </group>
      </PartAnchor>

      <PartAnchor
        id="water-cooler-radiator"
        label="Water Radiator"
        installed={isInstalled("water-cooler-radiator")}
        highlighted={selectedPartId === "water-cooler-radiator"}
        position={[0, 3.5, -0.7]}
        size={[4.8, 0.8, 1.2]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[4.4, 0.6, 1]} />
          <meshStandardMaterial
            color={waterCooling ? "#364152" : "#1f2937"}
            metalness={0.4}
            roughness={0.4}
          />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="water-cooler-pump"
        label="Pump + Reservoir"
        installed={isInstalled("water-cooler-pump")}
        highlighted={selectedPartId === "water-cooler-pump"}
        position={[0.4, 1.7, 0.2]}
        size={[1.1, 1.1, 0.8]}
        onToggle={onTogglePart}
      >
        <group>
          <mesh>
            <boxGeometry args={[0.9, 0.9, 0.6]} />
            <meshStandardMaterial
              color={waterCooling ? "#3b4a5a" : "#1f2937"}
              metalness={0.5}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.6, 12]} />
            <meshStandardMaterial color={waterCooling ? "#37ffe7" : "#475569"} />
          </mesh>
        </group>
      </PartAnchor>

      <PartAnchor
        id="led-strip"
        label="LED Strip"
        installed={isInstalled("led-strip")}
        highlighted={selectedPartId === "led-strip"}
        position={[-2.7, 0, 1.35]}
        size={[0.2, 6.2, 0.2]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.15, 6, 0.15]} />
          <meshStandardMaterial
            color={ledColor}
            emissive={ledColor}
            emissiveIntensity={ledIntensity}
          />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="front-io"
        label="Front I/O"
        installed={isInstalled("front-io")}
        highlighted={selectedPartId === "front-io"}
        position={[1.8, -3.6, 1.4]}
        size={[1, 0.4, 0.6]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.9, 0.3, 0.5]} />
          <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.5} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="power-button"
        label="Power Button"
        installed={isInstalled("power-button")}
        highlighted={selectedPartId === "power-button"}
        position={[2.2, -3.6, 1.4]}
        size={[0.4, 0.4, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.1, 20]} />
          <meshStandardMaterial
            color={powerOn ? "#37ffe7" : "#1f2937"}
            emissive={powerOn ? "#37ffe7" : "#000000"}
            emissiveIntensity={powerOn ? 1 : 0}
          />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="power-cables"
        label="Power Cables"
        installed={isInstalled("power-cables")}
        highlighted={selectedPartId === "power-cables"}
        position={[1.7, -1, -0.2]}
        size={[0.4, 2.2, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 2.2, 8]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="pcie-cables"
        label="PCIe Cables"
        installed={isInstalled("pcie-cables")}
        highlighted={selectedPartId === "pcie-cables"}
        position={[1.4, -0.2, 0.8]}
        size={[0.4, 1.5, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 1.5, 8]} />
          <meshStandardMaterial color="#0b1320" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="sata-cables"
        label="SATA Cables"
        installed={isInstalled("sata-cables")}
        highlighted={selectedPartId === "sata-cables"}
        position={[-1.8, -1.2, 0.6]}
        size={[0.4, 1.6, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 1.6, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="rgb-controller"
        label="RGB Controller"
        installed={isInstalled("rgb-controller")}
        highlighted={selectedPartId === "rgb-controller"}
        position={[1.7, -2.6, 0.3]}
        size={[0.7, 0.4, 0.5]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.6, 0.3, 0.4]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="fan-hub"
        label="Fan Hub"
        installed={isInstalled("fan-hub")}
        highlighted={selectedPartId === "fan-hub"}
        position={[-1.7, -2.6, 0.3]}
        size={[0.7, 0.4, 0.5]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.6, 0.3, 0.4]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="chipset-heatsink"
        label="Chipset Heatsink"
        installed={isInstalled("chipset-heatsink")}
        highlighted={selectedPartId === "chipset-heatsink"}
        position={[0.8, 0.1, -0.8]}
        size={[0.6, 0.3, 0.6]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.5, 0.2, 0.5]} />
          <meshStandardMaterial color="#303b4a" metalness={0.4} roughness={0.4} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="cmos-battery"
        label="CMOS Battery"
        installed={isInstalled("cmos-battery")}
        highlighted={selectedPartId === "cmos-battery"}
        position={[1.3, -0.6, -0.8]}
        size={[0.4, 0.2, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 18]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.3} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="bios-chip"
        label="BIOS Chip"
        installed={isInstalled("bios-chip")}
        highlighted={selectedPartId === "bios-chip"}
        position={[1.3, -1.1, -0.8]}
        size={[0.4, 0.2, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.3, 0.1, 0.3]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="usb-headers"
        label="USB Headers"
        installed={isInstalled("usb-headers")}
        highlighted={selectedPartId === "usb-headers"}
        position={[-0.8, -2, -0.8]}
        size={[0.6, 0.2, 0.6]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.45, 0.15, 0.45]} />
          <meshStandardMaterial color="#0b1320" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="audio-headers"
        label="Audio Headers"
        installed={isInstalled("audio-headers")}
        highlighted={selectedPartId === "audio-headers"}
        position={[-1.2, -2.3, -0.8]}
        size={[0.6, 0.2, 0.6]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.45, 0.15, 0.45]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="wifi-card"
        label="Wi-Fi Card"
        installed={isInstalled("wifi-card")}
        highlighted={selectedPartId === "wifi-card"}
        position={[-1.5, 0.4, -0.8]}
        size={[0.8, 0.2, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.7, 0.1, 0.3]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="sound-card"
        label="Sound Card"
        installed={isInstalled("sound-card")}
        highlighted={selectedPartId === "sound-card"}
        position={[-1.2, -1, 0.7]}
        size={[0.8, 0.3, 1.2]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.7, 0.2, 1.1]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </PartAnchor>
    </group>
  );
};

const LaptopRig: React.FC<{
  installedParts: string[];
  selectedPartId: string | null;
  onTogglePart: (id: string) => void;
  powerOn: boolean;
  ledColor: string;
  fanSpeed: number;
}> = ({
  installedParts,
  selectedPartId,
  onTogglePart,
  powerOn,
  ledColor,
  fanSpeed
}) => {
  const installedSet = useMemo(() => new Set(installedParts), [installedParts]);
  const isInstalled = (id: string) => installedSet.has(id);
  const fanSpin = powerOn ? fanSpeed * 2.2 : 0;

  return (
    <group position={[0, 0, 0]}>
      <PartAnchor
        id="laptop-chassis"
        label="Chassis"
        installed={isInstalled("laptop-chassis")}
        highlighted={selectedPartId === "laptop-chassis"}
        position={[0, -0.6, 0]}
        size={[7.2, 1.2, 5.2]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[7, 0.6, 5]} />
          <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="screen"
        label="Display Panel"
        installed={isInstalled("screen")}
        highlighted={selectedPartId === "screen"}
        position={[0, 1.6, -2.2]}
        rotation={[Math.PI / 2.6, 0, 0]}
        size={[6.2, 0.3, 3.8]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[6, 0.2, 3.6]} />
          <meshStandardMaterial
            color={powerOn ? "#1d4ed8" : "#0b1020"}
            emissive={powerOn ? "#1d4ed8" : "#000000"}
            emissiveIntensity={powerOn ? 0.6 : 0}
          />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="laptop-motherboard"
        label="Mainboard"
        installed={isInstalled("laptop-motherboard")}
        highlighted={selectedPartId === "laptop-motherboard"}
        position={[-0.6, -0.2, 0.6]}
        size={[4.4, 0.4, 2.6]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[4.2, 0.25, 2.4]} />
          <meshStandardMaterial color="#1d3b2f" metalness={0.3} roughness={0.5} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="cpu"
        label="Laptop CPU"
        installed={isInstalled("cpu")}
        highlighted={selectedPartId === "cpu"}
        position={[-1.6, 0.1, 0.6]}
        size={[0.6, 0.2, 0.6]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.3} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="gpu"
        label="Mobile GPU"
        installed={isInstalled("gpu")}
        highlighted={selectedPartId === "gpu"}
        position={[-0.3, 0.1, 0.6]}
        size={[0.9, 0.2, 0.7]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.8, 0.1, 0.6]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.3} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="ram"
        label="SODIMM RAM"
        installed={isInstalled("ram")}
        highlighted={selectedPartId === "ram"}
        position={[0.9, 0.1, 0.6]}
        size={[1.4, 0.2, 0.6]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[1.2, 0.1, 0.5]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="storage-nvme"
        label="NVMe SSD"
        installed={isInstalled("storage-nvme")}
        highlighted={selectedPartId === "storage-nvme"}
        position={[1.7, 0.05, 0.6]}
        size={[1.2, 0.2, 0.5]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[1, 0.1, 0.4]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="battery"
        label="Battery Pack"
        installed={isInstalled("battery")}
        highlighted={selectedPartId === "battery"}
        position={[0, -0.35, -0.4]}
        size={[4.6, 0.4, 1.8]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[4.4, 0.25, 1.6]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="cooling-fan"
        label="Cooling Fans"
        installed={isInstalled("cooling-fan")}
        highlighted={selectedPartId === "cooling-fan"}
        position={[-2.5, 0.1, -0.2]}
        size={[1.4, 0.4, 1.4]}
        onToggle={onTogglePart}
      >
        <group rotation={[Math.PI / 2, 0, 0]}>
          <RotatingFan speed={fanSpin} radius={0.5} thickness={0.12} color="#1f2937" />
        </group>
      </PartAnchor>

      <PartAnchor
        id="heatpipe"
        label="Heatpipe"
        installed={isInstalled("heatpipe")}
        highlighted={selectedPartId === "heatpipe"}
        position={[-1, 0.2, -0.2]}
        size={[2.4, 0.2, 0.6]}
        onToggle={onTogglePart}
      >
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 2.2, 16]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.5} roughness={0.3} />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="keyboard"
        label="Keyboard"
        installed={isInstalled("keyboard")}
        highlighted={selectedPartId === "keyboard"}
        position={[0, -0.2, 1.2]}
        size={[5.4, 0.2, 2.2]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[5.2, 0.1, 2]} />
          <meshStandardMaterial
            color="#0b1020"
            emissive={ledColor}
            emissiveIntensity={powerOn ? 0.4 : 0}
          />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="trackpad"
        label="Trackpad"
        installed={isInstalled("trackpad")}
        highlighted={selectedPartId === "trackpad"}
        position={[0, -0.2, 2.3]}
        size={[1.8, 0.2, 1.1]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[1.6, 0.05, 0.9]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="speakers"
        label="Speakers"
        installed={isInstalled("speakers")}
        highlighted={selectedPartId === "speakers"}
        position={[-2.4, -0.15, 1.4]}
        size={[1.2, 0.2, 0.8]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[1, 0.08, 0.6]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="webcam"
        label="Webcam"
        installed={isInstalled("webcam")}
        highlighted={selectedPartId === "webcam"}
        position={[0, 2.3, -3.2]}
        size={[0.5, 0.2, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="wifi-card"
        label="Wi-Fi Card"
        installed={isInstalled("wifi-card")}
        highlighted={selectedPartId === "wifi-card"}
        position={[2.1, 0.1, 0.6]}
        size={[0.6, 0.2, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.5, 0.1, 0.3]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="io-ports"
        label="I/O Ports"
        installed={isInstalled("io-ports")}
        highlighted={selectedPartId === "io-ports"}
        position={[3.3, -0.1, 0]}
        size={[0.8, 0.6, 2.2]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.6, 0.4, 2]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="power-button"
        label="Power Button"
        installed={isInstalled("power-button")}
        highlighted={selectedPartId === "power-button"}
        position={[2.4, -0.15, 1.9]}
        size={[0.4, 0.2, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.06, 12]} />
          <meshStandardMaterial
            color={powerOn ? "#37ffe7" : "#1f2937"}
            emissive={powerOn ? "#37ffe7" : "#000000"}
            emissiveIntensity={powerOn ? 0.8 : 0}
          />
        </mesh>
      </PartAnchor>

      <PartAnchor
        id="led-indicator"
        label="Status LEDs"
        installed={isInstalled("led-indicator")}
        highlighted={selectedPartId === "led-indicator"}
        position={[-2.6, -0.2, 2.2]}
        size={[0.5, 0.2, 0.4]}
        onToggle={onTogglePart}
      >
        <mesh>
          <boxGeometry args={[0.3, 0.05, 0.15]} />
          <meshStandardMaterial
            color={ledColor}
            emissive={ledColor}
            emissiveIntensity={powerOn ? 0.9 : 0.2}
          />
        </mesh>
      </PartAnchor>
    </group>
  );
};

const Scene: React.FC<SceneProps> = ({
  mode,
  installedParts,
  selectedPartId,
  onTogglePart,
  powerOn,
  ledColor,
  fanSpeed,
  waterCooling
}) => {
  return (
    <Canvas camera={{ position: [9, 8, 9], fov: 45 }}>
      <color attach="background" args={["#0b0f17"]} />
      <hemisphereLight intensity={0.5} groundColor="#0f172a" />
      <directionalLight position={[5, 10, 6]} intensity={1.1} castShadow />
      <pointLight position={[-6, -2, -4]} intensity={0.6} color="#4c9aff" />

      {mode === "pc" ? (
        <PcRig
          installedParts={installedParts}
          selectedPartId={selectedPartId}
          onTogglePart={onTogglePart}
          powerOn={powerOn}
          ledColor={ledColor}
          fanSpeed={fanSpeed}
          waterCooling={waterCooling}
        />
      ) : (
        <LaptopRig
          installedParts={installedParts}
          selectedPartId={selectedPartId}
          onTogglePart={onTogglePart}
          powerOn={powerOn}
          ledColor={ledColor}
          fanSpeed={fanSpeed}
        />
      )}

      <ContactShadows position={[0, -4.2, 0]} opacity={0.4} scale={20} blur={2.5} />
      <OrbitControls enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 1.9} />
    </Canvas>
  );
};

export default Scene;
