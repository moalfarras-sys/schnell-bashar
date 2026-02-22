import dynamic from "next/dynamic";

export const LazyFaqChatbot = dynamic(
  () => import("@/components/faq-chatbot").then((m) => m.FaqChatbot),
  { ssr: false },
);

export const LazyExitIntentModal = dynamic(
  () => import("@/components/exit-intent-modal").then((m) => m.ExitIntentModal),
  { ssr: false },
);
