import AiCodeReviews from "./bento/ai-code-reviews"
import RealtimeCodingPreviews from "./bento/real-time-previews"
import OneClickIntegrationsIllustration from "./bento/one-click-integrations-illustration"
import MCPConnectivityIllustration from "./bento/mcp-connectivity-illustration" // Updated import
import EasyDeployment from "./bento/easy-deployment"
import ParallelCodingAgents from "./bento/parallel-agents" // Updated import

const BentoCard = ({ title, description, Component }) => (
  <div className="overflow-hidden rounded-2xl border border-white/20 flex flex-col justify-start items-start relative">
    {/* Background with blur effect */}
    <div
      className="absolute inset-0 rounded-2xl"
      style={{
        background: "rgba(231, 236, 235, 0.08)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    />
    {/* Additional subtle gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />

    <div className="self-stretch p-6 flex flex-col justify-start items-start gap-2 relative z-10">
      <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
        <p className="self-stretch text-lg font-normal leading-7 text-teal-200">
          {title} <br />
          <span className="text-muted-foreground">{description}</span>
        </p>
      </div>
    </div>
    <div className="self-stretch h-72 relative -mt-0.5 z-10">
      <Component />
    </div>
  </div>
)

export function BentoSection() {
  const cards = [
    {
      title: "Real-Time Audience Analytics",
      description: "Leverage AI-driven computer vision to capture and process live audience demographics, dwell time, and engagement metrics, enabling instant optimization of displayed content.",
      Component: AiCodeReviews,
    },
    {
      title: "Hyper-Targeted Content Delivery",
      description: "Automated segmentation and predictive modeling ensure signage adapts dynamically to audience profiles, driving relevance, higher retention rates, and measurable ROI.",
      Component: RealtimeCodingPreviews,
    },
    {
      title: "Scalable Data Infrastructure",
      description: "Our cloud-native architecture securely aggregates multi-location analytics, giving agencies and brands centralized dashboards for actionable insights across networks.",
      Component: OneClickIntegrationsIllustration,
    },
    {
      title: "Computer Vision for Behavior Mapping",
      description: "Image recognition algorithms detect patterns in customer movement and attention flow, helping businesses refine layouts, campaign strategies, and ad placement precision.",
      Component: MCPConnectivityIllustration, // Updated component
    },
    {
      title: "Integration with Omnichannel Campaigns", // Swapped position
      description: "APIs connect signage analytics with CRM, retail apps, and marketing platforms, aligning physical audience data with digital campaigns for unified customer journeys.",
      Component: ParallelCodingAgents, // Updated component
    },
    {
      title: "Data-Driven Revenue Optimization", // Swapped position
      description: "AI-powered reporting uncovers top-performing content and monetizable screen placements, enabling agencies and retailers to maximize ad yield and operational efficiency.",
      Component: EasyDeployment,
    },
  ]

  return (
    <section className="w-full px-5 flex flex-col justify-center items-center overflow-visible bg-transparent">
      <div className="w-full py-8 relative flex flex-col justify-start items-start gap-6 md:py-0">
        <div className="w-[547px] h-[938px] absolute top-[614px] left-[80px] origin-top-left rotate-[-33.39deg] bg-primary/10 blur-[130px] z-0" />
        <div className="self-stretch py-8 flex flex-col justify-center items-center z-10 md:py-7 my-0 gap-1">
          <div className="flex flex-col justify-start items-center gap-4">
            <h2 className="w-full max-w-[655px] text-center text-foreground text-4xl font-semibold leading-tight md:leading-[66px] md:text-6xl">
              Understand engagement like never before
            </h2>
            <p className="w-full max-w-[600px] text-center text-muted-foreground text-lg md:text-xl font-medium leading-relaxed">
              Let AI optimize your digital signage by delivering the right content at the right time, providing real-time audience insights, and integrating seamlessly with your screens to maximize engagement and revenue.
            </p>
          </div>
        </div>
        <div className="self-stretch grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          {cards.map((card) => (
            <BentoCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  )
}
