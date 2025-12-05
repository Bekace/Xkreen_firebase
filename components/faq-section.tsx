"use client"

import type React from "react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqData = [
  {
  question: "What is Xkreen and who is it for?",
  answer:
    "Xkreen is an AI-powered digital signage platform designed for businesses, franchises, and organizations that want to engage audiences through smarter screen management. It’s perfect for small businesses starting with one screen, as well as large enterprises managing hundreds of displays.",
},
{
  question: "How does the AI-powered signage work?",
  answer:
    "Our AI analyzes your content and scheduling needs in real time, suggesting the best layouts, timing, and media combinations. It learns from your audience engagement patterns and adapts to your business goals, making digital signage more effective and consistent.",
},
{
  question: "Can I integrate Xkreen with my existing tools?",
  answer:
    "Yes! Xkreen offers integrations with popular tools including Google Drive, Dropbox, Canva, and Slack. You can easily upload content, sync media libraries, and manage screens directly from your existing workflow.",
},
{
  question: "What's included in the free plan?",
  answer:
    "The free plan includes screen pairing, basic templates, real-time content uploads, and management for a single display with platform watermarking. It’s the perfect way to get started with digital signage.",
},
{
  question: "How does multi-screen management work?",
  answer:
    "With our platform, you can manage multiple screens across different locations from one dashboard. Schedule campaigns, launch playlists, and update content instantly on all displays or target specific groups of screens.",
},
{
  question: "Is my data secure with Xkreen?",
  answer:
    "Absolutely. We use enterprise-grade security including end-to-end encryption, secure content delivery, and compliance with industry standards. Your data and media are protected, and we also offer custom hosting and on-premises options for enterprise customers.",
},
]

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

const FAQItem = ({ question, answer, isOpen, onToggle }: FAQItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onToggle()
  }
  return (
    <div
      className={`w-full bg-[rgba(231,236,235,0.08)] shadow-[0px_2px_4px_rgba(0,0,0,0.16)] overflow-hidden rounded-[10px] outline outline-1 outline-border outline-offset-[-1px] transition-all duration-500 ease-out cursor-pointer`}
      onClick={handleClick}
    >
      <div className="w-full px-5 py-[18px] pr-4 flex justify-between items-center gap-5 text-left transition-all duration-300 ease-out">
        <div className="flex-1 text-foreground text-base font-medium leading-6 break-words">{question}</div>
        <div className="flex justify-center items-center">
          <ChevronDown
            className={`w-6 h-6 text-muted-foreground-dark transition-all duration-500 ease-out ${isOpen ? "rotate-180 scale-110" : "rotate-0 scale-100"}`}
          />
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
        style={{
          transitionProperty: "max-height, opacity, padding",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          className={`px-5 transition-all duration-500 ease-out ${isOpen ? "pb-[18px] pt-2 translate-y-0" : "pb-0 pt-0 -translate-y-2"}`}
        >
          <div className="text-foreground/80 text-sm font-normal leading-6 break-words">{answer}</div>
        </div>
      </div>
    </div>
  )
}

export function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())
  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }
  return (
    <section className="w-full pt-[66px] pb-20 md:pb-40 px-5 relative flex flex-col justify-center items-center">
      <div className="w-[300px] h-[500px] absolute top-[150px] left-1/2 -translate-x-1/2 origin-top-left rotate-[-33.39deg] bg-primary/10 blur-[100px] z-0" />
      <div className="self-stretch pt-8 pb-8 md:pt-14 md:pb-14 flex flex-col justify-center items-center gap-2 relative z-10">
        <div className="flex flex-col justify-start items-center gap-4">
          <h2 className="w-full max-w-[435px] text-center text-foreground text-4xl font-semibold leading-10 break-words">
            Frequently Asked Questions
          </h2>
          <p className="self-stretch text-center text-muted-foreground text-sm font-medium leading-[18.20px] break-words">
            {"Discover how AI-powered digital signage helps agencies and brands optimize campaigns, boost revenue, and deliver smarter content."}
          </p>
        </div>
      </div>
      <div className="w-full max-w-[600px] pt-0.5 pb-10 flex flex-col justify-start items-start gap-4 relative z-10">
        {faqData.map((faq, index) => (
          <FAQItem key={index} {...faq} isOpen={openItems.has(index)} onToggle={() => toggleItem(index)} />
        ))}
      </div>
    </section>
  )
}
