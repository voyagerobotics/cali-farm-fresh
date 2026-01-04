import { Apple, Carrot, Leaf, Sprout, Package, Cherry, Citrus, Grape } from "lucide-react";

export interface Category {
  id: string;
  name: string;
  icon: any;
  subcategories: Subcategory[];
  image?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  parentCategory: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "fruits",
    name: "Fruits",
    icon: Apple,
    subcategories: [
      { id: "seasonal-fruits", name: "Seasonal Fruits", parentCategory: "fruits" },
      { id: "citrus-fruits", name: "Citrus Fruits", parentCategory: "fruits" },
      { id: "exotic-fruits", name: "Exotic Fruits", parentCategory: "fruits" },
      { id: "berries", name: "Berries", parentCategory: "fruits" },
    ],
  },
  {
    id: "vegetables",
    name: "Vegetables",
    icon: Carrot,
    subcategories: [
      { id: "root-vegetables", name: "Root Vegetables", parentCategory: "vegetables" },
      { id: "cruciferous", name: "Cruciferous Vegetables", parentCategory: "vegetables" },
      { id: "gourds-squash", name: "Gourds & Squash", parentCategory: "vegetables" },
      { id: "beans-peas", name: "Beans & Peas", parentCategory: "vegetables" },
    ],
  },
  {
    id: "leafy",
    name: "Leafy Greens",
    icon: Leaf,
    subcategories: [
      { id: "spinach-varieties", name: "Spinach Varieties", parentCategory: "leafy" },
      { id: "lettuce-salad", name: "Lettuce & Salad Greens", parentCategory: "leafy" },
      { id: "indigenous-leafy", name: "Indigenous Leafy Greens", parentCategory: "leafy" },
    ],
  },
  {
    id: "herbs",
    name: "Herbs",
    icon: Sprout,
    subcategories: [
      { id: "cooking-herbs", name: "Fresh Cooking Herbs", parentCategory: "herbs" },
      { id: "medicinal-herbs", name: "Medicinal Herbs", parentCategory: "herbs" },
      { id: "aromatic-herbs", name: "Aromatic Herbs", parentCategory: "herbs" },
    ],
  },
  {
    id: "combos",
    name: "Chemical Free Combos",
    icon: Package,
    subcategories: [
      { id: "weekly-basket", name: "Weekly Veggie Basket", parentCategory: "combos" },
      { id: "detox-pack", name: "Detox Greens Pack", parentCategory: "combos" },
      { id: "immunity-pack", name: "Immunity Boost Pack", parentCategory: "combos" },
    ],
  },
];

export const getAllSubcategories = (): Subcategory[] => {
  return CATEGORIES.flatMap(cat => cat.subcategories);
};

export const getCategoryById = (id: string): Category | undefined => {
  return CATEGORIES.find(cat => cat.id === id);
};

export const getSubcategoryById = (id: string): Subcategory | undefined => {
  return getAllSubcategories().find(sub => sub.id === id);
};
