import Image from "next/image"
import { ArrowUpRight } from "lucide-react"

export function IndustriesSection() {
  const industries = [
    {
      title: "Retail & Consumer Environments",
      description: "Built for modern retail spaces. Provides a full toolkit to boost sales impact and optimize in-store engagement with smart digital displays",
      image: "/consumer-electronics-store-technology.png",
    },
    {
      title: "Hospitality & Lifestyle",
      description: "Designed for hotels, resorts, and lifestyle brands. Delivers a unified solution to enhance guest communication and elevate onsite experiences",
      image: "/hotel-resort-hospitality-service.png",
    },
    {
      title: "Media Owners",
      description: "Created for today’s media networks. Offers complete support for managing, selling, and optimizing DOOH inventory across every channel",
      image: "/media-owner-advertising-billboard.png",
    },
    {
      title: "Transit & Mobility",
      description: "Made for transportation hubs and mobility operators. Enables dynamic content delivery and smarter ad monetization across high-traffic locations",
      image: "/restaurant-chef-kitchen-food-service.png",
    },
    {
      title: "Corporate & Institutional",
      description: "Tailored for offices, campuses, and public institutions. Centralizes messaging, improves communication, and streamlines display management",
      image: "/hotel-resort-hospitality-service.png",
    },
    {
      title: "Entertainment & Experience Venues",
      description: "Ideal for arenas, cinemas, and attraction spaces. Enhances visitor engagement and unlocks new revenue through immersive digital signage",
      image: "/food-retail-grocery-store-shopping.png",
    },
  ]

  return (
    <section className="py-16 px-6">
      <div className="text-center mb-12">
        <h2 className="text-4xl text-white mb-6 text-balance md:text-6xl font-semibold">
          AI-Powered Digital Signage
          <br />
          for Every Industry
        </h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto text-balance">
          From food retail to hospitality, Xkreen empowers businesses with AI-powered signage to connect with customers,
          optimize campaigns, and scale effortlessly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {industries.map((industry, index) => (
          <div
            key={index}
            className="relative group overflow-hidden rounded-2xl bg-gray-900 aspect-[4/3] cursor-pointer transition-transform duration-300 hover:scale-105"
          >
            <Image
              src={industry.image || "/placeholder.svg"}
              alt={industry.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            <div className="absolute top-4 right-4">
              <ArrowUpRight className="w-6 h-6 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-white text-xl font-semibold mb-2">{industry.title}</h3>
              <p className="text-gray-200 text-sm leading-relaxed">{industry.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
