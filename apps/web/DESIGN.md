---
name: loopice-manifest-ledger
description: Loopice's design system, grounded in the actual paperwork of small/medium logistics operations -- manifests, waybills, ink stamps, dispatch ledgers -- rather than a generic dark dev-tool or SaaS-admin look. Built for a multi-tenant whitelabel product, so the tenant's own brand color is a first-class, dynamic layer on top of a static neutral system.

colors:
  background: "hsl(40 18% 96%)"   # manifest paper
  foreground: "hsl(150 8% 14%)"   # ledger ink
  muted: "hsl(40 14% 91%)"        # paper hover fill
  muted-foreground: "hsl(150 6% 40%)"
  card: "hsl(40 25% 99%)"         # label stock
  border: "hsl(40 12% 85%)"       # hairline
  destructive: "hsl(0 70% 45%)"

typography:
  display: "'Space Grotesk', system-ui, sans-serif"   # headers, nav, buttons
  body: "'IBM Plex Sans', system-ui, sans-serif"       # body copy
  mono: "'IBM Plex Mono', ui-monospace, monospace"     # every ID, timestamp, waybill number

radius:
  sm: 4px   # buttons, inputs, stamps
  md: 6px   # cards
  lg: 10px  # larger surfaces

signature:
  status-stamp: "Order/shipment status renders as a rotated, double-ringed ink stamp (mono, uppercase, semantic color per status) -- the one memorable device, used everywhere status appears: dashboard, tables, order detail, timeline."
---

## Why this system, not a generic one

Loopice is dispatch software for small/medium logistics companies -- the people using it spend their day around waybills, manifests, stamped paperwork, and a dispatch ledger. A near-black terminal aesthetic (Warp, Linear, most "AI-generated dark SaaS") borrows a *developer tool's* identity, not a *logistics operation's*. This system is built from the product's own material instead: warm manifest paper, ledger ink, and the ink stamp as the signature device.

This also deliberately avoids the three defaults AI-generated UI tends to converge on regardless of brief: warm-cream + serif + terracotta, near-black + single neon accent, and zero-radius broadsheet/hairline layouts. It shares *some* surface traits with each (light paper base, hairline dividers) but is differentiated by subject grounding (paperwork, not editorial or dev-tool metaphors), a non-zero considered radius scale, and the stamp signature device.

## Multi-tenancy and color

Two color systems coexist on purpose:

1. **Static neutral system** (background/foreground/card/border/muted) -- fixed, defined above, never changes per tenant.
2. **`--brand-primary` / `--brand-secondary`** (see `TenantBrandingContext`) -- dynamic, set per-tenant, drives CTAs, links, the active sidebar tick, and the login split-panel fill.

Order/shipment **status stays semantic, not tenant-colored** -- PENDING/CONFIRMED/IN_TRANSIT/DELIVERED/CANCELLED are facts about a shipment, not a place for whitelabel identity, so the status stamp's ink color is fixed regardless of tenant.

## Signature element: the status stamp

`apps/web/src/pages/orders/statusBadge.tsx` renders order status as a small rotated, double-ringed stamp -- `border-2 border-current` plus a `ring-1 ring-offset-2` to fake the double ring of a real ink stamp, uppercase IBM Plex Mono, a few degrees of rotation per status so they don't line up identically. Used consistently: orders table, order detail header, status history timeline, customer order list.

The same status-ink palette (`STATUS_INK`) is reused **flat, unrotated** for the interactive filter chips on the orders list -- rotation is reserved for "a mark that was already made" (a stamped fact), never for a live control, so a control never looks like a stamp and vice versa.

## Layout devices

- **Sidebar as ledger rail**: full-height, tenant brand mark at top (logo or initial-in-brand-color square), nav items marked active with a small brand-colored tick at the left edge rather than a filled pill -- quieter, more like a ledger index tab.
- **Dashboard as an asymmetric dispatch board**: one featured stat (active shipments, inverted foreground/background fill) sized larger than everything else, next to a ledger-row list of the remaining counts -- not a uniform grid of identical boxes. The featured number is the one thing a dispatcher actually needs first.
- **Order status timeline**: a real connected vertical timeline (dot + connecting line per entry) -- justified because the status history *is* a genuine chronological sequence, unlike nav items or dashboard stats, which are not sequences and don't get numbered markers.
- **Login as a split brand/form panel**: tenant brand fill with an abstract SVG route line (waypoints + destination pin) on one side, the sign-in form on manifest paper on the other -- not a generic centered card.

## Type usage

- **Space Grotesk** (display): page headers, nav labels, buttons, stat numbers.
- **IBM Plex Sans** (body): paragraph text, table cells, form labels.
- **IBM Plex Mono**: every waybill/order number, timestamp, phone number, role tag, and table header (uppercase, letter-spaced) -- data reads as ledger data, not prose.

## Restraint

No page-load animation, scroll-triggered reveals, or hover micro-interactions beyond standard color transitions -- this is an operations tool used all day, not a marketing page; motion would cost more attention than it earns. The one deliberate risk is the stamp rotation; everything else stays quiet on purpose.
