"use client";

import dynamic from "next/dynamic";

// Nothing is shown until 7-9s after load, so keep its JS out of the initial bundle.
const ActivityToast = dynamic(() => import("./ActivityToast").then((mod) => mod.ActivityToast), { ssr: false });

export { ActivityToast };
