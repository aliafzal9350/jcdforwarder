"use client";

import dynamic from "next/dynamic";

// Renders nothing until the visitor opens it, so deferring its JS off the initial
// bundle costs no UI/CLS on any of the pages that mount it by default.
const SupportChatWidget = dynamic(() => import("./SupportChatWidget").then((mod) => mod.SupportChatWidget), { ssr: false });

export { SupportChatWidget };
