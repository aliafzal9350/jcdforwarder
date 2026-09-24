// Source: client comments and inquiries supplied by JCD (意向评论.txt).
// Reviews are quoted as written, with names shortened to first name + last initial.
// Inquiries came from private messages, so they appear only as anonymous examples of the
// shipments and questions JCD handles: no names, no timestamps, no "live activity" claims.
// Every card links to JCD's Alibaba store.

type Localized = { en: string; zh: string };

export type ActivityItem =
  | {
      kind: "review";
      reviewer: string;
      /** Verbatim review text. */
      quote?: string;
      /** For ratings left without text; not shown as a quotation. */
      summary?: Localized;
      stars?: number;
    }
  | {
      kind: "shipment" | "question";
      title: Localized;
      detail: Localized;
    };

export const ACTIVITY_FEED: ActivityItem[] = [
  {
    kind: "review",
    reviewer: "Gary L.",
    quote: "JCD have been excellent to deal with from start to finish.",
  },
  {
    kind: "shipment",
    title: { en: "40HQ full container · China → USA", zh: "40HQ 整柜 · 中国 → 美国" },
    detail: {
      en: "FCL booking, export customs and US door delivery.",
      zh: "整柜订舱、出口报关及美国送货上门。",
    },
  },
  {
    kind: "shipment",
    title: { en: "Amazon FBA delivery · China → USA", zh: "亚马逊 FBA 头程 · 中国 → 美国" },
    detail: {
      en: "Carton labelling, palletising and appointment booking at US FBA warehouses.",
      zh: "箱标、打托及美国 FBA 仓预约派送。",
    },
  },
  {
    kind: "review",
    reviewer: "Nav B.",
    quote:
      "The order was shipped with care and kept us informed about the order tracking all the way, Excellent service!",
  },
  {
    kind: "shipment",
    title: { en: "100 kg shipment · China → France", zh: "100 公斤货物 · 中国 → 法国" },
    detail: {
      en: "Air DDP with French customs clearance and VAT handled.",
      zh: "空运双清包税，含法国清关及增值税。",
    },
  },
  {
    kind: "question",
    title: { en: "Air or sea for your cargo?", zh: "空运还是海运？" },
    detail: {
      en: "Send us the weight and dimensions and we'll compare transit time and landed cost.",
      zh: "告诉我们重量和尺寸，我们为您对比时效与到门成本。",
    },
  },
  {
    kind: "review",
    reviewer: "Bousaidi N.",
    quote: "Great service. Thanks. An honest and experienced company.",
  },
  {
    kind: "shipment",
    title: { en: "Supplier pickup in Quanzhou · China → Italy", zh: "泉州工厂提货 · 中国 → 意大利" },
    detail: {
      en: "Factory collection in Fujian, export customs and door delivery in Italy.",
      zh: "福建工厂提货、出口报关及意大利送货上门。",
    },
  },
  {
    kind: "question",
    title: { en: "Buying from suppliers in China?", zh: "从中国供应商采购？" },
    detail: {
      en: "We collect from your suppliers and deliver to your door, duties included.",
      zh: "我们从供应商处提货，含税送货上门。",
    },
  },
  {
    kind: "review",
    reviewer: "Ali H.",
    summary: {
      en: "Rated JCD's shipping and delivery service 5 out of 5.",
      zh: "给 JCD 的运输与交付服务打出 5 分满分。",
    },
    stars: 5,
  },
  {
    kind: "shipment",
    title: { en: "Furniture from several suppliers", zh: "多家供应商的家具" },
    detail: {
      en: "Suppliers deliver to our Shenzhen warehouse; we consolidate and ship as one load.",
      zh: "供应商送货至我们深圳仓库，合并后统一发运。",
    },
  },
  {
    kind: "question",
    title: { en: "How are shipping fees calculated?", zh: "运费如何计算？" },
    detail: {
      en: "One all-in DDP rate by weight or volume: freight, customs, duties and delivery.",
      zh: "按重量或体积计一口价（DDP）：含运费、清关、关税及派送。",
    },
  },
];
