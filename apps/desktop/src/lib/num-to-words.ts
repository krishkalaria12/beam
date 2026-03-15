const a: readonly string[] = [
  "",
  "one ",
  "two ",
  "three ",
  "four ",
  "five ",
  "six ",
  "seven ",
  "eight ",
  "nine ",
  "ten ",
  "eleven ",
  "twelve ",
  "thirteen ",
  "fourteen ",
  "fifteen ",
  "sixteen ",
  "seventeen ",
  "eighteen ",
  "nineteen ",
];
const b: readonly string[] = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

const regex = /^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/;

const getLT20 = (n: string) => a[Number(n)] ?? "";
const getGT20 = (n: string) => `${b[Number(n[0])] ?? ""} ${a[Number(n[1])] ?? ""}`.trim();

export default function numWords(input: string | number): string {
  const num = Number(input);
  if (Number.isNaN(num)) return "";
  if (num === 0) return "zero";

  const numStr = num.toString();
  if (numStr.length > 9) {
    throw new Error("overflow"); // Does not support converting more than 9 digits yet
  }

  const padded = ("000000000" + numStr).slice(-9);
  const match = padded.match(regex);
  if (!match) {
    return "";
  }
  const [, n1, n2, n3, n4, n5] = match;

  let str = "";
  str += n1 !== "00" ? `${getLT20(n1) || getGT20(n1)} crore ` : "";
  str += n2 !== "00" ? `${getLT20(n2) || getGT20(n2)} lakh ` : "";
  str += n3 !== "00" ? `${getLT20(n3) || getGT20(n3)} thousand ` : "";
  str += n4 !== "0" ? `${getLT20(n4)}hundred ` : "";
  str += n5 !== "00" && str !== "" ? "and " : "";
  str += n5 !== "00" ? getLT20(n5) || getGT20(n5) : "";

  return str.trim();
}
