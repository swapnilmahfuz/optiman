# Phase 03.5C — synthetic configurator rules

All values below are invented demonstration fixtures, not Optiman prices, medical eligibility, prescriptions or production policy. They are visible in the UI as synthetic. The four EterNeeds screenshots were not accessible in this chat; implementation follows the owner's written functional specification, with original Optiman styling.

## Stages and validation
- Frame Only is the default and bypasses all prescription controls. With Power / Lens opens Type → Details (powered types only) → Lens selection.
- Types: Zero Power; Unifocal / Distance Power; Bifocal / Near Power.
- Zero Power collects no SPH/CYL/Axis/ADD/IPD or file and allows only the explicit zero-power demo matrix.
- Unifocal: separate right/left SPH signs (+/−) and magnitudes, optional CYL signs/magnitudes, optional Axis. Both SPH values required for manual entry. Blank CYL means not supplied; Axis with blank/zero CYL is rejected. Axis is optional even with nonzero CYL, and when supplied must be an integer 0–180.
- Bifocal: required Moon Shape or Flat Top shape; right/left SPH signs/magnitudes and positive ADD values. Both SPH and ADD values required for manual entry. CYL/Axis are absent.
- Synthetic form bounds: SPH magnitude 0–12; CYL magnitude 0–6; powers in 0.25 increments. ADD +0.25–+4.00 in 0.25 steps. Optional binocular IPD 40–80 mm in 0.5 mm increments. These are UI test boundaries, not clinical limits.
- If all manual powers are blank and a demo filename is selected, upload-only continuation is allowed for consultation only. Partially filled manual powers still require completion. A filename never verifies or supplies powers. Bifocal shape remains required.
- Do not enter real medical data. No diagnosis, AI interpretation, prescription validity claim or fabrication authorization is provided.

## Explicit pair-price matrix
Existing six rule semantics and illustrative prices are retained; eligibility is an additional synthetic fixture:

| ID | Category / option | Type | Pair price | Synthetic eligibility |
| --- | --- | --- | --- | --- |
| 0 | Single vision / Clear anti-reflective | FIXED_PRICE | BDT 1,200 | Zero or Unifocal; abs SPH ≤4, abs CYL ≤2 |
| 1 | Blue-cut / Blue-cut coating | FIXED_PRICE | BDT 1,600 | Zero or Unifocal; abs SPH ≤4, abs CYL ≤2 |
| 2 | Photochromic / Light-adaptive | FIXED_PRICE | BDT 2,200 | Zero or Unifocal; abs SPH ≤2, abs CYL ≤1 |
| 3 | Progressive / bifocal / Individual fitting | CONSULT_WHATSAPP | No automatic price | Powered types; no clinical fitting implied |
| 4 | Custom / Owner consultation | CONSULT_WHATSAPP | No automatic price | All types, including filename-only |
| 5 | Single vision / Ultra-thin example | UNAVAILABLE | No price | Unavailable for every type; no consultation fallback |
| 6 | Bifocal demo / Moon standard pair | FIXED_PRICE | BDT 1,800 | Bifocal + Moon Shape; abs SPH ≤3 and ADD ≤2.5, complete manual entry |

For this fixture only, blank CYL contributes zero to the numeric range comparison; summaries retain “not supplied”, and this is not clinical interpretation.

A combination outside the fixed rule's test range is explicitly unavailable, never silently repriced. Customers may separately select an existing consultation rule. Flat Top has consultation only. Filename-only powered inputs have consultation only. Inapplicable rule options stay visible with a reason and are disabled. No rule is selected initially, and changing prescription details clears the selected lens. Consultation and unavailable selections cannot be added/saved into the ordinary bag.

## Files, state and cart
- File picker accepts JPG/PNG/WebP demonstration images up to 5 MiB. Only the filename is retained temporarily in browser memory. No file content is read, preview URL created, file object retained, upload made, storage written, or prescription interpreted. Replacement/removal updates that filename. Reload clears everything.
- Cart keeps a deep-copied configuration, prescription type, synthetic values, shape/IPD, demo filename, selected explicit rule snapshot, frame/lens pair prices, color, quantity. New configurations are always separate lines.
- Editing clones a line. Save replaces only that line after validation; Cancel discards the draft. Quantity persists and recalculates totals. Changing prescription or type invalidates lens selection.
- Quantity is 1–99 demo pairs; total = quantity × (frame + explicit lens price per pair). No delivery amount, tax, discount, advance split or refund fee is invented.
- WhatsApp is an internal message preview only. No configured number, automatic quote, external transmission or sensitive measurements/filename in its message.
- Checkout shows each configuration and separate frame/lens sums, but submits nothing. Authorized staff review and customer acceptance of changed quotations remain required before real production.

## Verification and rollback
Test every type, optional fields, sign/value consistency, 0/180 Axis boundaries, synthetic ranges, filename selection/replacement/removal, eligibility, explicit prices, quantities, independent cart configurations, edit preload/save/cancel, all simulated checkout outcomes and mobile/keyboard behavior at five widths. Revert this phase's commit to roll back; no database or persistent data exists.
