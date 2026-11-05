"use client";

import { useRef, useState } from "react";
import {
  checkoutMoney as money, checkoutTotals, type CheckoutVoucher, type CheckoutVoucherLine,
} from "@/lib/checkout";
import { errorMessage, post } from "./order-flow";

export function CheckoutVouchers({ options, selected, change, lines }: {
  options: CheckoutVoucher[];
  selected?: CheckoutVoucher;
  change: (selection?: CheckoutVoucher) => void;
  lines: CheckoutVoucherLine[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [draft, setDraft] = useState<CheckoutVoucher>();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const preview = checkoutTotals(lines, 0, draft).discount;
  const { discount, reason: selectedIssue } = checkoutTotals(lines, 0, selected);
  const tickets = options.map((voucher) => ({ voucher, ...checkoutTotals(lines, 0, voucher) }))
    .sort((left, right) => right.discount - left.discount);

  function open() {
    setDraft(discount ? selected : undefined);
    setCode("");
    setError("");
    dialog.current?.showModal();
  }

  async function applyCode() {
    if (request.current) return;
    if (!code.trim()) {
      setError("Nhập mã giảm giá.");
      return;
    }
    const check = new AbortController();
    request.current = check;
    setChecking(true);
    setError("");
    try {
      const voucher = await post<CheckoutVoucher>("checkout-voucher", { code }, check.signal);
      if (check.signal.aborted) return;
      const { reason } = checkoutTotals(lines, 0, voucher);
      if (reason) {
        setError(reason);
      } else {
        setDraft(voucher);
        setCode("");
      }
    } catch (failure) {
      if (!check.signal.aborted) setError(errorMessage(failure));
    } finally {
      if (request.current === check) {
        request.current = null;
        setChecking(false);
      }
    }
  }

  function confirm() {
    change(preview ? draft : undefined);
    dialog.current?.close();
  }

  return <section className="checkout-card" aria-labelledby="checkout-voucher-title">
    <div className="checkout-card-heading">
      <h2 id="checkout-voucher-title">Voucher HandiGo</h2>
      <button type="button" className="checkout-text-button" aria-haspopup="dialog" onClick={open}>
        {discount ? "Đổi voucher" : "Chọn voucher"}
      </button>
    </div>
    {discount ? <p className="checkout-discount">Đã áp dụng {selected?.code} · Tiết kiệm {money(discount)}</p> :
      <p className="checkout-muted">Chọn ưu đãi giảm giá cho đơn hàng.</p>}
    {selectedIssue && <p className="checkout-muted">{selectedIssue}</p>}
    <dialog ref={dialog} className="checkout-voucher-dialog" aria-labelledby="checkout-voucher-dialog-title" onClose={() => {
      request.current?.abort();
      request.current = null;
      setChecking(false);
    }}>
      <div className="checkout-voucher-sheet">
        <header className="checkout-voucher-header">
          <h3 id="checkout-voucher-dialog-title">Chọn voucher HandiGo</h3>
          <button type="button" className="checkout-text-button" aria-label="Đóng bảng voucher" onClick={() => dialog.current?.close()}>Đóng</button>
        </header>
        <div className="checkout-voucher-body">
          <label className="checkout-voucher-code-label" htmlFor="checkout-voucher">Thêm mã voucher</label>
          <div className="checkout-voucher">
            <input id="checkout-voucher" maxLength={40} autoComplete="off" placeholder="Nhập mã voucher" value={code}
              aria-invalid={!!error} aria-describedby={error ? "checkout-voucher-error" : undefined}
              disabled={checking} onChange={(event) => { setCode(event.target.value); setError(""); }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void applyCode();
              }} />
            <button className="button secondary" type="button" disabled={checking} onClick={applyCode}>
              {checking ? "Đang kiểm tra…" : "Áp dụng mã"}
            </button>
          </div>
          {error && <p id="checkout-voucher-error" className="checkout-error" role="alert">{error}</p>}
          {!!options.length && <fieldset className="checkout-voucher-group">
              <legend>Ưu đãi đơn hàng</legend>
              <div className="checkout-voucher-caption">
                <span>Chọn tối đa 1 voucher</span>
                {draft && <button type="button" className="checkout-text-button" onClick={() => setDraft(undefined)}>Bỏ chọn</button>}
              </div>
              {tickets.map(({ voucher, reason }) => {
                return <label className="checkout-voucher-ticket" key={voucher.code} data-disabled={!!reason}>
                  <span className="checkout-voucher-tag"><b>GIẢM GIÁ</b><small>HandiGo</small></span>
                  <span className="checkout-voucher-info">
                    <strong>Giảm {money(voucher.amount)}</strong>
                    <span>{voucher.code} · {voucher.productSkus ? "Theo sản phẩm" :
                      voucher.minimum ? "Đơn từ " + money(voucher.minimum) : "Mọi đơn hàng"}</span>
                    {voucher.productSkus && <span>Áp dụng cho {voucher.productSkus.join(", ")}</span>}
                    {reason && <small>{reason}</small>}
                  </span>
                  <input type="radio" name="checkout-order-voucher" disabled={!!reason}
                    checked={draft?.code === voucher.code && !reason} onChange={() => setDraft(voucher)} />
                </label>;
              })}
            </fieldset>}
        </div>
        <footer className="checkout-voucher-footer">
          <p aria-live="polite">{preview ? "1 voucher đã chọn" : "Chưa chọn voucher"}
            <strong>Tiết kiệm {money(preview)}</strong></p>
          <button className="button secondary" type="button" onClick={() => dialog.current?.close()}>Hủy</button>
          <button className="button" type="button" disabled={checking} onClick={confirm}>Xác nhận</button>
        </footer>
      </div>
    </dialog>
  </section>;
}
