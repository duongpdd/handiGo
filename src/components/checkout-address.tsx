"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { addressTypes, isAddressType, savedAddressType, type AddressBookEntry, type CheckoutAddress } from "@/lib/checkout";
import { errorMessage, post } from "./order-flow";

type AddressFields = Pick<AddressBookEntry, "label" | "name" | "phone" | "province" | "ward" | "street">;
type FieldName = keyof AddressFields;
type Places = Record<string, string[]>;
type PlaceCatalogue = { current: Places };

function blankAddress(name: string, phone = ""): AddressFields {
  return { label: "", name, phone, province: "", ward: "", street: "" };
}

export function useCheckoutAddress(initial: AddressBookEntry[], fallback: CheckoutAddress | null, accountName: string, enabled: boolean) {
  const [addresses, setAddresses] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.id);
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState(!initial.length && !fallback);
  const [fields, setFields] = useState(() => blankAddress(accountName));
  const [makeDefault, setMakeDefault] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [catalogue, setCatalogue] = useState<PlaceCatalogue>({ current: {} });
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const draftId = useRef<string | undefined>(undefined);
  const pending = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const request = new AbortController();
    fetch("/checkout-addresses.json", { signal: request.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Địa danh");
      const data: PlaceCatalogue = await response.json();
      if (!request.signal.aborted) setCatalogue(data);
    }).catch(() => { if (!request.signal.aborted) setLoadingFailed(true); });
    return () => request.abort();
  }, [enabled, attempt]);

  const selected = addresses.find((address) => address.id === selectedId) ?? addresses[0];
  const recipient = selected ?? fallback;
  const provinces = Object.keys(catalogue.current);
  const wards = catalogue.current[fields.province] ?? [];
  const fullAddress = [fields.street.trim(), fields.ward, fields.province].join(", ");
  const errors: Partial<Record<FieldName, string>> = {
    name: fields.name.trim().length < 2 ? "Nhập họ tên người nhận." : undefined,
    phone: /^0\d{9}$/.test(fields.phone.trim()) ? undefined : "Nhập đúng 10 chữ số, bắt đầu bằng 0.",
    province: provinces.includes(fields.province) ? undefined : "Chọn tỉnh hoặc thành phố.",
    ward: wards.includes(fields.ward) ? undefined : "Chọn phường, xã hoặc đặc khu.",
    street: fields.street.trim().length < 3 ? "Nhập số nhà và tên đường hoặc thôn, tổ." :
      fullAddress.length > 250 ? "Địa chỉ đầy đủ chỉ được dài tối đa 250 ký tự." : undefined,
    label: isAddressType(fields.label) ? undefined : "Chọn Văn phòng hoặc Nhà riêng.",
  };

  async function update(body: object, id: string) {
    if (pending.current) return null;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await post<{ addresses: AddressBookEntry[] }>("checkout-address", body);
      setAddresses(result.addresses);
      setSelectedId(id);
      return result.addresses.find((address) => address.id === id) ?? null;
    } catch (failure) {
      setError(errorMessage(failure));
      return null;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  async function commit() {
    if (!editing) return recipient;
    const invalid = (Object.keys(errors) as FieldName[]).find((field) => errors[field]);
    if (invalid) {
      setAttempted(true);
      requestAnimationFrame(() => document.getElementById("checkout-" + invalid)?.focus());
      return null;
    }
    const id = draftId.current ??= crypto.randomUUID();
    const result = await update({ ...fields, operation: "save", id, makeDefault }, id);
    if (result) {
      setEditing(false);
      setManaging(false);
    }
    return result;
  }

  function edit(entry?: AddressBookEntry) {
    draftId.current = entry?.id;
    setFields(entry ? { ...entry, label: savedAddressType(entry.label) ?? "" } :
      blankAddress(recipient?.name ?? accountName, recipient?.phone));
    setTouched({});
    setAttempted(false);
    setMakeDefault(false);
    setError("");
    setEditing(true);
  }

  function changeField(field: FieldName, value: string) {
    setFields((previous) => ({ ...previous, [field]: value, ...(field === "province" ? { ward: "" } : {}) }));
  }

  return {
    addresses, selected, recipient, editing, managing, saving, error, edit, commit, fields, changeField,
    provinces, wards, loadingFailed, makeDefault, setMakeDefault,
    alreadyDefault: addresses.some((address) => address.id === draftId.current && address.isDefault),
    markTouched: (field: FieldName) => setTouched((previous) => ({ ...previous, [field]: true })),
    errorFor: (field: FieldName) => attempted || touched[field] ? errors[field] : undefined,
    retry: () => { setLoadingFailed(false); setAttempt((previous) => previous + 1); },
    cancel: () => { setEditing(false); setError(""); },
    toggleManaging: () => { setManaging(!managing); setError(""); },
    choose: (id: string) => { setSelectedId(id); setManaging(false); setError(""); },
    setDefault: (id: string) => update({ operation: "default", id }, id),
  };
}

export function CheckoutAddressCard({ editor, book = false }: { editor: ReturnType<typeof useCheckoutAddress>; book?: boolean }) {
  const { recipient, selected, addresses, editing, managing, fields, provinces, wards, saving } = editor;
  const selectedType = selected && savedAddressType(selected.label);
  const typeError = editor.errorFor("label");

  function field(name: FieldName, label: string, render: (props: {
    id: string; value: string; onBlur: () => void; "aria-invalid": boolean; "aria-describedby"?: string;
  }) => ReactNode) {
    const id = "checkout-" + name;
    const error = editor.errorFor(name);
    return <div className="checkout-field">
      <label htmlFor={id}>{label}</label>
      {render({ id, value: fields[name], onBlur: () => editor.markTouched(name), "aria-invalid": !!error,
        "aria-describedby": error ? id + "-error" : undefined })}
      {error && <span id={id + "-error"} className="checkout-error">{error}</span>}
    </div>;
  }

  function select(name: "province" | "ward", label: string, options: string[]) {
    return field(name, label, (props) => <select {...props} required disabled={!options.length}
      onChange={(event) => editor.changeField(name, event.target.value)}>
      <option value="">{options.length ? "Chọn " + label.toLocaleLowerCase("vi") : "—"}</option>
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>);
  }

  return <section className="checkout-card checkout-address" aria-labelledby="checkout-address-title">
    <div className="checkout-card-heading">
      <h2 id="checkout-address-title">{book ? "Địa chỉ đã lưu" : "Địa chỉ nhận hàng"}</h2>
      {!book && !editing && <button className="checkout-text-button" type="button" onClick={editor.toggleManaging}>
        {managing ? "Đóng sổ địa chỉ" : "Thay đổi"}
      </button>}
    </div>
    {!book && !editing && recipient && <div className="checkout-recipient">
      <p><strong>{recipient.name}</strong> <span>{recipient.phone}</span>
        {selectedType && <span className="checkout-default-tag">{addressTypes[selectedType]}</span>}
        {selected?.isDefault && <span className="checkout-default-tag">Mặc định</span>}</p>
      <p>{recipient.address}</p>
      {!selected && <small>Địa chỉ từ đơn gần nhất</small>}
    </div>}
    {!editing && (managing || book) && <div className="checkout-address-book">
      {!book && <h3>Sổ địa chỉ</h3>}
      {book && !addresses.length && <p>Chưa có địa chỉ nào.</p>}
      {addresses.map((entry) => {
        const type = savedAddressType(entry.label);
        return <article className="checkout-address-option" key={entry.id}>
          <div><strong>{entry.name}</strong> · {entry.phone}
            {type && <span className="checkout-default-tag">{addressTypes[type]}</span>}
            {entry.isDefault && <span className="checkout-default-tag">Mặc định</span>}
            <p>{entry.address}</p></div>
          <div className="checkout-address-actions">
            {!book && <button type="button" className="button secondary" disabled={saving || selected?.id === entry.id}
              onClick={() => editor.choose(entry.id)}>{selected?.id === entry.id ? "Đang dùng" : "Chọn địa chỉ"}</button>}
            <button type="button" className="checkout-text-button" disabled={saving} onClick={() => editor.edit(entry)}>Sửa</button>
            {!entry.isDefault && <button type="button" className="checkout-text-button" disabled={saving}
              onClick={() => void editor.setDefault(entry.id)}>Đặt làm mặc định</button>}
          </div>
        </article>;
      })}
      <button type="button" className="button secondary" disabled={saving} onClick={() => editor.edit()}>+ Thêm địa chỉ</button>
    </div>}
    {editing && <fieldset className="checkout-address-fields" disabled={saving}>
      <div className="checkout-fields">
        {field("name", "Họ tên", (props) => <input {...props} required autoComplete="name" maxLength={80}
          onChange={(event) => editor.changeField("name", event.target.value)} />)}
        {field("phone", "Số điện thoại", (props) => <input {...props} required type="tel" inputMode="numeric"
          autoComplete="tel-national" maxLength={10} placeholder="0xxxxxxxxx"
          onChange={(event) => editor.changeField("phone", event.target.value)} />)}
      </div>
      {editor.loadingFailed && <p className="checkout-error" role="alert">Chưa tải được địa danh.{" "}
        <button className="checkout-text-button" type="button" onClick={editor.retry}>Thử lại</button>
      </p>}
      <div className="checkout-fields">
        {select("province", "Tỉnh/Thành phố", provinces)}
        {select("ward", "Phường/Xã/Đặc khu", wards)}
      </div>
      {field("street", "Địa chỉ cụ thể", (props) => <input {...props} required autoComplete="street-address"
        maxLength={180} placeholder="Số nhà, tên đường hoặc thôn, tổ"
        onChange={(event) => editor.changeField("street", event.target.value)} />)}
      {addresses.length > 0 && !editor.alreadyDefault && <label className="checkout-address-default">
        <input type="checkbox" checked={editor.makeDefault} onChange={(event) => editor.setMakeDefault(event.target.checked)} />
        Đặt làm địa chỉ mặc định
      </label>}
      <fieldset className="checkout-address-types" aria-describedby={typeError ? "checkout-label-error" : undefined}>
        <legend>Loại địa chỉ</legend>
        <div>{Object.entries(addressTypes).map(([type, title], index) => <label key={type}>
          <input id={index === 0 ? "checkout-label" : undefined} type="radio" name="checkout-address-type" value={type}
            checked={fields.label === type} aria-invalid={!!typeError}
            onChange={() => editor.changeField("label", type)} />
          {title}
        </label>)}</div>
        {typeError && <span id="checkout-label-error" className="checkout-error">{typeError}</span>}
      </fieldset>
      <div className="checkout-address-actions">
        {(recipient || book) && <button className="checkout-text-button" type="button" onClick={editor.cancel}>Hủy</button>}
        <button type="button" className="button secondary" onClick={() => void editor.commit()}>{saving ? "Đang lưu…" : "Lưu địa chỉ"}</button>
      </div>
    </fieldset>}
    {editor.error && <p className="checkout-error" role="alert">{editor.error}</p>}
  </section>;
}
