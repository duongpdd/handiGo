import data from "../../public/checkout-addresses.json";
import { isAddressType, type AddressBookEntry } from "@/lib/checkout";
import type { Account } from "@/lib/shop";
import { fail, field } from "./auth";
import { db, transaction } from "./db";

const places: Record<string, string[]> = data.current;

export function listCheckoutAddresses(account: Account): AddressBookEntry[] {
  return db.prepare(`
    SELECT id, label, name, phone, province, ward, street, is_default AS isDefault
    FROM checkout_addresses WHERE user_id = ? ORDER BY is_default DESC, rowid DESC
  `).all(account.id).map((row) => ({
    ...row, isDefault: !!row.isDefault, address: [row.street, row.ward, row.province].join(", "),
  })) as AddressBookEntry[];
}

export function updateCheckoutAddresses(account: Account, body: Record<string, unknown>) {
  const id = field(body.id, "Mã địa chỉ", 36, 36);
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) fail("Mã địa chỉ không hợp lệ.");

  return transaction(() => {
    const existing = db.prepare("SELECT user_id FROM checkout_addresses WHERE id = ?").get(id);
    if (existing && existing.user_id !== account.id) fail("Không tìm thấy địa chỉ.", 404);
    if (body.operation === "save") {
      const label = body.label;
      if (!isAddressType(label)) fail("Chọn Văn phòng hoặc Nhà riêng.");
      const name = field(body.name, "Họ tên", 2, 80);
      const phone = field(body.phone, "Số điện thoại", 10, 10);
      if (!/^0\d{9}$/.test(phone)) fail("Nhập đúng 10 chữ số, bắt đầu bằng 0.");
      const province = field(body.province, "Tỉnh/Thành phố", 1, 80);
      const ward = field(body.ward, "Phường/Xã/Đặc khu", 1, 80);
      if (!Object.hasOwn(places, province) || !places[province].includes(ward)) fail("Phường, xã hoặc đặc khu không thuộc tỉnh/thành đã chọn.");
      const street = field(body.street, "Địa chỉ cụ thể", 3, 180);
      if ([street, ward, province].join(", ").length > 250) fail("Địa chỉ đầy đủ chỉ được dài tối đa 250 ký tự.");
      db.prepare(`
        INSERT INTO checkout_addresses (id, user_id, label, name, phone, province, ward, street, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(id) DO UPDATE SET label = excluded.label, name = excluded.name, phone = excluded.phone,
          province = excluded.province, ward = excluded.ward, street = excluded.street
        WHERE checkout_addresses.user_id = excluded.user_id
      `).run(id, account.id, label, name, phone, province, ward, street);
    } else if (body.operation !== "default" || !existing) {
      fail("Không tìm thấy địa chỉ.", 404);
    }

    const hasDefault = db.prepare("SELECT 1 FROM checkout_addresses WHERE user_id = ? AND is_default = 1").get(account.id);
    if (!hasDefault || body.operation === "default" || body.makeDefault === true) {
      db.prepare("UPDATE checkout_addresses SET is_default = 0 WHERE user_id = ? AND is_default = 1").run(account.id);
      db.prepare("UPDATE checkout_addresses SET is_default = 1 WHERE id = ? AND user_id = ?").run(id, account.id);
    }
    return listCheckoutAddresses(account);
  });
}
