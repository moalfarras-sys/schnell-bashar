"use client";

import { FaqChatbot } from "@/components/faq-chatbot";
import { MessageCircle } from "lucide-react";

export function FloatingWidgetContainer() {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <FaqChatbot embedded />
      <a
        href="https://wa.me/491729573681"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp öffnen"
        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:scale-95"
      >
        <MessageCircle className="h-5 w-5" />
        WhatsApp
      </a>
    </div>
  );
}

