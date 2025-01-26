'use client';
import {
  UserGroupIcon,
  HomeIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Invoices',
    href: '/dashboard/invoices',
    icon: DocumentDuplicateIcon,
  },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex grow flex-row space-x-2 md:flex-col md:space-x-0 md:space-y-2">
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              "flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-base-300 p-3 text-sm font-medium hover:bg-base-100 hover:text-primary md:flex-none md:justify-start md:p-2 md:px-3",
              {
                'bg-base-100 text-primary': pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-6 text-base-content" />
            <p className="hidden md:block text-base-content">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}