const FIRST = ["Lucas","Pedro","João","Gabriel","Matheus","Rafael","Bruno","Felipe","Ana","Julia","Maria","Beatriz","Larissa","Camila","Fernanda","Carolina"];
const LAST = ["Silva","Souza","Oliveira","Santos","Pereira","Lima","Costa","Almeida","Ferreira","Rodrigues"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randDigits(n: number): string {
  let s = ""; for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10); return s;
}

export function generateCPF(): string {
  const n: number[] = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const calc = (base: number[]): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += base[i] * (base.length + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(n);
  const d2 = calc([...n, d1]);
  return [...n, d1, d2].join("");
}

export function generateFakeCustomer() {
  const first = rand(FIRST);
  const last = rand(LAST);
  const name = `${first} ${last}`;
  const slug = `${first}.${last}`.toLowerCase() + randDigits(4);
  return {
    name,
    email: `${slug}@gmail.com`,
    document: generateCPF(),
    phone: `11${randDigits(9)}`,
  };
}