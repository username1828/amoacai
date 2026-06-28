export type OptionGroup = {
  title: string;
  max: number;
  items: { name: string; price?: number }[];
};

export const BASE: OptionGroup = {
  title: "Escolha Sua Base",
  max: 3,
  items: [
    { name: "Açaí Tradicional" },
    { name: "Açaí Batido no Morango" },
    { name: "Açaí Batido na Banana" },
    { name: "Creme de Cupuaçu" },
    { name: "Creme de Amendoim" },
    { name: "Creme de Leite Ninho" },
    { name: "Creme Leite Ninho e Morango" },
    { name: "Creme de Morango" },
    { name: "Creme de Ovomaltine" },
    { name: "Creme de Maracujá" },
    { name: "Creme de Oreo" },
  ],
};

export const COMPLEMENTOS: OptionGroup = {
  title: "Complementos",
  max: 8,
  items: [
    "Gotas de Chocolate","Confete","Granola","Amendoim","Leite em Pó",
    "Ovomaltine","Chocoboll","Chocoboll Mini","Coco Ralado","Bis (unidade)",
    "Castanha de Caju","Granulado Chocolate","Granulado Colorido",
    "Jujuba Gomets","Marshmallow Fini","Avelã","Wafer Palito","Sucrilhos",
  ].map((name) => ({ name })),
};

export const FRUTAS: OptionGroup = {
  title: "Frutas",
  max: 2,
  items: ["Banana","Morango","Kiwi","Uva","Manga","Abacaxi"].map((name) => ({ name })),
};

export const COBERTURAS: OptionGroup = {
  title: "Coberturas",
  max: 2,
  items: [
    "Leite Condensado","Cobertura de Chocolate","Cobertura de Caramelo",
    "Cobertura de Uva","Cobertura de Maracujá","Cobertura de Menta","Cobertura de Morango",
  ].map((name) => ({ name })),
};

export const ADICIONAIS: OptionGroup = {
  title: "Adicionais",
  max: 9,
  items: [
    { name: "Leite Condensado (100ml extra)", price: 2.9 },
    { name: "Nutella", price: 3.9 },
    { name: "Cereja em Calda", price: 3.9 },
    { name: "Chocolate em Barra (Milka)", price: 2.9 },
    { name: "Mini Oreo (biscoito)", price: 1.9 },
    { name: "Mini Fini (sortidos)", price: 2.9 },
    { name: "Doce de Leite", price: 3.9 },
    { name: "KinderBueno", price: 2.9 },
    { name: "KitKat", price: 2.9 },
  ],
};

// "Sorvete-like" categories only get Adicionais (milkshakes/garrafas don't get base/frutas).
const ADICIONAIS_ONLY_CATEGORIES = new Set<string>([
  "Na Garrafa & Milkshakes",
  "Potes Família",
]);

export function getGroupsForCategory(category: string): OptionGroup[] {
  if (ADICIONAIS_ONLY_CATEGORIES.has(category)) return [ADICIONAIS];
  return [BASE, COMPLEMENTOS, FRUTAS, COBERTURAS, ADICIONAIS];
}