import { ArrowRight, BarChart3, Monitor, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function AIMediaPlayerSection() {
  return (
    <section className="px-2 py-2 md:py-12">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-6 items-center">
        {/* Left side - Product showcase */}
        <div className="relative">
          <div className="relative bg-gradient-to-br from-[#5eead4] via-[#4ade80] to-[#5eead4] rounded-3xl p-4 lg:p-2 overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-300/20 to-transparent"></div>

            {/* Product images */}
            <div className="relative z-10">
              <Image
                src="/images/design-mode/xkreen-player(1).jpg"
                alt="AI Media Player Complete Setup"
                width={550}
                height={450}
                className="rounded-xl shadow-2xl w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Right side - Content */}
        <div className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl text-foreground text-balance font-semibold">
              AI Media Player
              <br />
              for Easy Start
            </h2>

            {/* Pricing badge */}
            <div className="inline-block">
              <div className="bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold">$756/year *</div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>AI-powered analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <span>Software</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                <span>Hardware</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-lg leading-relaxed">
              Place the XKREEN Fast Start Kit in your store (exit zone/checkout zone/etc.) and start seeing real data
              about your visitors immediately!
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              View more
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              Contact us
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-muted-foreground space-y-2">
            <p>* Let us know if you have your own equipment. You can purchase software subscription separately.</p>
            <p>
              Prices do not include shipping, customs duties, and taxes. For pricing information in your region, please
              contact your local representative.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
