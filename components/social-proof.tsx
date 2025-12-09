import Image from "next/image"

export function SocialProof() {
  return (
    <section className="self-stretch flex flex-col justify-center items-center overflow-hidden gap-6 py-14">
      <div className="text-center text-gray-300 font-medium leading-tight text-6xl">
        Trusted by forward-thinking brands, agencies, and retailers
      </div>
      <div className="self-stretch grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center my-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Image
            key={i}
            src={`/logos/logo0${i + 1}.svg`}
            alt={`Company Logo ${i + 1}`}
            width={400}
            height={120}
            className="w-full max-w-[400px] h-auto object-contain grayscale opacity-70"
          />
        ))}
      </div>
    </section>
  )
}
