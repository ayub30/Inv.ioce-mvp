import Link from 'next/link';
import NavLinks from '@/app/ui/nav-links';
import { PowerIcon } from '@heroicons/react/24/outline';

export default function SideNav() {
  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2 bg-base-100">
      <Link
        className="mb-2 flex h-20 items-end justify-start rounded-md bg-primary p-4 md:h-40"
        href="/"
      >
        <div className="w-32 md:w-40">
          <h3 className="text-2xl font-medium bg-primary text-primary-content">
            Inv.ioce
          </h3>
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        <button className="flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md bg-base-300 p-3 text-sm font-medium hover:bg-base-100 hover:text-primary md:flex-none md:justify-start md:p-2 md:px-3">
          <PowerIcon className="w-6 text-base-content" />
          <div className="hidden md:block text-base-content">Sign Out</div>
        </button>
      </div>
    </div>
  );
}