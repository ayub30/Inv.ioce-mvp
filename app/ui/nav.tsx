import Image from "next/image"
import Link from "next/link"

export default function Nav() {
    return (
        <div className="flex flex-row justify-between py-4 px-16">
            <div className="flex flex-row">
                <Link href="/">
                    <Image src="/icon.svg" alt="Logo" width={40} height={40} />
                </Link>
                <h3 className="ml-2 mt-2 font-light text-md">Inv.ioce</h3>
            </div>
                <Link href="/login">
                    <h3 className="ml-4 mt-2 font-light text-md">Login</h3>
                </Link>
        </div>
    )    
}