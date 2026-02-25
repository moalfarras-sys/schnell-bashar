"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQAccordionProps {
    items: FAQItem[];
    className?: string;
}

export function FAQAccordion({ items, className }: FAQAccordionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleItem = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className={cn("space-y-3", className)}>
            {items.map((item, index) => (
                <div
                    key={index}
                    className={cn(
                        "overflow-hidden rounded-xl border bg-[color:var(--surface-elevated)] shadow-sm transition-all duration-300 dark:bg-slate-900/80",
                        openIndex === index
                            ? "border-brand-200 shadow-md dark:border-brand-500/30"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    )}
                >
                    <button
                        onClick={() => toggleItem(index)}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors duration-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        aria-expanded={openIndex === index}
                    >
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {item.question}
                        </span>
                        <ChevronDown
                            className={cn(
                                "h-5 w-5 shrink-0 text-brand-600 transition-transform duration-300 dark:text-brand-400",
                                openIndex === index && "rotate-180"
                            )}
                        />
                    </button>

                    <div
                        className={cn(
                            "grid transition-all duration-300",
                            openIndex === index
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                        )}
                    >
                        <div className="overflow-hidden">
                            <div className="border-t border-slate-100 px-6 pb-5 pt-4 dark:border-slate-800">
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                    {item.answer}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

interface FAQSectionProps {
    title?: string;
    description?: string;
    items: FAQItem[];
    className?: string;
}

export function FAQSection({
    title = "Häufig gestellte Fragen",
    description = "Antworten auf die wichtigsten Fragen rund um Umzug und Entsorgung.",
    items,
    className,
}: FAQSectionProps) {
    return (
        <section className={cn("py-14 sm:py-16", className)}>
            <div className="container mx-auto px-4 sm:px-6">
                <div className="mx-auto max-w-3xl">
                    <div className="text-center">
                        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                            {title}
                        </h2>
                        {description && (
                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>

                    <div className="mt-10">
                        <FAQAccordion items={items} />
                    </div>
                </div>
            </div>
        </section>
    );
}

