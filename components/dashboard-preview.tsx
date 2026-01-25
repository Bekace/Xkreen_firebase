export function DashboardPreview() {
  return (
    <div className="w-[calc(100vw-32px)] md:w-[1400px]">
      <div className="bg-primary-light/50 rounded-2xl p-2 shadow-2xl text-white bg-teal-300 mx-7">
        <video
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/home-hero-3-v0nGK8urQfYi21YBM9KWVd3bJikE0F.mp4"
          width={1400}
          height={700}
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
