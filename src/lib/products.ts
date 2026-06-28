export type Product = {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  category: string;
  slug: string;
};

export const CATEGORIES = [
  "Leve Mais – Pague Menos",
  "Bom & Barato",
  "Açaí Premium",
  "Barcas & Roletas",
  "Na Garrafa & Milkshakes",
  "Potes Família",
] as const;

const img = (n: number) => `/uploads/prod-${n}.webp`;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// oldPrice é calculado como price / 0.70 (preço atual representa 30% de desconto)
// slug derivado do nome + id para garantir unicidade
const withOld = <T extends { price: number; name: string; id: number }>(
  p: T,
): T & { oldPrice: number; slug: string } => ({
  ...p,
  oldPrice: Math.round((p.price / 0.7) * 100) / 100,
  slug: `${slugify(p.name)}-${p.id}`,
});

export const PRODUCTS: Product[] = [
  { id: 1, name: "2 Açaís 500ml", price: 23.10, image: img(1), category: "Leve Mais – Pague Menos" },
  { id: 2, name: "3 Açaís 500ml", price: 29.19, image: img(2), category: "Leve Mais – Pague Menos" },
  { id: 3, name: "1L + 4 Açaís 500ml", price: 41.37, image: img(3), category: "Leve Mais – Pague Menos" },
  { id: 20, name: "Mega Açaí 2 Litros – Açaí Daora", price: 33.54, image: img(20), category: "Leve Mais – Pague Menos" },
  { id: 4, name: "Açaí 300ml", price: 10.05, image: img(4), category: "Bom & Barato" },
  { id: 5, name: "Açaí 500ml", price: 13.53, image: img(5), category: "Bom & Barato" },
  { id: 6, name: "Açaí 700ml", price: 18.75, image: img(6), category: "Bom & Barato" },
  { id: 7, name: "Açaí 1 Litro", price: 24.84, image: img(7), category: "Bom & Barato" },
  { id: 8, name: "Trio Chocolate 500ml", price: 19.62, image: img(8), category: "Açaí Premium" },
  { id: 9, name: "Nutella & Ferrero 500ml", price: 19.62, image: img(9), category: "Açaí Premium" },
  { id: 10, name: "Roleta M", price: 20.49, image: img(10), category: "Barcas & Roletas" },
  { id: 11, name: "Roleta G", price: 28.32, image: img(11), category: "Barcas & Roletas" },
  { id: 12, name: "Barca M", price: 23.10, image: img(12), category: "Barcas & Roletas" },
  { id: 13, name: "Barca G", price: 31.80, image: img(13), category: "Barcas & Roletas" },
  { id: 14, name: "Açaí 500ml c/ Leite Condensado", price: 10.92, image: img(14), category: "Na Garrafa & Milkshakes" },
  { id: 15, name: "Açaí c/ Maracujá na Garrafa 500ml", price: 10.92, image: img(15), category: "Na Garrafa & Milkshakes" },
  { id: 16, name: "Milkshake Supremo Chocolate 500ml", price: 12.66, image: img(16), category: "Na Garrafa & Milkshakes" },
  { id: 17, name: "Milkshake Supremo Morango 500ml", price: 12.66, image: img(17), category: "Na Garrafa & Milkshakes" },
  { id: 18, name: "Mega Açaí 2 Litros", price: 33.54, image: img(18), category: "Potes Família" },
  { id: 19, name: "Mega Açaí 5 Litros Família", price: 59.64, image: img(19), category: "Potes Família" },
].map(withOld);

export const REVIEWS = [
  { ini: "AS", name: "Ana S.", time: "Há 20 min", text: "Simplesmente perfeito! Veio super gelado e muito bem montado. Com certeza vou pedir novamente!" },
  { ini: "BL", name: "Bruno L.", time: "Há 45 min", text: "Entrega muito rápida! Pedi a barca e ficou sensacional. Muito recheado!" },
  { ini: "CM", name: "Carla M.", time: "Há 1h", text: "Melhor açaí que já pedi no delivery. Ingredientes de qualidade, chegou perfeito." },
  { ini: "DR", name: "Daniel R.", time: "Há 1h30", text: "Qualidade excelente. A roleta veio caprichada e a apresentação impecável." },
  { ini: "FC", name: "Fernanda C.", time: "Há 2h", text: "O Premium Nutella & Ferrero é incrível! Chegou bem embalado e geladinho." },
  { ini: "LP", name: "Lucas P.", time: "Há 3h", text: "Pedi o combo de 3 açaís e não me arrependi. Porção generosa e chegou no prazo." },
  { ini: "JT", name: "Juliana T.", time: "Há 4h", text: "Atendimento nota 10. O açaí é cremoso demais, virei cliente fixa!" },
  { ini: "MV", name: "Marcos V.", time: "Ontem", text: "Muito bom! A garrafa de açaí com maracujá é refrescante. Recomendo." },
  { ini: "PN", name: "Patrícia N.", time: "Ontem", text: "Pedi para uma festa e todo mundo amou. O mega açaí de 2 litros valeu cada centavo." },
  { ini: "RO", name: "Rafael O.", time: "2 dias", text: "Fiz meu primeiro pedido e já é meu favorito. Açaí gelado, embalagem caprichada." },
];

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });