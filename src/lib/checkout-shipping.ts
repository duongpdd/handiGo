export type CheckoutPricing = {
  originProvince: string;
  gramsPerItem: number;
  fallbackShippingFee: number;
};

const regions = [
  ["Điện Biên", "Lai Châu", "Sơn La", "Lào Cai", "Phú Thọ", "Tuyên Quang", "Cao Bằng", "Thái Nguyên", "Lạng Sơn", "Bắc Ninh", "Quảng Ninh", "Hải Phòng", "Hưng Yên", "Ninh Bình", "Hà Nội", "Thanh Hóa", "Nghệ An", "Hà Tĩnh"],
  ["Hồ Chí Minh", "Cần Thơ", "Đồng Nai", "Tây Ninh", "Đồng Tháp", "Cà Mau", "An Giang", "Vĩnh Long", "Lâm Đồng", "Khánh Hòa"],
  ["Quảng Trị", "Quảng Ngãi", "Huế", "Đà Nẵng", "Gia Lai", "Đắk Lắk"],
];

// Nghị quyết 202/2025/QH15. These names also appear in existing orders.
const mergedProvinces = {
  "Tuyên Quang": ["Hà Giang"], "Lào Cai": ["Yên Bái"], "Thái Nguyên": ["Bắc Kạn"], "Phú Thọ": ["Vĩnh Phúc", "Hòa Bình"],
  "Bắc Ninh": ["Bắc Giang"], "Hưng Yên": ["Thái Bình"], "Hải Phòng": ["Hải Dương"], "Ninh Bình": ["Hà Nam", "Nam Định"],
  "Quảng Trị": ["Quảng Bình"], "Đà Nẵng": ["Quảng Nam"], "Quảng Ngãi": ["Kon Tum"], "Gia Lai": ["Bình Định"],
  "Khánh Hòa": ["Ninh Thuận"], "Lâm Đồng": ["Đắk Nông", "Bình Thuận"], "Đắk Lắk": ["Phú Yên"],
  "Hồ Chí Minh": ["Bà Rịa - Vũng Tàu", "Bình Dương"], "Đồng Nai": ["Bình Phước"], "Tây Ninh": ["Long An"],
  "Cần Thơ": ["Sóc Trăng", "Hậu Giang"], "Vĩnh Long": ["Bến Tre", "Trà Vinh"], "Đồng Tháp": ["Tiền Giang"],
  "Cà Mau": ["Bạc Liêu"], "An Giang": ["Kiên Giang"],
};

function provinceKey(name: string) {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/đ/g, "d")
    .replace(/^(?:tinh|thanh\s+pho|tp\.?)\s*/, "").replace(/[^a-z0-9]/g, "");
}

const provinceNames = new Map(regions.flatMap((region) => region.map((name) => [provinceKey(name), name] as const)));
for (const [name, aliases] of Object.entries(mergedProvinces)) {
  for (const alias of aliases) provinceNames.set(provinceKey(alias), name);
}
provinceNames.set("hcm", "Hồ Chí Minh");
provinceNames.set("saigon", "Hồ Chí Minh");
provinceNames.set("thuathienhue", "Huế");

export function shippingProvince(address: string) {
  return provinceNames.get(provinceKey(address.split(",").at(-1)?.trim() ?? ""));
}

// Columns match the VNPost standard e-commerce tariff. The last row is per extra 500 g.
const rates = [
  [11_700, 17_000, 17_500, 20_000, 21_000],
  [14_000, 22_500, 23_500, 26_300, 28_000],
  [16_500, 26_500, 28_000, 30_500, 32_300],
  [18_000, 29_900, 31_500, 34_000, 35_500],
  [2_000, 2_400, 2_500, 3_000, 3_400],
];

export function checkoutShippingFee(pricing: CheckoutPricing, address: string, quantity: number) {
  const grams = quantity * pricing.gramsPerItem;
  const destination = shippingProvince(address);
  if (!destination) return pricing.fallbackShippingFee;
  const origin = pricing.originProvince;
  const fromRegion = regions.findIndex((region) => region.includes(origin));
  const toRegion = regions.findIndex((region) => region.includes(destination));
  // With province-level inputs, use Nội tỉnh 2 as the estimate in merged provinces.
  const route = origin === destination ? Number(Object.hasOwn(mergedProvinces, origin)) :
    fromRegion === toRegion ? 2 : fromRegion === 2 || toRegion === 2 ? 3 : 4;
  const steps = Math.max(1, Math.ceil(grams / 500));
  return rates[Math.min(steps, 4) - 1][route] + Math.max(0, steps - 4) * rates[4][route];
}
