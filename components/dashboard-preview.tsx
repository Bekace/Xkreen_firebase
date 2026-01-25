export function DashboardPreview() {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-primary-light/50 rounded-2xl p-2 shadow-2xl text-white bg-teal-300 mx-7 overflow-hidden aspect-video">
        <video
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/home-hero-3-v0nGK8urQfYi21YBM9KWVd3bJikE0F.mp4"
          className="w-full h-full object-cover rounded-xl shadow-lg"
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    </div>
  )
}
