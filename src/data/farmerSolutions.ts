import { Sprout, Bug, Recycle, Waves, Cog, Radar, type LucideIcon } from "lucide-react";

export interface FarmerSolution {
  id: string;
  number: string;
  title: string;
  icon: LucideIcon;
}

export const FARMER_SOLUTIONS: FarmerSolution[] = [
  { id: "saplings", number: "01", title: "Quality Saplings", icon: Sprout },
  { id: "biological-weed-management", number: "02", title: "Biological Weed Management", icon: Bug },
  { id: "vermicompost-biofertilizer", number: "03", title: "Vermicompost & Liquid Biofertilizer", icon: Recycle },
  { id: "pond-plants", number: "04", title: "Pond Covering Ferns & Floating Plants", icon: Waves },
  { id: "farm-automation", number: "05", title: "Farm Automation, Mulching & Weedmat", icon: Cog },
  { id: "ultrasonic-repellent", number: "06", title: "Advanced Ultrasonic Repellent System", icon: Radar },
];

export const FARMERS_PHONE = "+917559421334";
export const FARMERS_PHONE_DISPLAY = "+91 755 942 1334";
export const FARMERS_WHATSAPP = "https://wa.me/917559421334";
