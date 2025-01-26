import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-row w-full h-screen justify-between px-20 bg-base-100">
      <div className="w-[360px] mt-28 pl-5">
        <h1 className="text-7xl font-semibold text-primary">
          Effortless invoicing in seconds
        </h1>
        <p className="font-extralight mt-8 text-base-content">
          Create and send professional invoices in minutes. Start invoicing today with our simple, intuitive platform.
        </p>
        <Link href="/dashboard">
          <button type="button" className="btn btn-primary ml-4 mt-10 rounded-md">
            Get Started
          </button>
        </Link>
      </div>
      <div className="w-1/2 mt-40">
        <Image 
          className="rounded-[120px] min-w-[600px]" 
          src="/undraw_printing_invoices_5r4r (1) (1).png" 
          alt="hero" 
          width={1000} 
          height={1000}
          priority 
        />
      </div>
    </div>
  );
}
