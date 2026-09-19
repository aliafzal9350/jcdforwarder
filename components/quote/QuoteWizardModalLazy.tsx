"use client";

import dynamic from "next/dynamic";

// Renders nothing until the visitor opens it, so deferring its JS off the initial
// bundle costs no UI/CLS on any of the pages that mount it by default.
const QuoteWizardModal = dynamic(() => import("./QuoteWizardModal").then((mod) => mod.QuoteWizardModal), { ssr: false });

export { QuoteWizardModal };
