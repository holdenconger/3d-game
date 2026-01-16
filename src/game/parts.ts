import { PartDefinition } from "./types";

export const pcParts: PartDefinition[] = [
  {
    id: "case",
    name: "Case / Chassis",
    description: "Steel frame, tempered glass, and airflow panels.",
    category: "Chassis",
    mode: "pc",
    powerDraw: 0,
    cost: 140
  },
  {
    id: "motherboard",
    name: "Motherboard",
    description: "ATX board with PCIe, NVMe, and header layout.",
    category: "Core",
    mode: "pc",
    powerDraw: 45,
    cost: 220
  },
  {
    id: "cpu",
    name: "CPU",
    description: "8-core performance processor.",
    category: "Core",
    mode: "pc",
    powerDraw: 125,
    cost: 320
  },
  {
    id: "thermal-paste",
    name: "Thermal Paste",
    description: "High conductivity interface layer.",
    category: "Core",
    mode: "pc",
    powerDraw: 0,
    cost: 18
  },
  {
    id: "cpu-cooler",
    name: "Air Cooler",
    description: "Tower heatsink with dual fans.",
    category: "Cooling",
    mode: "pc",
    powerDraw: 12,
    cost: 80
  },
  {
    id: "ram",
    name: "Memory (RAM)",
    description: "32 GB DDR5 dual-channel kit.",
    category: "Core",
    mode: "pc",
    powerDraw: 10,
    cost: 150
  },
  {
    id: "gpu",
    name: "Graphics Card",
    description: "Triple-fan GPU with metal backplate.",
    category: "Core",
    mode: "pc",
    powerDraw: 320,
    cost: 780
  },
  {
    id: "psu",
    name: "Power Supply",
    description: "850W modular PSU with gold efficiency.",
    category: "Power",
    mode: "pc",
    powerDraw: 0,
    cost: 160
  },
  {
    id: "power-cables",
    name: "Power Cables",
    description: "24-pin, CPU, and GPU braided cables.",
    category: "Power",
    mode: "pc",
    powerDraw: 0,
    cost: 25
  },
  {
    id: "pcie-cables",
    name: "PCIe Cables",
    description: "High-current GPU PCIe connectors.",
    category: "Power",
    mode: "pc",
    powerDraw: 0,
    cost: 18
  },
  {
    id: "sata-cables",
    name: "SATA Cables",
    description: "Storage data cables.",
    category: "Cabling",
    mode: "pc",
    powerDraw: 0,
    cost: 10
  },
  {
    id: "storage-nvme",
    name: "NVMe SSD",
    description: "High-speed 1TB PCIe 4.0 drive.",
    category: "Storage",
    mode: "pc",
    powerDraw: 6,
    cost: 120
  },
  {
    id: "storage-ssd",
    name: "2.5\" SSD",
    description: "2TB SATA SSD for games library.",
    category: "Storage",
    mode: "pc",
    powerDraw: 4,
    cost: 140
  },
  {
    id: "storage-hdd",
    name: "3.5\" HDD",
    description: "4TB archive storage.",
    category: "Storage",
    mode: "pc",
    powerDraw: 8,
    cost: 90,
    optional: true
  },
  {
    id: "case-fan-front",
    name: "Front Intake Fan",
    description: "140mm PWM intake fan.",
    category: "Cooling",
    mode: "pc",
    powerDraw: 4,
    cost: 18
  },
  {
    id: "case-fan-top",
    name: "Top Exhaust Fan",
    description: "120mm PWM exhaust fan.",
    category: "Cooling",
    mode: "pc",
    powerDraw: 4,
    cost: 16
  },
  {
    id: "water-cooler-radiator",
    name: "Water Radiator",
    description: "240mm radiator for liquid loop.",
    category: "Cooling",
    mode: "pc",
    powerDraw: 6,
    cost: 110,
    optional: true
  },
  {
    id: "water-cooler-pump",
    name: "Pump + Reservoir",
    description: "RGB pump combo for liquid cooling.",
    category: "Cooling",
    mode: "pc",
    powerDraw: 9,
    cost: 130,
    optional: true
  },
  {
    id: "led-strip",
    name: "LED Strip",
    description: "Addressable RGB lighting.",
    category: "Lighting",
    mode: "pc",
    powerDraw: 5,
    cost: 30
  },
  {
    id: "front-io",
    name: "Front I/O Panel",
    description: "USB-C, USB-A, audio, and reset.",
    category: "I/O",
    mode: "pc",
    powerDraw: 2,
    cost: 25
  },
  {
    id: "power-button",
    name: "Power Button",
    description: "Illuminated power switch.",
    category: "I/O",
    mode: "pc",
    powerDraw: 1,
    cost: 8
  },
  {
    id: "rgb-controller",
    name: "RGB Controller",
    description: "Sync lighting across fans and strips.",
    category: "Controllers",
    mode: "pc",
    powerDraw: 3,
    cost: 35
  },
  {
    id: "fan-hub",
    name: "Fan Hub",
    description: "PWM hub with 6 outputs.",
    category: "Controllers",
    mode: "pc",
    powerDraw: 2,
    cost: 20
  },
  {
    id: "chipset-heatsink",
    name: "Chipset Heatsink",
    description: "Passive heatsink for the chipset.",
    category: "Board",
    mode: "pc",
    powerDraw: 0,
    cost: 12
  },
  {
    id: "cmos-battery",
    name: "CMOS Battery",
    description: "Backup battery for BIOS settings.",
    category: "Board",
    mode: "pc",
    powerDraw: 0,
    cost: 4
  },
  {
    id: "bios-chip",
    name: "BIOS Chip",
    description: "Firmware flash memory.",
    category: "Board",
    mode: "pc",
    powerDraw: 0,
    cost: 6
  },
  {
    id: "usb-headers",
    name: "USB Headers",
    description: "Front panel USB header pins.",
    category: "Board",
    mode: "pc",
    powerDraw: 1,
    cost: 6
  },
  {
    id: "audio-headers",
    name: "Audio Headers",
    description: "Front panel audio pins.",
    category: "Board",
    mode: "pc",
    powerDraw: 1,
    cost: 6
  },
  {
    id: "wifi-card",
    name: "Wi-Fi + BT Card",
    description: "PCIe wireless card with antennas.",
    category: "Expansion",
    mode: "pc",
    powerDraw: 6,
    cost: 40,
    optional: true
  },
  {
    id: "sound-card",
    name: "Sound Card",
    description: "Dedicated audio processing.",
    category: "Expansion",
    mode: "pc",
    powerDraw: 6,
    cost: 60,
    optional: true
  }
];

export const laptopParts: PartDefinition[] = [
  {
    id: "laptop-chassis",
    name: "Chassis",
    description: "Aluminum chassis with vapor chamber frame.",
    category: "Chassis",
    mode: "laptop",
    powerDraw: 0,
    cost: 220
  },
  {
    id: "laptop-motherboard",
    name: "Mainboard",
    description: "Compact PCB with soldered controllers.",
    category: "Core",
    mode: "laptop",
    powerDraw: 25,
    cost: 240
  },
  {
    id: "cpu",
    name: "Laptop CPU",
    description: "Mobile 14-core CPU package.",
    category: "Core",
    mode: "laptop",
    powerDraw: 45,
    cost: 280
  },
  {
    id: "gpu",
    name: "Mobile GPU",
    description: "Discrete laptop GPU module.",
    category: "Core",
    mode: "laptop",
    powerDraw: 120,
    cost: 420,
    optional: true
  },
  {
    id: "ram",
    name: "SODIMM Memory",
    description: "32GB low-profile memory.",
    category: "Core",
    mode: "laptop",
    powerDraw: 8,
    cost: 140
  },
  {
    id: "storage-nvme",
    name: "NVMe SSD",
    description: "1TB compact storage drive.",
    category: "Storage",
    mode: "laptop",
    powerDraw: 5,
    cost: 120
  },
  {
    id: "battery",
    name: "Battery Pack",
    description: "99Wh lithium polymer battery.",
    category: "Power",
    mode: "laptop",
    powerDraw: 0,
    cost: 160
  },
  {
    id: "cooling-fan",
    name: "Cooling Fan",
    description: "Dual blower fans.",
    category: "Cooling",
    mode: "laptop",
    powerDraw: 5,
    cost: 30
  },
  {
    id: "heatpipe",
    name: "Heatpipe",
    description: "Copper heatpipe assembly.",
    category: "Cooling",
    mode: "laptop",
    powerDraw: 0,
    cost: 40
  },
  {
    id: "screen",
    name: "Display Panel",
    description: "16\" mini-LED display.",
    category: "I/O",
    mode: "laptop",
    powerDraw: 12,
    cost: 280
  },
  {
    id: "keyboard",
    name: "Keyboard",
    description: "Per-key RGB mechanical keyboard.",
    category: "I/O",
    mode: "laptop",
    powerDraw: 2,
    cost: 70
  },
  {
    id: "trackpad",
    name: "Trackpad",
    description: "Precision glass touchpad.",
    category: "I/O",
    mode: "laptop",
    powerDraw: 1,
    cost: 40
  },
  {
    id: "speakers",
    name: "Speakers",
    description: "Quad stereo speakers.",
    category: "I/O",
    mode: "laptop",
    powerDraw: 4,
    cost: 35
  },
  {
    id: "webcam",
    name: "Webcam",
    description: "1080p IR webcam module.",
    category: "I/O",
    mode: "laptop",
    powerDraw: 2,
    cost: 25
  },
  {
    id: "wifi-card",
    name: "Wi-Fi + BT",
    description: "Wireless card with antennas.",
    category: "I/O",
    mode: "laptop",
    powerDraw: 4,
    cost: 35
  },
  {
    id: "io-ports",
    name: "I/O Ports",
    description: "USB-C, USB-A, HDMI, SD reader.",
    category: "I/O",
    mode: "laptop",
    powerDraw: 2,
    cost: 45
  },
  {
    id: "power-button",
    name: "Power Button",
    description: "Fingerprint power key.",
    category: "I/O",
    mode: "laptop",
    powerDraw: 1,
    cost: 12
  },
  {
    id: "led-indicator",
    name: "Status LEDs",
    description: "Charging and sleep indicators.",
    category: "Lighting",
    mode: "laptop",
    powerDraw: 1,
    cost: 8
  }
];

export const pcBuildOrder = [
  "case",
  "motherboard",
  "cpu",
  "thermal-paste",
  "cpu-cooler",
  "ram",
  "storage-nvme",
  "gpu",
  "psu",
  "power-cables",
  "pcie-cables",
  "sata-cables",
  "storage-ssd",
  "storage-hdd",
  "case-fan-front",
  "case-fan-top",
  "water-cooler-radiator",
  "water-cooler-pump",
  "led-strip",
  "front-io",
  "power-button",
  "rgb-controller",
  "fan-hub",
  "chipset-heatsink",
  "cmos-battery",
  "bios-chip",
  "usb-headers",
  "audio-headers",
  "wifi-card",
  "sound-card"
];

export const laptopBuildOrder = [
  "laptop-chassis",
  "laptop-motherboard",
  "cpu",
  "gpu",
  "ram",
  "storage-nvme",
  "battery",
  "cooling-fan",
  "heatpipe",
  "screen",
  "keyboard",
  "trackpad",
  "speakers",
  "webcam",
  "wifi-card",
  "io-ports",
  "power-button",
  "led-indicator"
];
